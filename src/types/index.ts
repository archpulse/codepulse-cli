export type IssueType =
	| "dead-export"
	| "high-complexity"
	| "god-file"
	| "critical-node"
	| "vulnerability"
	| "duplication"
	| "dependency-vulnerability"
	| "linter"
	| "architecture-violation"
	| "custom";

export type IssueSeverity = "info" | "warning" | "error";

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

export interface FunctionNode {
	name: string;
	startLine: number;
	endLine: number;
	complexity: number;
	isExported: boolean;
	fingerprint?: string;
}

export interface FileNode {
	path: string;
	relativePath: string;
	content: string;
	imports: string[];
	exports: string[];
	functions: FunctionNode[];
	lines: number;
	complexity: number;
	isGodFile: boolean;
	churn?: number;
	mtime?: number;
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

export interface AnalysisCache {
	fileNodes: Map<string, FileNode>;
	gitChurn?: Map<string, number>;
	lastScanTime?: number;
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

export interface ArchitectureLayer {
	name: string;
	pattern: string; // Regex or Glob pattern
	allowDependenciesFrom?: string[]; // List of layer names
}

export interface ProjectConfig {
	maxComplexity?: number;
	godFileLines?: number;
	godFileImports?: number;
	criticalNodeThreshold?: number;
	duplicationThreshold?: number;
	exclude?: string[];
	rootDir?: string;
	architecture?: {
		layers: ArchitectureLayer[];
		strict?: boolean;
	};
}

export interface AnalysisContext {
	files: FileNode[];
	graph: Map<string, GraphNode>;
	edges: DependencyEdge[];
	config: ProjectConfig;
}

export interface Rule {
	name: string;
	description?: string;
	version?: string;
	author?: string;
	category?: string;
	enabled?: boolean;
	run(context: AnalysisContext): Issue[];
}
