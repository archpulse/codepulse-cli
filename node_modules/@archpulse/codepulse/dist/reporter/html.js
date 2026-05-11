"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReport = generateReport;
exports.buildStats = buildStats;
exports.calculateHealthScore = calculateHealthScore;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const svg_1 = require("./svg");
const template_1 = require("./template");
const REPORT_DIR = '.codepulse-report';
function generateReport(result, baseDir) {
    const reportPath = path.join(baseDir, REPORT_DIR);
    fs.mkdirSync(reportPath, { recursive: true });
    const stats = buildStats(result);
    fs.writeFileSync(path.join(reportPath, 'stats.json'), JSON.stringify(stats, null, 2));
    const svg = (0, svg_1.buildGraphSvg)(result);
    fs.writeFileSync(path.join(reportPath, 'graph.svg'), svg);
    const html = (0, template_1.buildHtml)(result, stats);
    fs.writeFileSync(path.join(reportPath, 'index.html'), html);
    return reportPath;
}
function buildStats(result) {
    const top10Complex = [...result.files]
        .sort((a, b) => b.complexity - a.complexity)
        .slice(0, 10)
        .map(f => ({ path: f.relativePath, complexity: f.complexity, lines: f.lines }));
    const vulnerabilities = result.issues.filter(i => i.type === 'vulnerability');
    const treemapData = result.files.map(f => ({
        name: f.relativePath,
        value: f.lines,
        complexity: f.complexity,
        churn: f.churn || 0,
        isGod: f.isGodFile,
    }));
    return {
        totalFiles: result.totalFiles,
        totalLines: result.totalLines,
        avgComplexity: Math.round(result.avgComplexity * 10) / 10,
        deadExports: result.deadExports.length,
        godFiles: result.godFiles.length,
        criticalFiles: result.criticalFiles.length,
        vulnerabilities: vulnerabilities.length,
        hotspots: result.hotspots,
        treemapData,
        top10Complex,
        deadExportsList: result.deadExports,
        godFilesList: result.godFiles.map(f => ({
            path: f.relativePath,
            lines: f.lines,
            imports: f.imports.length,
            complexity: f.complexity,
        })),
        vulnerabilitiesList: vulnerabilities.map(v => ({
            file: v.file,
            line: v.line,
            message: v.message,
            suggestion: v.suggestion
        })),
        graphData: {
            nodes: result.files.map(f => ({
                id: f.path,
                name: f.relativePath.split('/').pop(),
                fullPath: f.relativePath,
                complexity: f.complexity,
                isCritical: result.graph.get(f.path)?.isCritical || false,
                isGod: f.isGodFile
            })),
            links: result.edges.map(e => ({ source: e.from, target: e.to }))
        }
    };
}
function calculateHealthScore(stats, result) {
    let score = 100;
    const scaIssues = result.issues.filter(i => i.type === 'dependency-vulnerability').length;
    const duplicationIssues = result.issues.filter(i => i.type === 'duplication').length;
    score -= Math.min(40, stats.vulnerabilities * 10);
    score -= Math.min(30, scaIssues * 15);
    score -= Math.min(20, duplicationIssues * 4);
    score -= Math.min(15, stats.hotspots.length * 5);
    score -= Math.min(15, stats.deadExports * 2);
    score -= Math.min(10, stats.godFiles * 5);
    score -= Math.min(10, stats.criticalFiles * 3);
    score -= Math.min(20, Math.max(0, stats.avgComplexity - 5) * 2);
    return Math.max(0, Math.round(score));
}
//# sourceMappingURL=html.js.map