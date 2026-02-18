import { AnalysisResult, FileNode, ScanOptions, AnalysisContext } from '../types';
import { scanFiles } from './scanner';
import { analyzeFile } from './ast';
import { buildGraph, detectDeadExports } from './graph';
import { runRules } from '../rules';

const FREE_FILE_LIMIT = 200;

export async function analyze(
  dir: string,
  options: { pro?: boolean; strict?: boolean } = {}
): Promise<AnalysisResult> {
  const maxFiles = options.pro ? undefined : FREE_FILE_LIMIT;

  const scanOptions: ScanOptions = {
    dir,
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.c', '.cs', '.lua', '.css', '.scss', '.html'],
    exclude: ['node_modules', '.git', 'dist', 'build', 'coverage', '__pycache__', '*.min.js', '*.test.ts', '*.spec.ts'],
    maxFiles,
  };

  const filePaths = scanFiles(scanOptions);

  const files: FileNode[] = [];
  for (const filePath of filePaths) {
    const result = analyzeFile(filePath, dir);
    if (result) files.push(result);
  }

  const { edges, graph } = buildGraph(files, dir);
  const deadExports = detectDeadExports(files, edges);
  const godFiles = files.filter(f => f.isGodFile);
  const criticalFiles = [...graph.values()].filter(n => n.isCritical)
    .sort((a, b) => b.centrality - a.centrality);

  const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
  const avgComplexity = files.length
    ? files.reduce((sum, f) => sum + f.complexity, 0) / files.length
    : 0;

  const context: AnalysisContext = { files, graph, edges };
  const issues = runRules(context, { strict: options.strict });

  return {
    files, edges, graph,
    deadExports, godFiles, criticalFiles,
    totalFiles: files.length,
    totalLines, avgComplexity,
    issues,
  };
}
