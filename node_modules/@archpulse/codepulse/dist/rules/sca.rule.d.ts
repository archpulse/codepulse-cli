import { AnalysisContext, Issue } from '../types';
import { Rule } from './rule';
export declare class SCARule implements Rule {
    name: string;
    private readonly db;
    run(context: AnalysisContext): Issue[];
    private isVulnerable;
}
