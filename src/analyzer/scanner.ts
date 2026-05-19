import * as fs from "node:fs";
import * as path from "node:path";
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

export async function scanFilesAsync(options: ScanOptions): Promise<string[]> {
	const { dir, extensions, exclude } = options;
	const files: string[] = [];
	const customExclude = getCustomExcludes(dir, exclude);
	const excludeSet = new Set(customExclude);

	const stack = [dir];
	while (stack.length > 0) {
		const currentDir = stack.pop()!;
		let entries: fs.Dirent[];
		try {
			entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
		} catch {
			continue;
		}

		for (let i = 0; i < entries.length; i++) {
			const entry = entries[i];
			const entryName = entry.name;
			
			if (excludeSet.has(entryName)) continue;

			const fullPath = path.join(currentDir, entryName);
			const relPath = path.relative(dir, fullPath);

			if (shouldExcludeFile(entryName, relPath, customExclude)) continue;

			if (entry.isDirectory()) {
				stack.push(fullPath);
			} else {
				const ext = path.extname(entryName).toLowerCase();
				if (extensions.includes(ext)) {
					files.push(fullPath);
				}
			}
		}
	}
	return files;
}

export function scanFiles(options: ScanOptions): string[] {
	const { dir, extensions, exclude } = options;
	const files: string[] = [];
	const customExclude = getCustomExcludes(dir, exclude);
	const excludeSet = new Set(customExclude);

	const stack = [dir];
	while (stack.length > 0) {
		const currentDir = stack.pop()!;
		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(currentDir, { withFileTypes: true });
		} catch {
			continue;
		}

		for (let i = 0; i < entries.length; i++) {
			const entry = entries[i];
			const entryName = entry.name;
			
			if (excludeSet.has(entryName)) continue;

			const fullPath = path.join(currentDir, entryName);
			const relPath = path.relative(dir, fullPath);

			if (shouldExcludeFile(entryName, relPath, customExclude)) continue;

			if (entry.isDirectory()) {
				stack.push(fullPath);
			} else {
				const ext = path.extname(entryName).toLowerCase();
				if (extensions.includes(ext)) {
					files.push(fullPath);
				}
			}
		}
	}
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

	try {
		const buffer = await fs.promises.readFile(filePath);
		const content = buffer.toString("utf-8");
		
		const lines = content.split("\n");
		// Remove trailing empty line to match readline behavior
		const lineCount = lines.length > 1 && lines[lines.length - 1] === "" 
			? lines.length - 1 
			: lines.length;
		const avgLineLength = content.length / (lineCount || 1);

		if (lineCount > 0 && avgLineLength > MINIFIED_AVG_LINE_LENGTH) {
			return {
				content: null,
				byteSize: stats.size,
				lineCount,
				averageLineLength: avgLineLength,
				skipped: true,
				skipReason: "minified",
			};
		}

		return {
			content,
			byteSize: stats.size,
			lineCount,
			averageLineLength: avgLineLength,
			skipped: false,
		};
	} catch {
		return {
			content: null,
			byteSize: stats.size,
			lineCount: 0,
			averageLineLength: 0,
			skipped: true,
			skipReason: "unreadable",
		};
	}
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
