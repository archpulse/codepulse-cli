import type { FileNode } from "../types/analysis";
import { createFileNode, initializeFileAnalysis } from "./utils";

export function analyzeRustFile(
	filePath: string,
	baseDir: string,
	contentOverride?: string,
): FileNode | null {
	const init = initializeFileAnalysis(filePath, baseDir, contentOverride);
	if (!init) return null;

	const { content, relativePath, lines, imports, exports, functions } = init;
	const lineArr = content.split("\n");

	const importRe = /^(?:use\s+([\w.:{}*,\s]+);)/;
	const fnRe = /^(?:pub(?:\([\w\s]+\))?\s+)?(?:async\s+)?fn\s+([\w]+)\s*[<(]/;
	const structRe = /^(?:pub(?:\([\w\s]+\))?\s+)?(?:struct|enum|trait|type|mod)\s+([\w]+)/;

	for (let i = 0; i < lineArr.length; i++) {
		const line = lineArr[i];
		const trimmed = line.trim();

		if (trimmed.startsWith("//") || trimmed.startsWith("/*") || !trimmed) continue;

		const mImport = trimmed.match(importRe);
		if (mImport) {
			const imp = mImport[1];
			if (imp) imports.push(imp);
			continue;
		}

		const mFn = trimmed.match(fnRe);
		if (mFn) {
			processRustDefinition(line, mFn[1], i, lineArr, exports, functions, true);
			continue;
		}

		const mStruct = trimmed.match(structRe);
		if (mStruct) {
			processRustDefinition(line, mStruct[1], i, lineArr, exports, functions, false);
			continue;
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

function processRustDefinition(
	line: string,
	name: string,
	index: number,
	lineArr: string[],
	exports: string[],
	functions: any[],
	isFunction: boolean,
) {
	const isPublic = line.trim().startsWith("pub");
	if (isPublic) exports.push(name);

	if (isFunction) {
		const blockLines = extractRustBlock(lineArr, index);
		const complexity = calcRustComplexity(blockLines);

		functions.push({
			name,
			startLine: index + 1,
			endLine: index + blockLines.length,
			complexity,
			isExported: isPublic,
		});
	}
}

function extractRustBlock(lines: string[], startIdx: number): string[] {
	const block: string[] = [];
	let braceCount = 0;
	let started = false;

	for (let i = startIdx; i < lines.length; i++) {
		const line = lines[i];
		block.push(line);

		const openBraces = (line.match(/{/g) || []).length;
		const closeBraces = (line.match(/}/g) || []).length;

		braceCount += openBraces - closeBraces;

		if (openBraces > 0) started = true;

		if (started && braceCount <= 0) break;
	}
	return block;
}

function calcRustComplexity(lines: string[]): number {
	let complexity = 1;
	// Keywords and operators that increase cyclomatic complexity in Rust
	const keywords = /\b(if|else\s+if|match|while|for|loop|&&|\|\|)\b/g;
	for (const line of lines) {
		const stripped = line.split("//")[0].split("/*")[0].trim();
		if (!stripped) continue;
		const matches = stripped.match(keywords);
		if (matches) complexity += matches.length;
		
		// Match arm arrows also count as complexity if we want to be thorough, 
		// but standard CC usually counts branching points. Match arms are branching points.
		if (stripped.includes("=>")) complexity++;
	}
	return complexity;
}
