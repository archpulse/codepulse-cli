export type IssueType =
	| "dead-export"
	| "high-complexity"
	| "god-file"
	| "critical-node"
	| "vulnerability"
	| "duplication"
	| "dependency-vulnerability"
	| "linter"
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
