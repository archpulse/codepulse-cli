import { Issue, AnalysisContext } from '../types';
import { Rule } from './rule';
export declare class CriticalNodeRule implements Rule {
    name: string;
    run(context: AnalysisContext): Issue[];
}
