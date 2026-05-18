import { ProjectConfig } from "./config";
import { DeadExport, Hotspot, TemporalCoupling } from "./git";

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
	| "circular-dependency"
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
	size?: number;
}

export interface AnalysisCache {
	fileNodes: Map<string, FileNode>;
	gitChurn?: Map<string, number>;
	lastScanTime?: number;
}

export interface GraphNode {
	id: string;
	inDegree: number;
	outDegree: number;
	centrality: number;
	isCritical: boolean;
}

export interface DependencyEdge {
	from: string;
	to: string;
}

export interface AnalysisContext {
	files: FileNode[];
	graph: Map<string, GraphNode>;
	edges: DependencyEdge[];
	config: ProjectConfig;
}

export interface AnalysisResult {
	files: FileNode[];
	edges: DependencyEdge[];
	graph: Map<string, GraphNode>;
	deadExports: DeadExport[];
	godFiles: FileNode[];
	criticalFiles: GraphNode[];
	circularDependencies: string[][];
	hotspots: Hotspot[];
	temporalCouplings?: TemporalCoupling[];
	totalFiles: number;
	totalLines: number;
	avgComplexity: number;
	issues: Issue[];
}
