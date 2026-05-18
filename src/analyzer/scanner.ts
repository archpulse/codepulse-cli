import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import type { ScanOptions } from "../types/config";

export const MAX_ANALYSIS_FILE_SIZE_BYTES = 2 * 1024 * 1024;
export const MINIFIED_AVG_LINE_LENGTH = 500;

const MANDATORY_EXCLUDES = ["node_modules", ".git", "dist", "build", ".venv"];

function getCustomExcludes(dir: string, baseExclude: string[]): string[] {
	const customExclude = [...MANDATORY_EXCLUDES, ...baseExclude];
	const ignoreFilePath = path.join(dir, ".codepulseignore");
	if (fs.existsSync(ignoreFilePath)) {
		const ignoreContent = fs.readFileSync(ignoreFilePath, "utf-8");
		const ignoreLines = ignoreContent
			.split("\n")
			.map((l) => l.trim())
			.filter((l) => l && !l.startsWith("#"));
		customExclude.push(...ignoreLines);
	}
	return customExclude;
}

function shouldExcludeFile(
	entryName: string,
	relPath: string,
	customExclude: string[],
): boolean {
	// Normalize path to use forward slashes for matching
	const normalizedRelPath = relPath.split(path.sep).join("/");

	return customExclude.some((ex) => {
		if (ex.startsWith("*")) return entryName.includes(ex.slice(1));
		return (
			normalizedRelPath === ex ||
			normalizedRelPath.startsWith(ex + "/") ||
			entryName === ex
		);
	});
}

function processDirectoryEntry(
	entry: fs.Dirent,
	currentDir: string,
	baseDir: string,
	customExclude: string[],
	extensions: string[],
	files: string[],
	walkFn: (d: string) => void,
) {
	const fullPath = path.join(currentDir, entry.name);
	const relPath = path.relative(baseDir, fullPath);

	if (shouldExcludeFile(entry.name, relPath, customExclude)) return;

	if (entry.isDirectory()) {
		walkFn(fullPath);
	} else if (entry.isFile()) {
		const ext = path.extname(entry.name).toLowerCase();
		if (extensions.includes(ext)) {
			files.push(fullPath);
		}
	}
}

export function scanFiles(options: ScanOptions): string[] {
	const { dir, extensions, exclude } = options;
	const files: string[] = [];
	const customExclude = getCustomExcludes(dir, exclude);

	function walk(currentDir: string): void {
		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(currentDir, { withFileTypes: true });
		} catch {
			return;
		}

		for (const entry of entries) {
			processDirectoryEntry(
				entry,
				currentDir,
				dir,
				customExclude,
				extensions,
				files,
				walk,
			);
		}
	}

	walk(dir);
	return files;
}

export interface FileReadResult {
	content: string | null;
	byteSize: number;
	lineCount: number;
	averageLineLength: number;
	skipped: boolean;
	skipReason?: "too-large" | "minified" | "unreadable";
}

export async function readFileForAnalysis(
	filePath: string,
): Promise<FileReadResult> {
	let stats: fs.Stats;
	try {
		stats = await fs.promises.stat(filePath);
	} catch {
		return {
			content: null,
			byteSize: 0,
			lineCount: 0,
			averageLineLength: 0,
			skipped: true,
			skipReason: "unreadable",
		};
	}

	if (stats.size > MAX_ANALYSIS_FILE_SIZE_BYTES) {
		return {
			content: null,
			byteSize: stats.size,
			lineCount: 0,
			averageLineLength: 0,
			skipped: true,
			skipReason: "too-large",
		};
	}

	const lines: string[] = [];
	let lineCount = 0;
	let totalLineLength = 0;
	const stream = fs.createReadStream(filePath, {
		encoding: "utf-8",
		highWaterMark: 64 * 1024,
	});
	const reader = readline.createInterface({
		input: stream,
		crlfDelay: Infinity,
	});

	try {
		for await (const line of reader) {
			lines.push(line);
			lineCount++;
			totalLineLength += line.length;

			if (
				lineCount >= 8 &&
				totalLineLength / lineCount > MINIFIED_AVG_LINE_LENGTH
			) {
				reader.close();
				stream.destroy();
				return {
					content: null,
					byteSize: stats.size,
					lineCount,
					averageLineLength: totalLineLength / lineCount,
					skipped: true,
					skipReason: "minified",
				};
			}
		}
	} catch {
		reader.close();
		stream.destroy();
		return {
			content: null,
			byteSize: stats.size,
			lineCount,
			averageLineLength: lineCount ? totalLineLength / lineCount : 0,
			skipped: true,
			skipReason: "unreadable",
		};
	} finally {
		reader.close();
	}

	const averageLineLength = lineCount ? totalLineLength / lineCount : 0;
	if (lineCount > 0 && averageLineLength > MINIFIED_AVG_LINE_LENGTH) {
		return {
			content: null,
			byteSize: stats.size,
			lineCount,
			averageLineLength,
			skipped: true,
			skipReason: "minified",
		};
	}

	return {
		content: lines.join("\n"),
		byteSize: stats.size,
		lineCount,
		averageLineLength,
		skipped: false,
	};
}

export function readFile(filePath: string): string {
	try {
		return fs.readFileSync(filePath, "utf-8");
	} catch {
		return "";
	}
}

export function countLines(content: string): number {
	return content.split("\n").length;
}
