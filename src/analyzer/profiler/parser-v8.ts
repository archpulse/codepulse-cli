import * as fs from "node:fs";
import * as path from "node:path";
import type { ProfileEntry } from "../../types/index";

/**
 * Parses a V8 .cpuprofile (Chrome DevTools / Node.js) file into
 * normalized ProfileEntry objects.
 *
 * The .cpuprofile format is JSON with a `nodes` array where each node has:
 * - callFrame: { functionName, scriptId, url, lineNumber, columnNumber }
 * - hitCount: number
 * - children: number[] (node IDs)
 *
 * We compute selfTime from hitCount × samplingInterval.
 */
export function parseV8Profile(
	profilePath: string,
	projectDir?: string,
): ProfileEntry[] {
	const content = fs.readFileSync(profilePath, "utf-8");
	const profile = JSON.parse(content);

	const entries: ProfileEntry[] = [];
	const nodes: any[] = profile.nodes ?? [];
	const samplingInterval = (profile.samplingInterval ?? 1000) / 1000; // µs → ms

	for (const node of nodes) {
		const entry = processNode(node, samplingInterval, projectDir);
		if (entry) {
			entries.push(entry);
		}
	}

	return aggregateEntries(entries);
}

function shouldSkipFunction(name: string): boolean {
	return (
		!name ||
		name === "(idle)" ||
		name === "(program)" ||
		name === "(garbage collector)" ||
		name === ""
	);
}

function normalizeFilePath(
	url: string | undefined,
	projectDir?: string,
): { filePath?: string; fileName?: string } {
	if (!url) return {};

	let processedUrl = url;
	if (processedUrl.startsWith("file://")) {
		processedUrl = processedUrl.slice(7);
	}

	let filePath: string | undefined;
	if (projectDir) {
		try {
			const relative = path.relative(projectDir, processedUrl);
			if (!relative.startsWith("..")) {
				filePath = relative.replace(/\\/g, "/");
			}
		} catch {
			// Keep as-is
		}
	}

	return {
		filePath,
		fileName: path.basename(processedUrl),
	};
}

function processNode(
	node: any,
	samplingInterval: number,
	projectDir?: string,
): ProfileEntry | null {
	const cf = node.callFrame;
	if (!cf?.functionName) return null;

	if (shouldSkipFunction(cf.functionName)) {
		return null;
	}

	const hitCount = node.hitCount ?? 0;
	const selfTime = hitCount * samplingInterval;
	const { filePath, fileName } = normalizeFilePath(cf.url, projectDir);

	return {
		functionName: cf.functionName,
		filePath,
		fileName,
		lineNumber: cf.lineNumber !== undefined ? cf.lineNumber + 1 : undefined,
		selfTime,
		totalTime: selfTime,
	};
}

/**
 * Aggregates profile entries with the same identity.
 */
function aggregateEntries(entries: ProfileEntry[]): ProfileEntry[] {
	const map = new Map<string, ProfileEntry>();

	for (const entry of entries) {
		const key = `${entry.filePath ?? ""}::${entry.functionName}::${entry.lineNumber ?? ""}`;
		const existing = map.get(key);
		if (existing) {
			existing.selfTime += entry.selfTime;
			existing.totalTime += entry.totalTime;
		} else {
			map.set(key, { ...entry });
		}
	}

	return [...map.values()].sort((a, b) => b.selfTime - a.selfTime);
}
