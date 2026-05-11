import { FileNode, DependencyEdge, GraphNode } from '../types';
export declare function buildGraph(files: FileNode[], baseDir: string): {
    edges: DependencyEdge[];
    graph: Map<string, GraphNode>;
};
export declare function detectDeadExports(files: FileNode[], edges: DependencyEdge[]): {
    file: string;
    name: string;
}[];
