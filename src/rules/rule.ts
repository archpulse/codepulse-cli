import type { AnalysisContext } from "../types/analysis";
import type { Issue } from "../types/issues";

export interface Rule {
	name: string;
	description?: string;
	version?: string;
	author?: string;
	category?: string;
	enabled?: boolean;
	run(context: AnalysisContext): Issue[];
}
