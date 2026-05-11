export interface FunctionNode {
    name: string;
    startLine: number;
    endLine: number;
    complexity: number;
    isExported: boolean;
}
export interface FileNode {
    path: string;
    relativePath: string;
    imports: string[];
    exports: string[];
    functions: FunctionNode[];
    lines: number;
    complexity: number;
    isGodFile: boolean;
    churn?: number;
}
export interface DependencyEdge {
    from: string;
    to: string;
}
export interface GraphNode {
    id: string;
    inDegree: number;
    outDegree: number;
    centrality: number;
    isCritical: boolean;
}
export interface DeadExport {
    file: string;
    name: string;
}
export interface Hotspot {
    file: string;
    score: number;
    complexity: number;
    churn: number;
}
export interface AnalysisResult {
    files: FileNode[];
    edges: DependencyEdge[];
    graph: Map<string, GraphNode>;
    deadExports: DeadExport[];
    godFiles: FileNode[];
    criticalFiles: GraphNode[];
    hotspots: Hotspot[];
    totalFiles: number;
    totalLines: number;
    avgComplexity: number;
    issues: Issue[];
}
export interface ScanOptions {
    dir: string;
    exclude: string[];
    extensions: string[];
    maxFiles?: number;
}
export type IssueType = 'dead-export' | 'high-complexity' | 'god-file' | 'critical-node' | 'vulnerability' | 'duplication' | 'dependency-vulnerability';
export type IssueSeverity = 'info' | 'warning' | 'error';
export interface Issue {
    type: IssueType;
    severity: IssueSeverity;
    file: string;
    line?: number;
    symbol?: string;
    message: string;
    suggestion?: string;
    context?: string;
}
export interface ProjectConfig {
    maxComplexity?: number;
    godFileLines?: number;
    godFileImports?: number;
    criticalNodeThreshold?: number;
    duplicationThreshold?: number;
    exclude?: string[];
}
export interface AnalysisContext {
    files: FileNode[];
    graph: Map<string, GraphNode>;
    edges: DependencyEdge[];
    config: ProjectConfig;
}
