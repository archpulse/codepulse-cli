import { Issue, AnalysisContext } from '../types';
import { Rule } from './rule';
export declare class DeadExportRule implements Rule {
    name: string;
    run(context: AnalysisContext): Issue[];
}
