import { FileNode, FunctionNode } from '../types';

export const GOD_FILE_LINES = 500;
export const GOD_FILE_IMPORTS = 15;

export function createFileNode(
  filePath: string,
  relativePath: string,
  content: string,
  lines: number,
  imports: string[],
  exports: string[],
  functions: FunctionNode[]
): FileNode {
  let fileComplexity = 1;
  if (functions.length > 0) {
    const sum = functions.reduce((acc, fn) => acc + fn.complexity, 0);
    fileComplexity = Math.max(1, Math.round((sum / functions.length) * 10) / 10);
  }

  const isGodFile = lines >= GOD_FILE_LINES || imports.length >= GOD_FILE_IMPORTS;

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
