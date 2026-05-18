import * as fs from "node:fs";
import * as path from "node:path";
import { compressString, decompressBuffer } from "../zlib";
import type {
	CommitSnapshot,
	SerializedFileNode,
	TimeMachineCache,
} from "../../types/time-machine";

const CACHE_VERSION = 1;
const CACHE_DIR = ".codepulse-cache";
const CACHE_FILE = "timemachine-ast.json.gz";
const SNAPSHOTS_DIR = "snapshots";

/**
 * Returns the cache directory path for the given project.
 */
export function getCacheDir(projectDir: string): string {
	return path.join(projectDir, CACHE_DIR);
}

/**
 * Loads the AST cache from disk. Returns an empty cache if none exists.
 */
export async function loadCache(projectDir: string): Promise<TimeMachineCache> {
	const cachePath = path.join(getCacheDir(projectDir), CACHE_FILE);

	if (!fs.existsSync(cachePath)) {
		return { version: CACHE_VERSION, astByHash: {} };
	}

	try {
		const compressed = fs.readFileSync(cachePath);
		const json = await decompressBuffer(compressed);
		const data = JSON.parse(json);

		if (data.version !== CACHE_VERSION) {
			return { version: CACHE_VERSION, astByHash: {} };
		}

		return data as TimeMachineCache;
	} catch {
		return { version: CACHE_VERSION, astByHash: {} };
	}
}

/**
 * Persists the AST cache to disk with gzip compression.
 */
export async function saveCache(
	projectDir: string,
	cache: TimeMachineCache,
): Promise<void> {
	const cacheDir = getCacheDir(projectDir);
	fs.mkdirSync(cacheDir, { recursive: true });

	const cachePath = path.join(cacheDir, CACHE_FILE);
	const json = JSON.stringify(cache);
	const compressed = await compressString(json);
	fs.writeFileSync(cachePath, compressed);
}

/**
 * Saves a single commit snapshot to disk.
 */
export function saveSnapshot(
	projectDir: string,
	snapshot: CommitSnapshot,
): void {
	const snapshotsDir = path.join(getCacheDir(projectDir), SNAPSHOTS_DIR);
	fs.mkdirSync(snapshotsDir, { recursive: true });

	const filePath = path.join(snapshotsDir, `${snapshot.sha.slice(0, 8)}.json`);
	fs.writeFileSync(filePath, JSON.stringify(snapshot));
}

/**
 * Loads all saved snapshots from disk, sorted by date.
 */
export function loadSnapshots(projectDir: string): CommitSnapshot[] {
	const snapshotsDir = path.join(getCacheDir(projectDir), SNAPSHOTS_DIR);

	if (!fs.existsSync(snapshotsDir)) return [];

	try {
		const files = fs
			.readdirSync(snapshotsDir)
			.filter((f) => f.endsWith(".json"));
		const snapshots: CommitSnapshot[] = [];

		for (const file of files) {
			const content = fs.readFileSync(path.join(snapshotsDir, file), "utf-8");
			snapshots.push(JSON.parse(content));
		}

		return snapshots.sort(
			(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
		);
	} catch {
		return [];
	}
}

/**
 * Looks up a cached AST by content hash.
 */
export function getCachedAST(
	cache: TimeMachineCache,
	hash: string,
): SerializedFileNode | null {
	return cache.astByHash[hash] ?? null;
}

/**
 * Stores a parsed AST in the cache by content hash.
 */
export function setCachedAST(
	cache: TimeMachineCache,
	hash: string,
	node: SerializedFileNode,
): void {
	cache.astByHash[hash] = node;
}
