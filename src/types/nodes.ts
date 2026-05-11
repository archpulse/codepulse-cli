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
	content: string;
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
