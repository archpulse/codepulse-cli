import * as fs from 'fs';
import * as path from 'path';
import { AnalysisResult } from '../types';
import { buildGraphSvg } from './svg';
import { buildHtml } from './template';

const REPORT_DIR = '.codepulse-report';

export function generateReport(result: AnalysisResult, baseDir: string): string {
  const reportPath = path.join(baseDir, REPORT_DIR);
  fs.mkdirSync(reportPath, { recursive: true });

  const stats = buildStats(result);
  fs.writeFileSync(
    path.join(reportPath, 'stats.json'),
    JSON.stringify(stats, null, 2)
  );

  const svg = buildGraphSvg(result);
  fs.writeFileSync(path.join(reportPath, 'graph.svg'), svg);

  const html = buildHtml(result, stats);
  fs.writeFileSync(path.join(reportPath, 'index.html'), html);

  return reportPath;
}

export function buildStats(result: AnalysisResult) {
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

export function calculateHealthScore(stats: any, result: AnalysisResult): number {
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
