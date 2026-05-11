import * as path from 'path';
import { FileNode, FunctionNode } from '../types';
import { readFile, countLines } from './scanner';
import { createFileNode } from './utils';

export function analyzePythonFile(filePath: string, baseDir: string): FileNode | null {
  const content = readFile(filePath);
  if (!content) return null;

  const relativePath = path.relative(baseDir, filePath);
  const lines = countLines(content);
  const imports: string[] = [];
  const exports: string[] = [];
  const functions: FunctionNode[] = [];

  const lineArr = content.split('\n');

  // Improved import regex
  const importRe = /^(?:from\s+([\w.]+)\s+import|import\s+([\w.,\s]+))/;
  const defRe = /^(def|async def|class)\s+(\w+)\s*[(:]/;

  for (let i = 0; i < lineArr.length; i++) {
    const line = lineArr[i];
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (trimmed.startsWith('#') || !trimmed) continue;

    // Imports
    const mImport = line.match(importRe);
    if (mImport) {
      const imp = mImport[1] ?? mImport[2].split(',')[0].trim();
      if (imp) imports.push(imp);
    }

    // Functions/Classes
    const mDef = line.match(defRe);
    if (mDef) {
      const name = mDef[2];
      const isTopLevel = !line.startsWith(' ') && !line.startsWith('\t');
      if (isTopLevel) exports.push(name);

      const blockLines = extractBlock(lineArr, i);
      const complexity = calcPythonComplexity(blockLines);

      functions.push({
        name,
        startLine: i + 1,
        endLine: i + blockLines.length,
        complexity,
        isExported: isTopLevel,
      });
      // Skip the rest of the block to avoid double counting nested functions for file complexity
      // but we still want to detect them if they are top-level. 
      // Actually, for simple line-by-line, we just continue.
    }
  }

  return createFileNode(filePath, relativePath, content, lines, imports, exports, functions);
}

function extractBlock(lines: string[], startIdx: number): string[] {
  const block: string[] = [lines[startIdx]];
  const baseIndent = getIndent(lines[startIdx]);

  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue; // Ignore empty lines in block detection
    if (getIndent(line) <= baseIndent) break;
    block.push(line);
  }
  return block;
}

function getIndent(line: string): number {
  const m = line.match(/^(\s*)/);
  return m ? m[1].replace(/\t/g, '    ').length : 0;
}

function calcPythonComplexity(lines: string[]): number {
  let complexity = 1;
  // Keywords that increase cyclomatic complexity
  const keywords = /\b(if|elif|for|while|except|with|and|or)\b/g;
  for (const line of lines) {
    const stripped = line.split('#')[0].trim(); // Remove comments
    if (!stripped) continue;
    const matches = stripped.match(keywords);
    if (matches) complexity += matches.length;
  }
  return complexity;
}
