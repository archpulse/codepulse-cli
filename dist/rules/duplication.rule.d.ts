import { AnalysisContext, Issue } from '../types';
import { Rule } from './rule';
export declare class DuplicationRule implements Rule {
    name: string;
    run(context: AnalysisContext): Issue[];
}
