import type { DependencyEdge, GraphNode, FunctionNode } from "./analysis";

export interface SerializedFileNode {
	relativePath: string;
	imports: string[];
	exports: string[];
	functions: FunctionNode[];
	lines: number;
	complexity: number;
}

export interface TimeMachineCache {
	version: number;
	astByHash: Record<string, SerializedFileNode>;
}

export interface CommitSnapshot {
	sha: string;
	date: string;
	author: string;
	message: string;
	fileHashes: Record<string, string>;
	graph: {
		nodes: GraphNode[];
		edges: DependencyEdge[];
	};
	stats: {
		files: number;
		totalLines: number;
		avgComplexity: number;
	};
}

export interface DiffEntry {
	status: "A" | "M" | "D" | "R";
	oldPath?: string;
	newPath: string;
	similarity?: number;
}

export type SamplingStrategy =
	| { type: "every-nth"; n: number }
	| { type: "date-interval"; interval: "daily" | "weekly" | "monthly" }
	| { type: "tag-only" }
	| { type: "max-points"; count: number };

export interface TimeMachineResult {
	snapshots: CommitSnapshot[];
	totalCommitsScanned: number;
	totalParseOperations: number;
	cacheHits: number;
}
