import * as path from 'path';
import * as fs from 'fs';
import { FileNode, DependencyEdge, GraphNode } from '../types';

function createModuleMap(files: FileNode[]): Map<string, string> {
  const moduleNameMap = new Map<string, string>();
  for (const file of files) {
    const noExt = path.basename(file.path, path.extname(file.path));
    const rel = file.relativePath.replace(/\\/g, '/');
    moduleNameMap.set(noExt, file.path);
    const relNoExt = rel.replace(/\.[^.]+$/, '');
    moduleNameMap.set(relNoExt, file.path);
  }
  return moduleNameMap;
}

function processFileImports(file: FileNode, isPython: boolean, filePathSet: Set<string>, moduleNameMap: Map<string, string>, baseDir: string, seenEdges: Set<string>, edges: DependencyEdge[]) {
  for (const imp of file.imports) {
    let resolved: string | null = null;
    if (imp.startsWith('.') || imp.startsWith('@/')) {
      resolved = resolveRelative(file.path, imp, filePathSet, isPython, baseDir);
    } else if (isPython) {
      resolved = resolvePythonAbsolute(imp, moduleNameMap);
    }

    if (resolved && resolved !== file.path) {
      const key = `${file.path}→${resolved}`;
      if (!seenEdges.has(key)) {
        seenEdges.add(key);
        edges.push({ from: file.path, to: resolved });
      }
    }
  }
}

function calculateCentrality(graph: Map<string, GraphNode>) {
  let maxCentrality = 0;
  for (const node of graph.values()) {
    node.centrality = node.inDegree * node.outDegree + node.inDegree;
    if (node.centrality > maxCentrality) maxCentrality = node.centrality;
  }

  const criticalThreshold = Math.max(3, maxCentrality * 0.6);
  for (const node of graph.values()) {
    node.isCritical = node.centrality >= criticalThreshold || node.inDegree >= 5;
  }
}

export function buildGraph(
  files: FileNode[],
  baseDir: string
): { edges: DependencyEdge[]; graph: Map<string, GraphNode> } {
  const filePathSet = new Set(files.map(f => f.path));
  const moduleNameMap = createModuleMap(files);

  const edges: DependencyEdge[] = [];
  const seenEdges = new Set<string>();

  for (const file of files) {
    const ext = path.extname(file.path);
    const isPython = ext === '.py';
    processFileImports(file, isPython, filePathSet, moduleNameMap, baseDir, seenEdges, edges);
  }

  const graph = new Map<string, GraphNode>();
  for (const file of files) {
    graph.set(file.path, {
      id: file.path,
      inDegree: 0,
      outDegree: 0,
      centrality: 0,
      isCritical: false,
    });
  }

  for (const edge of edges) {
    const from = graph.get(edge.from);
    const to = graph.get(edge.to);
    if (from) from.outDegree++;
    if (to) to.inDegree++;
  }

  calculateCentrality(graph);

  return { edges, graph };
}

function resolveRelative(
  fromFile: string,
  importPath: string,
  filePathSet: Set<string>,
  isPython: boolean,
  baseDir: string
): string | null {
  const extensions = isPython
    ? ['.py', '']
    : ['.ts', '.tsx', '.js', '.jsx', ''];
  
  let resolvedBase: string;

  if (importPath.startsWith('@/')) {
    // Handle @/ alias common in Vite/Next.js
    const appSrc = path.join(baseDir, 'app', 'src');
    const rootSrc = path.join(baseDir, 'src');
    const searchBase = fs.existsSync(appSrc) ? appSrc : (fs.existsSync(rootSrc) ? rootSrc : baseDir);
    resolvedBase = path.resolve(searchBase, importPath.slice(2));
  } else if (importPath.startsWith('.')) {
    const dir = path.dirname(fromFile);
    resolvedBase = path.resolve(dir, importPath);
  } else {
    return null;
  }

  for (const ext of extensions) {
    if (filePathSet.has(resolvedBase + ext)) return resolvedBase + ext;
    const idx = path.join(resolvedBase, '__init__' + ext);
    if (filePathSet.has(idx)) return idx;
    const index = path.join(resolvedBase, 'index' + ext);
    if (filePathSet.has(index)) return index;
  }
  return null;
}

function resolvePythonAbsolute(
  importStr: string,
  moduleNameMap: Map<string, string>
): string | null {


  if (moduleNameMap.has(importStr)) return moduleNameMap.get(importStr)!;


  const firstPart = importStr.split('.')[0];
  if (moduleNameMap.has(firstPart)) return moduleNameMap.get(firstPart)!;

  return null;
}

export function detectDeadExports(
  files: FileNode[],
  edges: DependencyEdge[]
): { file: string; name: string }[] {
  const importedFiles = new Set(edges.map(e => e.to));
  const dead: { file: string; name: string }[] = [];

  for (const file of files) {
    if (!importedFiles.has(file.path) && file.exports.length > 0) {
      for (const exp of file.exports) {
        if (exp !== 'default' && exp !== 'module.exports') {
          dead.push({ file: file.relativePath, name: exp });
        }
      }
    }
  }

  return dead;
}
