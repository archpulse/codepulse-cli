import { AnalysisContext, Issue } from '../types';
export interface RunOptions {
    strict?: boolean;
}
export declare function runRules(context: AnalysisContext, opts?: RunOptions): Issue[];
