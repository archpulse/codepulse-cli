import { createHash } from "node:crypto";
import * as path from "node:path";
import type {
	CommitSnapshot,
	DependencyEdge,
	FileNode,
	GraphNode,
	SamplingStrategy,
	SerializedFileNode,
	TimeMachineCache,
	TimeMachineResult,
} from "../../types/index";
import { analyzeFile } from "../ast";
import { buildGraph } from "../graph";
import {
	getCachedAST,
	loadCache,
	saveCache,
	saveSnapshot,
	setCachedAST,
} from "./cache";
import {
	getCommitDiff,
	getCommitList,
	getFileAtCommit,
	getFilesAtCommit,
} from "./git-diff";
import { sampleCommits } from "./sampling";

const SUPPORTED_EXTENSIONS = new Set([
	".ts", ".tsx", ".js", ".jsx", ".py",
	".java", ".cpp", ".c", ".cs", ".lua",
]);

export interface TimeMachineOptions {
	/** Project root directory */
	dir: string;
	/** Sampling strategy for selecting commits */
	strategy: SamplingStrategy;
	/** Only analyze commits after this date (ISO string) */
	since?: string;
	/** Progress callback: (current, total, sha) */
	onProgress?: (current: number, total: number, sha: string) => void;
}

/**
 * Core incremental engine for the Time Machine feature.
 *
 * Reconstructs the dependency graph at sampled commit points
 * using diff-driven invalidation and content-hash AST caching.
 */
export async function runTimeMachine(
	options: TimeMachineOptions,
): Promise<TimeMachineResult> {
	const { dir, strategy, since, onProgress } = options;

	// Phase 1: Collect and sample commits
	const allCommits = getCommitList(dir, since);
	if (allCommits.length === 0) {
		return {
			snapshots: [],
			totalCommitsScanned: 0,
			totalParseOperations: 0,
			cacheHits: 0,
		};
	}

	const sampled = sampleCommits(allCommits, strategy);
	if (sampled.length === 0) {
		return {
			snapshots: [],
			totalCommitsScanned: allCommits.length,
			totalParseOperations: 0,
			cacheHits: 0,
		};
	}

	// Load persistent cache
	const cache = await loadCache(dir);
	let totalParses = 0;
	let cacheHits = 0;

	const snapshots: CommitSnapshot[] = [];

	// Phase 2: Process each sampled commit incrementally
	let prevFileHashes = new Map<string, string>();

	for (let i = 0; i < sampled.length; i++) {
		const commit = sampled[i];
		onProgress?.(i + 1, sampled.length, commit.sha);

		let currentFileHashes: Map<string, string>;

		if (i === 0) {
			// Bootstrap: enumerate all files at the first commit
			const result = bootstrapCommit(dir, commit.sha, cache);
			currentFileHashes = result.fileHashes;
			totalParses += result.parseCount;
			cacheHits += result.cacheHitCount;
		} else {
			// Incremental: apply diff from previous commit
			const result = incrementalCommit(
				dir,
				sampled[i - 1].sha,
				commit.sha,
				prevFileHashes,
				cache,
			);
			currentFileHashes = result.fileHashes;
			totalParses += result.parseCount;
			cacheHits += result.cacheHitCount;
		}

		// Phase 3: Build graph from current file set
		const snapshot = buildSnapshotFromHashes(
			currentFileHashes,
			cache,
			commit,
			dir,
		);

		snapshots.push(snapshot);
		saveSnapshot(dir, snapshot);

		prevFileHashes = currentFileHashes;
	}

	// Save updated cache
	await saveCache(dir, cache);

	return {
		snapshots,
		totalCommitsScanned: allCommits.length,
		totalParseOperations: totalParses,
		cacheHits,
	};
}

// ─── Internal helpers ────────────────────────────────────────────────

interface ProcessResult {
	fileHashes: Map<string, string>;
	parseCount: number;
	cacheHitCount: number;
}

/**
 * Bootstraps the first commit by listing all files and parsing/caching them.
 */
function bootstrapCommit(
	dir: string,
	sha: string,
	cache: TimeMachineCache,
): ProcessResult {
	const files = getFilesAtCommit(dir, sha);
	const fileHashes = new Map<string, string>();
	let parseCount = 0;
	let cacheHitCount = 0;

	for (const filePath of files) {
		if (!isSupportedFile(filePath)) continue;

		const content = getFileAtCommit(dir, sha, filePath);
		if (!content) continue;

		const hash = contentHash(content);
		fileHashes.set(filePath, hash);

		if (getCachedAST(cache, hash)) {
			cacheHitCount++;
		} else {
			const node = parseAndCache(filePath, dir, content, hash, cache);
			if (node) parseCount++;
		}
	}

	return { fileHashes, parseCount, cacheHitCount };
}

/**
 * Processes a commit incrementally by applying the diff from the previous commit.
 */
function incrementalCommit(
	dir: string,
	prevSha: string,
	curSha: string,
	prevFileHashes: Map<string, string>,
	cache: TimeMachineCache,
): ProcessResult {
	const currentFileHashes = new Map(prevFileHashes);
	const diff = getCommitDiff(dir, prevSha, curSha);
	let parseCount = 0;
	let cacheHitCount = 0;

	for (const entry of diff) {
		switch (entry.status) {
			case "D":
				currentFileHashes.delete(entry.newPath);
				break;

			case "A":
			case "M": {
				if (!isSupportedFile(entry.newPath)) break;
				const content = getFileAtCommit(dir, curSha, entry.newPath);
				if (!content) break;

				const hash = contentHash(content);
				currentFileHashes.set(entry.newPath, hash);

				if (getCachedAST(cache, hash)) {
					cacheHitCount++;
				} else {
					const node = parseAndCache(entry.newPath, dir, content, hash, cache);
					if (node) parseCount++;
				}
				break;
			}

			case "R": {
				// Remove old path entry
				if (entry.oldPath) {
					currentFileHashes.delete(entry.oldPath);
				}
				// Process new path (may be identical content = cache hit)
				if (!isSupportedFile(entry.newPath)) break;
				const content = getFileAtCommit(dir, curSha, entry.newPath);
				if (!content) break;

				const hash = contentHash(content);
				currentFileHashes.set(entry.newPath, hash);

				if (getCachedAST(cache, hash)) {
					cacheHitCount++;
				} else {
					const node = parseAndCache(entry.newPath, dir, content, hash, cache);
					if (node) parseCount++;
				}
				break;
			}
		}
	}

	return { fileHashes: currentFileHashes, parseCount, cacheHitCount };
}

/**
 * Builds a CommitSnapshot from file hashes using cached AST data.
 */
function buildSnapshotFromHashes(
	fileHashes: Map<string, string>,
	cache: TimeMachineCache,
	commit: { sha: string; date: string; author: string; message: string },
	dir: string,
): CommitSnapshot {
	const fileNodes: FileNode[] = [];

	for (const [filePath, hash] of fileHashes) {
		const cached = getCachedAST(cache, hash);
		if (!cached) continue;

		// Reconstruct a minimal FileNode for graph building
		fileNodes.push({
			path: path.resolve(dir, filePath),
			relativePath: filePath,
			content: "", // Not needed for graph building
			imports: cached.imports,
			exports: cached.exports,
			functions: cached.functions,
			lines: cached.lines,
			complexity: cached.complexity,
			isGodFile: false,
		});
	}

	const { edges, graph } = buildGraph(fileNodes, dir);

	const nodes = [...graph.values()];
	const totalLines = fileNodes.reduce((sum, f) => sum + f.lines, 0);
	const avgComplexity = fileNodes.length
		? fileNodes.reduce((sum, f) => sum + f.complexity, 0) / fileNodes.length
		: 0;

	return {
		sha: commit.sha,
		date: commit.date,
		author: commit.author,
		message: commit.message,
		fileHashes: Object.fromEntries(fileHashes),
		graph: {
			nodes,
			edges,
		},
		stats: {
			files: fileNodes.length,
			totalLines,
			avgComplexity: Math.round(avgComplexity * 10) / 10,
		},
	};
}

/**
 * Parses a file from content and stores the result in the cache.
 */
function parseAndCache(
	filePath: string,
	dir: string,
	content: string,
	hash: string,
	cache: TimeMachineCache,
): SerializedFileNode | null {
	const fullPath = path.resolve(dir, filePath);
	const node = analyzeFile(fullPath, dir, content);
	if (!node) return null;

	const serialized: SerializedFileNode = {
		relativePath: node.relativePath,
		imports: node.imports,
		exports: node.exports,
		functions: node.functions,
		lines: node.lines,
		complexity: node.complexity,
	};

	setCachedAST(cache, hash, serialized);
	return serialized;
}

function contentHash(content: string): string {
	return createHash("sha256").update(content).digest("hex");
}

function isSupportedFile(filePath: string): boolean {
	const ext = path.extname(filePath).toLowerCase();
	return SUPPORTED_EXTENSIONS.has(ext);
}
