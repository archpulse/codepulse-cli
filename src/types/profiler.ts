import type { FunctionNode } from "./analysis";

export interface ProfileEntry {
	functionName: string;
	filePath?: string;
	fileName?: string;
	lineNumber?: number;
	selfTime: number;
	totalTime: number;
}

export type MatchConfidence =
	| "exact"
	| "filename"
	| "line-range"
	| "name-only"
	| "fuzzy";

export interface MatchResult {
	entry: ProfileEntry;
	functionNode: FunctionNode;
	file: string;
	confidence: MatchConfidence;
}

export type DebtCategory = "active-hotspot" | "dormant-debt" | "io-bound";

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

export interface ProfileCorrelationResult {
	matched: DebtScore[];
	unmatchedEntries: ProfileEntry[];
	totalProfileEntries: number;
	matchRate: number;
}
