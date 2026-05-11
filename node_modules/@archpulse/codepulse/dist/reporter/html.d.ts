import { AnalysisResult } from '../types';
export declare function generateReport(result: AnalysisResult, baseDir: string): string;
export declare function buildStats(result: AnalysisResult): {
    totalFiles: number;
    totalLines: number;
    avgComplexity: number;
    deadExports: number;
    godFiles: number;
    criticalFiles: number;
    vulnerabilities: number;
    hotspots: import("../types").Hotspot[];
    treemapData: {
        name: string;
        value: number;
        complexity: number;
        churn: number;
        isGod: boolean;
    }[];
    top10Complex: {
        path: string;
        complexity: number;
        lines: number;
    }[];
    deadExportsList: import("../types").DeadExport[];
    godFilesList: {
        path: string;
        lines: number;
        imports: number;
        complexity: number;
    }[];
    vulnerabilitiesList: {
        file: string;
        line: number;
        message: string;
        suggestion: string;
    }[];
    graphData: {
        nodes: {
            id: string;
            name: string;
            fullPath: string;
            complexity: number;
            isCritical: boolean;
            isGod: boolean;
        }[];
        links: {
            source: string;
            target: string;
        }[];
    };
};
export declare function calculateHealthScore(stats: any, result: AnalysisResult): number;
