import type { FileNode } from "../types/index";
import { createFileNode, initializeFileAnalysis } from "./utils";

export function analyzePythonFile(
	filePath: string,
	baseDir: string,
): FileNode | null {
	const init = initializeFileAnalysis(filePath, baseDir);
	if (!init) return null;

	const { content, relativePath, lines, imports, exports, functions } = init;
	const lineArr = content.split("\n");

	const importRe = /^(?:from\s+([\w.]+)\s+import|import\s+([\w.,\s]+))/;
	const defRe = /^(def|async def|class)\s+(\w+)\s*[(:]/;

	for (let i = 0; i < lineArr.length; i++) {
		const line = lineArr[i];
		const trimmed = line.trim();

		if (trimmed.startsWith("#") || !trimmed) continue;

		const mImport = line.match(importRe);
		if (mImport) {
			const imp = mImport[1] ?? mImport[2].split(",")[0].trim();
			if (imp) imports.push(imp);
			continue;
		}

		const mDef = line.match(defRe);
		if (mDef) {
			processPythonDefinition(line, mDef[2], i, lineArr, exports, functions);
		}
	}

	return createFileNode(
		filePath,
		relativePath,
		content,
		lines,
		imports,
		exports,
		functions,
	);
}

function processPythonDefinition(
	line: string,
	name: string,
	index: number,
	lineArr: string[],
	exports: string[],
	functions: any[],
) {
	const isTopLevel = !line.startsWith(" ") && !line.startsWith("\t");
	if (isTopLevel) exports.push(name);

	const blockLines = extractBlock(lineArr, index);
	const complexity = calcPythonComplexity(blockLines);

	functions.push({
		name,
		startLine: index + 1,
		endLine: index + blockLines.length,
		complexity,
		isExported: isTopLevel,
	});
}

function extractBlock(lines: string[], startIdx: number): string[] {
	const block: string[] = [lines[startIdx]];
	const baseIndent = getIndent(lines[startIdx]);

	for (let i = startIdx + 1; i < lines.length; i++) {
		const line = lines[i];
		if (line.trim() === "") continue; // Ignore empty lines in block detection
		if (getIndent(line) <= baseIndent) break;
		block.push(line);
	}
	return block;
}

function getIndent(line: string): number {
	const m = line.match(/^(\s*)/);
	return m ? m[1].replace(/\t/g, "    ").length : 0;
}

function calcPythonComplexity(lines: string[]): number {
	let complexity = 1;
	// Keywords that increase cyclomatic complexity
	const keywords = /\b(if|elif|for|while|except|with|and|or)\b/g;
	for (const line of lines) {
		const stripped = line.split("#")[0].trim(); // Remove comments
		if (!stripped) continue;
		const matches = stripped.match(keywords);
		if (matches) complexity += matches.length;
	}
	return complexity;
}
