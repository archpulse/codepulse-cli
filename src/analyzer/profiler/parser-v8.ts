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

	// Build a set of child IDs to compute total vs self later
	const childIds = new Set<number>();
	for (const node of nodes) {
		for (const childId of node.children ?? []) {
			childIds.add(childId);
		}
	}

	for (const node of nodes) {
		const cf = node.callFrame;
		if (!cf || !cf.functionName) continue;

		// Skip V8 internals and GC
		const name = cf.functionName;
		if (
			name === "(idle)" ||
			name === "(program)" ||
			name === "(garbage collector)" ||
			name === ""
		) {
			continue;
		}

		const hitCount = node.hitCount ?? 0;
		const selfTime = hitCount * samplingInterval;

		// Normalize URL/path
		let filePath: string | undefined;
		let fileName: string | undefined;

		if (cf.url) {
			let url = cf.url as string;
			// Strip file:// protocol
			if (url.startsWith("file://")) {
				url = url.slice(7);
			}
			// Try to make it relative to project
			if (projectDir) {
				try {
					const relative = path.relative(projectDir, url);
					if (!relative.startsWith("..")) {
						filePath = relative.replace(/\\/g, "/");
					}
				} catch {
					// Keep as-is
				}
			}
			fileName = path.basename(url);
		}

		entries.push({
			functionName: name,
			filePath,
			fileName,
			lineNumber: cf.lineNumber !== undefined ? cf.lineNumber + 1 : undefined, // V8 uses 0-based
			selfTime,
			totalTime: selfTime, // Approximation; real totalTime requires tree walk
		});
	}

	// Aggregate entries by function identity (same name + same file + same line)
	return aggregateEntries(entries);
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
