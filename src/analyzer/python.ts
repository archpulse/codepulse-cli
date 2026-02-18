import * as path from 'path';
import { FileNode, FunctionNode } from '../types';
import { readFile, countLines } from './scanner';

const GOD_FILE_LINES = 500;
const GOD_FILE_IMPORTS = 15;

export function analyzePythonFile(filePath: string, baseDir: string): FileNode | null {
  const content = readFile(filePath);
  if (!content) return null;

  const relativePath = path.relative(baseDir, filePath);
  const lines = countLines(content);
  const imports: string[] = [];
  const exports: string[] = [];
  const functions: FunctionNode[] = [];

  const lineArr = content.split('\n');

  // Collect imports: "import x", "from x import y"
  const importRe = /^(?:from\s+([\w.]+)\s+import|import\s+([\w.,\s]+))/;
  for (const line of lineArr) {
    const m = line.trim().match(importRe);
    if (m) imports.push(m[1] ?? m[2].split(',')[0].trim());
  }

  // Collect functions and classes (top-level = exported in Python sense)
  const defRe = /^(def|async def|class)\s+(\w+)\s*[(:]/;
  for (let i = 0; i < lineArr.length; i++) {
    const line = lineArr[i];
    const m = line.match(defRe);
    if (m) {
      const name = m[2];
      const isTopLevel = !line.startsWith(' ') && !line.startsWith('\t');
      if (isTopLevel) exports.push(name);

      // Calculate complexity for this block
      const blockLines = extractBlock(lineArr, i);
      const complexity = calcPythonComplexity(blockLines);

      functions.push({
        name,
        startLine: i + 1,
        endLine: i + blockLines.length,
        complexity,
        isExported: isTopLevel,
      });
    }
  }

  const fileComplexity = functions.reduce((sum, fn) => sum + fn.complexity, 1);
  const isGodFile = lines >= GOD_FILE_LINES || imports.length >= GOD_FILE_IMPORTS;

  return {
    path: filePath,
    relativePath,
    lines,
    imports,
    exports,
    functions,
    complexity: fileComplexity,
    isGodFile,
  };
}

function extractBlock(lines: string[], startIdx: number): string[] {
  const block: string[] = [lines[startIdx]];
  const baseIndent = getIndent(lines[startIdx]);

  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') { block.push(line); continue; }
    if (getIndent(line) <= baseIndent && line.trim() !== '') break;
    block.push(line);
  }
  return block;
}

function getIndent(line: string): number {
  const m = line.match(/^(\s*)/);
  return m ? m[1].length : 0;
}

function calcPythonComplexity(lines: string[]): number {
  let complexity = 1;
  const keywords = /\b(if|elif|else|for|while|except|with|and|or)\b/g;
  for (const line of lines) {
    const stripped = line.trim();
    if (stripped.startsWith('#')) continue;
    const matches = stripped.match(keywords);
    if (matches) complexity += matches.length;
  }
  return complexity;
}
