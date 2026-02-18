import * as path from 'path';
import { FileNode, DependencyEdge, GraphNode } from '../types';

export function buildGraph(
  files: FileNode[],
  baseDir: string
): { edges: DependencyEdge[]; graph: Map<string, GraphNode> } {
  const filePathSet = new Set(files.map(f => f.path));

  // Build a map: module name → file path (for Python-style imports)
  const moduleNameMap = new Map<string, string>();
  for (const file of files) {
    // e.g. "commands" → "/project/commands.py"
    const noExt = path.basename(file.path, path.extname(file.path));
    const rel = file.relativePath.replace(/\\/g, '/');
    // store both basename and relative path without extension
    moduleNameMap.set(noExt, file.path);
    const relNoExt = rel.replace(/\.[^.]+$/, '');
    moduleNameMap.set(relNoExt, file.path);
    // also store directory __init__ style: "core.utils" → "core/utils.py"
    moduleNameMap.set(relNoExt.replace(/\//g, '.'), file.path);
  }

  const edges: DependencyEdge[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    const ext = path.extname(file.path);
    const isPython = ext === '.py';

    for (const imp of file.imports) {
      let resolved: string | null = null;

      if (imp.startsWith('.')) {
        // Relative import (JS/TS or Python relative)
        resolved = resolveRelative(file.path, imp, filePathSet, isPython);
      } else if (isPython) {
        // Python absolute import: try matching by module name
        resolved = resolvePythonAbsolute(imp, moduleNameMap);
      }

      if (resolved && resolved !== file.path) {
        const key = `${file.path}→${resolved}`;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push({ from: file.path, to: resolved });
        }
      }
    }
  }

  // Build graph nodes
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

  let maxCentrality = 0;
  for (const node of graph.values()) {
    node.centrality = node.inDegree * node.outDegree + node.inDegree;
    if (node.centrality > maxCentrality) maxCentrality = node.centrality;
  }

  const criticalThreshold = Math.max(3, maxCentrality * 0.6);
  for (const node of graph.values()) {
    node.isCritical = node.centrality >= criticalThreshold || node.inDegree >= 5;
  }

  return { edges, graph };
}

function resolveRelative(
  fromFile: string,
  importPath: string,
  filePathSet: Set<string>,
  isPython: boolean
): string | null {
  const dir = path.dirname(fromFile);
  const extensions = isPython
    ? ['.py', '']
    : ['.ts', '.tsx', '.js', '.jsx', ''];
  const base = path.resolve(dir, importPath);

  for (const ext of extensions) {
    if (filePathSet.has(base + ext)) return base + ext;
    const idx = path.join(base, '__init__' + ext);
    if (filePathSet.has(idx)) return idx;
    const index = path.join(base, 'index' + ext);
    if (filePathSet.has(index)) return index;
  }
  return null;
}

function resolvePythonAbsolute(
  importStr: string,
  moduleNameMap: Map<string, string>
): string | null {
  // "from commands import X" → importStr = "commands"
  // "from core.utils import X" → importStr = "core.utils"
  if (moduleNameMap.has(importStr)) return moduleNameMap.get(importStr)!;

  // Try first component: "from os.path import X" → skip stdlib
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
