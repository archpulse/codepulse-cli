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

export interface TemporalCoupling {
	fileA: string;
	fileB: string;
	coChanges: number;
	totalA: number;
	totalB: number;
	couplingDegree: number;
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
	circularDependencies: string[][];
	hotspots: Hotspot[];
	temporalCouplings?: TemporalCoupling[];
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

// ─── Time Machine Types ──────────────────────────────────────────────

/** Serialized FileNode without the heavy `content` field, for cache storage. */
export interface SerializedFileNode {
	relativePath: string;
	imports: string[];
	exports: string[];
	functions: FunctionNode[];
	lines: number;
	complexity: number;
}

/** On-disk cache for the Time Machine incremental engine. */
export interface TimeMachineCache {
	version: number;
	/** content-hash (SHA-256) → serialized FileNode */
	astByHash: Record<string, SerializedFileNode>;
}

/** A single commit snapshot with its dependency graph and stats. */
export interface CommitSnapshot {
	sha: string;
	date: string;
	author: string;
	message: string;
	/** relativePath → content-hash */
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

/** Git diff entry with rename detection. */
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

/** Result of the full Time Machine analysis across sampled commits. */
export interface TimeMachineResult {
	snapshots: CommitSnapshot[];
	totalCommitsScanned: number;
	totalParseOperations: number;
	cacheHits: number;
}

// ─── Runtime Profiler Correlation Types ──────────────────────────────

/** Normalized entry parsed from a .cpuprofile or cProfile output. */
export interface ProfileEntry {
	functionName: string;
	filePath?: string;
	fileName?: string;
	lineNumber?: number;
	selfTime: number;
	totalTime: number;
}

/** How confident the match is between a profile entry and an AST function. */
export type MatchConfidence =
	| "exact"
	| "filename"
	| "line-range"
	| "name-only"
	| "fuzzy";

/** A matched pair of profile entry + AST function node. */
export interface MatchResult {
	entry: ProfileEntry;
	functionNode: FunctionNode;
	file: string;
	confidence: MatchConfidence;
}

/** The debt category for a matched hotspot. */
export type DebtCategory = "active-hotspot" | "dormant-debt" | "io-bound";

/** Performance-Heavy Technical Debt score for a single function. */
export interface DebtScore {
	file: string;
	functionName: string;
	complexity: number;
	selfTimeMs: number;
	totalTimeMs: number;
	matchConfidence: MatchConfidence;
	debtScore: number;
	category: DebtCategory;
}

/** Full result of a profiler correlation run. */
export interface ProfileCorrelationResult {
	matched: DebtScore[];
	unmatchedEntries: ProfileEntry[];
	totalProfileEntries: number;
	matchRate: number;
}
