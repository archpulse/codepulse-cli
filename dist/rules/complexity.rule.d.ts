import { Issue, AnalysisContext } from '../types';
import { Rule } from './rule';
export declare class ComplexityRule implements Rule {
    private errorThreshold;
    name: string;
    constructor(errorThreshold?: number);
    run(context: AnalysisContext): Issue[];
}
