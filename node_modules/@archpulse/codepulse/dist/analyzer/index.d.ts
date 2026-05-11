import { AnalysisResult } from '../types';
export declare function analyze(dir: string, options?: {
    pro?: boolean;
    strict?: boolean;
}): Promise<AnalysisResult>;
