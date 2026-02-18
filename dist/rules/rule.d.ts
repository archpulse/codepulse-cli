import { Issue, AnalysisContext } from '../types';
export interface Rule {
    name: string;
    run(context: AnalysisContext): Issue[];
}
