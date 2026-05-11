import { FileNode, FunctionNode } from '../types';
export declare const GOD_FILE_LINES = 500;
export declare const GOD_FILE_IMPORTS = 15;
export declare function createFileNode(filePath: string, relativePath: string, lines: number, imports: string[], exports: string[], functions: FunctionNode[]): FileNode;
