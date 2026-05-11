import { AnalysisResult, FileNode, ScanOptions, AnalysisContext, ProjectConfig } from '../types';
import { scanFiles } from './scanner';
import { analyzeFile } from './ast';
import { buildGraph, detectDeadExports } from './graph';
import { runRules } from '../rules';
import { getGitChurn, calculateHotspots } from './git';
import * as path from 'path';
import * as fs from 'fs';

function loadConfig(dir: string, options: { strict?: boolean }): ProjectConfig {
  let config: ProjectConfig = {
    maxComplexity: options.strict ? 10 : 20,
    godFileLines: 500,
    godFileImports: 15,
    criticalNodeThreshold: 10,
    duplicationThreshold: 15,
    exclude: [],
  };

  const configPath = path.join(dir, '.codepulse.json');
  if (fs.existsSync(configPath)) {
    try {
      const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      config = { ...config, ...userConfig };
    } catch (err) {
      console.warn('Failed to parse .codepulse.json, using defaults.');
    }
  }
  return config;
}

function processFiles(filePaths: string[], dir: string, churnMap: Map<string, number>, config: ProjectConfig): FileNode[] {
  const files: FileNode[] = [];
  let processed = 0;
  const total = filePaths.length;

  for (const filePath of filePaths) {
    try {
      const result = analyzeFile(filePath, dir);
      if (result) {
        const rel = result.relativePath;
        result.churn = churnMap.get(rel) || 0;
        result.isGodFile = result.lines > (config.godFileLines || 500) ||
                           result.imports.length > (config.godFileImports || 15);
        files.push(result);
      }
    } catch (err) {
      // Skip problematic files
    }
    processed++;
    if (processed % 10 === 0 || processed === total) {
      process.stdout.write(`\r  Analyzing files: ${processed}/${total}...`);
    }
  }
  process.stdout.write('\n');
  return files;
}

export async function analyze(
  dir: string,
  options: { pro?: boolean; strict?: boolean } = {}
): Promise<AnalysisResult> {
  const config = loadConfig(dir, options);

  const scanOptions: ScanOptions = {
    dir,
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.c', '.cs', '.lua', '.css', '.scss', '.html'],
    exclude: ['node_modules', '.git', 'dist', 'build', 'coverage', '__pycache__', '.codepulse-report', '*.min.js', '*.test.ts', '*.spec.ts', ...(config.exclude || [])],
  };

  const filePaths = scanFiles(scanOptions);
  const churnMap = getGitChurn(dir);

  const files = processFiles(filePaths, dir, churnMap, config);

  const { edges, graph } = buildGraph(files, dir);
  const deadExports = detectDeadExports(files, edges);
  const godFiles = files.filter(f => f.isGodFile);
  const hotspots = calculateHotspots(files);

  for (const node of graph.values()) {
    node.isCritical = node.inDegree >= (config.criticalNodeThreshold || 10);
  }

  const criticalFiles = [...graph.values()].filter(n => n.isCritical)
    .sort((a, b) => b.centrality - a.centrality);

  const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
  const avgComplexity = files.length
    ? files.reduce((sum, f) => sum + f.complexity, 0) / files.length
    : 0;

  const context: AnalysisContext = { files, graph, edges, config };
  const issues = runRules(context, { strict: options.strict });

  return {
    files, edges, graph,
    deadExports, godFiles, criticalFiles,
    hotspots,
    totalFiles: files.length,
    totalLines, avgComplexity,
    issues,
  };
}
