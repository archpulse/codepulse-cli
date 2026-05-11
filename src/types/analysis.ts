import type { DeadExport, Hotspot, Issue } from "./issues";
import type { DependencyEdge, FileNode, GraphNode } from "./nodes";

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

export interface ProjectConfig {
	maxComplexity?: number;
	godFileLines?: number;
	godFileImports?: number;
	criticalNodeThreshold?: number;
	duplicationThreshold?: number;
	exclude?: string[];
	rootDir?: string;
}

export interface AnalysisContext {
	files: FileNode[];
	graph: Map<string, GraphNode>;
	edges: DependencyEdge[];
	config: ProjectConfig;
}
