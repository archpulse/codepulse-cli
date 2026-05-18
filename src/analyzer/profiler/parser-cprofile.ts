import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { ProfileEntry } from "../../types/profiler";

/**
 * Parses Python cProfile/pstats output into normalized ProfileEntry objects.
 *
 * Supports two formats:
 * 1. Text output from `python -m cProfile script.py` (printed stats)
 * 2. Binary .prof files (converted via pstats to text first)
 *
 * cProfile text format per line:
 *   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
 */
export function parseCProfile(
	profilePath: string,
	projectDir?: string,
): ProfileEntry[] {
	let textContent: string;

	if (profilePath.endsWith(".prof") || profilePath.endsWith(".pstats")) {
		// Binary format: convert via Python pstats module
		textContent = convertBinaryProfile(profilePath);
	} else {
		textContent = fs.readFileSync(profilePath, "utf-8");
	}

	return parseProfileText(textContent, projectDir);
}

/**
 * Converts a binary .prof file to text using Python's pstats module.
 */
function convertBinaryProfile(profilePath: string): string {
	try {
		const absPath = path.resolve(profilePath);
		return execSync(
			`python3 -c "import pstats; s = pstats.Stats('${absPath}'); s.sort_stats('cumulative'); s.print_stats()"`,
			{ encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 },
		);
	} catch {
		try {
			const absPath = path.resolve(profilePath);
			return execSync(
				`python -c "import pstats; s = pstats.Stats('${absPath}'); s.sort_stats('cumulative'); s.print_stats()"`,
				{ encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 },
			);
		} catch {
			return "";
		}
	}
}

function parseProfileText(text: string, projectDir?: string): ProfileEntry[] {
	const entries: ProfileEntry[] = [];

	// Match lines like:
	//   1    0.002    0.002    0.005    0.005 /path/to/file.py:42(func_name)
	// or:
	//   1    0.002    0.002    0.005    0.005 file.py:42(func_name)
	// Also handles:
	//   1/2  0.002    0.002    0.005    0.005 {built-in method ...}
	const lineRe =
		/^\s*([\d/]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(.+)$/;

	for (const line of text.split("\n")) {
		const m = line.match(lineRe);
		if (!m) continue;

		const location = m[6].trim();
		const selfTime = Number.parseFloat(m[2]) * 1000; // seconds → ms
		const totalTime = Number.parseFloat(m[4]) * 1000;

		// Skip built-in methods and frozen modules
		if (
			location.startsWith("{") ||
			location.includes("<frozen") ||
			location.includes("<string>")
		) {
			continue;
		}

		// Parse "filename:lineno(funcname)" format
		const locMatch = location.match(/^(.+):(\d+)\((.+)\)$/);
		if (!locMatch) continue;

		const rawPath = locMatch[1];
		const lineNumber = Number.parseInt(locMatch[2], 10);
		const functionName = locMatch[3];

		let filePath: string | undefined;
		let fileName: string | undefined;

		if (rawPath) {
			fileName = path.basename(rawPath);
			if (projectDir) {
				try {
					const absolute = path.isAbsolute(rawPath)
						? rawPath
						: path.resolve(projectDir, rawPath);
					const relative = path.relative(projectDir, absolute);
					if (!relative.startsWith("..")) {
						filePath = relative.replace(/\\/g, "/");
					}
				} catch {
					// Keep as-is
				}
			}
		}

		entries.push({
			functionName,
			filePath,
			fileName,
			lineNumber,
			selfTime,
			totalTime,
		});
	}

	return entries
		.filter((e) => e.selfTime > 0 || e.totalTime > 0)
		.sort((a, b) => b.selfTime - a.selfTime);
}
