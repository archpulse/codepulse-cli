import * as fs from "node:fs";
import * as path from "node:path";
import type { AnalysisCache, FileNode } from "../types/analysis";
import { compressString, decompressBuffer } from "./zlib";

const CACHE_VERSION = 1;
const CACHE_DIR = ".codepulse-cache";
const CACHE_FILE = "analysis-cache.json.gz";

interface PersistedFileNode {
	relativePath: string;
	imports: string[];
	exports: string[];
	functions: FileNode["functions"];
	lines: number;
	complexity: number;
	isGodFile: boolean;
	churn?: number;
	mtime?: number;
	size?: number;
}

interface PersistedAnalysisCache {
	version: number;
	fileNodes: Record<string, PersistedFileNode>;
	gitChurn?: Record<string, number>;
	lastScanTime?: number;
}

export function getAnalysisCacheDir(projectDir: string): string {
	return path.join(projectDir, CACHE_DIR);
}

export async function loadAnalysisCache(projectDir: string): Promise<AnalysisCache> {
	const cachePath = path.join(getAnalysisCacheDir(projectDir), CACHE_FILE);
	if (!fs.existsSync(cachePath)) {
		return {
			fileNodes: new Map<string, FileNode>(),
		};
	}

	try {
		const compressed = fs.readFileSync(cachePath);
		const json = await decompressBuffer(compressed);
		const data = JSON.parse(json) as PersistedAnalysisCache;

		if (data.version !== CACHE_VERSION) {
			return {
				fileNodes: new Map<string, FileNode>(),
			};
		}

		return deserializeCache(data);
	} catch {
		return {
			fileNodes: new Map<string, FileNode>(),
		};
	}
}

export async function saveAnalysisCache(
	projectDir: string,
	cache: AnalysisCache,
): Promise<void> {
	const cacheDir = getAnalysisCacheDir(projectDir);
	fs.mkdirSync(cacheDir, { recursive: true });

	const cachePath = path.join(cacheDir, CACHE_FILE);
	const payload = serializeCache(cache);
	const compressed = await compressString(JSON.stringify(payload));
	fs.writeFileSync(cachePath, compressed);
}

export function pruneAnalysisCache(cache: AnalysisCache, filePaths: string[]): void {
	const active = new Set(filePaths);
	for (const filePath of cache.fileNodes.keys()) {
		if (!active.has(filePath)) {
			cache.fileNodes.delete(filePath);
		}
	}
}

function serializeCache(cache: AnalysisCache): PersistedAnalysisCache {
	const fileNodes: Record<string, PersistedFileNode> = {};
	for (const [filePath, node] of cache.fileNodes) {
		fileNodes[filePath] = {
			relativePath: node.relativePath,
			imports: node.imports,
			exports: node.exports,
			functions: node.functions,
			lines: node.lines,
			complexity: node.complexity,
			isGodFile: node.isGodFile,
			churn: node.churn,
			mtime: node.mtime,
			size: node.size,
		};
	}

	const gitChurn = cache.gitChurn
		? Object.fromEntries(cache.gitChurn.entries())
		: undefined;

	return {
		version: CACHE_VERSION,
		fileNodes,
		gitChurn,
		lastScanTime: cache.lastScanTime,
	};
}

function deserializeCache(data: PersistedAnalysisCache): AnalysisCache {
	const fileNodes = new Map<string, FileNode>();
	for (const [filePath, node] of Object.entries(data.fileNodes || {})) {
		fileNodes.set(filePath, {
			path: filePath,
			relativePath: node.relativePath,
			content: "",
			imports: node.imports,
			exports: node.exports,
			functions: node.functions,
			lines: node.lines,
			complexity: node.complexity,
			isGodFile: node.isGodFile,
			churn: node.churn,
			mtime: node.mtime,
			size: node.size,
		});
	}

	return {
		fileNodes,
		gitChurn: data.gitChurn
			? new Map<string, number>(
					Object.entries(data.gitChurn).map(([key, value]) => [
						key,
						Number(value),
					]),
				)
			: undefined,
		lastScanTime: data.lastScanTime,
	};
}

