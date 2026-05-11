import { Issue, AnalysisContext } from '../types';
import { Rule } from './rule';
export declare class GodFileRule implements Rule {
    name: string;
    run(context: AnalysisContext): Issue[];
}
