import * as path from "node:path";
import type { FileNode, FunctionNode } from "../types/analysis";

import { countLines, readFile } from "./scanner";

export const GOD_FILE_LINES = 500;
export const GOD_FILE_IMPORTS = 15;

export function initializeFileAnalysis(
	filePath: string,
	baseDir: string,
	contentOverride?: string,
): {
	content: string;
	relativePath: string;
	lines: number;
	imports: string[];
	exports: string[];
	functions: FunctionNode[];
} | null {
	const content = contentOverride ?? readFile(filePath);
	if (!content) return null;

	const relativePath = path.relative(baseDir, filePath);
	const lines = countLines(content);
	const imports: string[] = [];
	const exports: string[] = [];
	const functions: FunctionNode[] = [];

	return {
		content,
		relativePath,
		lines,
		imports,
		exports,
		functions,
	};
}

export function createFileNode(
	filePath: string,
	relativePath: string,
	content: string,
	lines: number,
	imports: string[],
	exports: string[],
	functions: FunctionNode[],
): FileNode {
	let fileComplexity = 1;
	if (functions.length > 0) {
		const sum = functions.reduce((acc, fn) => acc + fn.complexity, 0);
		fileComplexity = Math.max(
			1,
			Math.round((sum / functions.length) * 10) / 10,
		);
	}

	const isGodFile =
		lines >= GOD_FILE_LINES || imports.length >= GOD_FILE_IMPORTS;

	return {
		path: filePath,
		relativePath,
		content,
		lines,
		imports,
		exports,
		functions,
		complexity: fileComplexity,
		isGodFile,
	};
}
