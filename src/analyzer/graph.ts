import * as fs from "node:fs";
import * as path from "node:path";
import type { DependencyEdge, FileNode, GraphNode } from "../types/analysis";

function createModuleMap(files: FileNode[]): Map<string, string> {
	const moduleNameMap = new Map<string, string>();
	for (const file of files) {
		const filePath = file.path;
		const lastSlash = filePath.lastIndexOf("/");
		const lastDot = filePath.lastIndexOf(".");
		const noExt = filePath.substring(
			lastSlash + 1,
			lastDot > lastSlash ? lastDot : filePath.length
		);
		const rel = file.relativePath;
		moduleNameMap.set(noExt, filePath);
		const relLastDot = rel.lastIndexOf(".");
		const relNoExt = relLastDot > -1 ? rel.substring(0, relLastDot) : rel;
		moduleNameMap.set(relNoExt, filePath);
	}
	return moduleNameMap;
}

function processFileImports(
	file: FileNode,
	isPython: boolean,
	filePathSet: Set<string>,
	moduleNameMap: Map<string, string>,
	baseDir: string,
	seenEdges: Set<string>,
	edges: DependencyEdge[],
) {
	for (const imp of file.imports) {
		let resolved: string | null = null;
		if (imp.startsWith(".") || imp.startsWith("@/")) {
			resolved = resolveRelative(
				file.path,
				imp,
				filePathSet,
				isPython,
				baseDir,
			);
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
		const isTypeFile = node.id.includes("/types/") || node.id.endsWith(".d.ts");
		node.isCritical =
			!isTypeFile && (node.centrality >= criticalThreshold || node.inDegree >= 5);
	}
}

export function findCycles(edges: DependencyEdge[]): string[][] {
	const adj = new Map<string, string[]>();
	for (const edge of edges) {
		const list = adj.get(edge.from) || [];
		list.push(edge.to);
		adj.set(edge.from, list);
	}

	const cycles: string[][] = [];
	const visited = new Set<string>();
	const recStack = new Set<string>();
	const path: string[] = [];

	function dfs(v: string) {
		visited.add(v);
		recStack.add(v);
		path.push(v);

		const neighbors = adj.get(v) || [];
		for (const neighbor of neighbors) {
			if (!visited.has(neighbor)) {
				dfs(neighbor);
			} else if (recStack.has(neighbor)) {
				// Cycle detected
				const cycleStartIdx = path.indexOf(neighbor);
				if (cycleStartIdx !== -1) {
					cycles.push([...path.slice(cycleStartIdx), neighbor]);
				}
			}
		}

		recStack.delete(v);
		path.pop();
	}

	for (const node of adj.keys()) {
		if (!visited.has(node)) {
			dfs(node);
		}
	}

	return cycles;
}

export function buildGraph(
	files: FileNode[],
	baseDir: string,
): {
	edges: DependencyEdge[];
	graph: Map<string, GraphNode>;
	circularDependencies: string[][];
} {
	const filePathSet = new Set(files.map((f) => f.path));
	const moduleNameMap = createModuleMap(files);

	const edges: DependencyEdge[] = [];
	const seenEdges = new Set<string>();

	for (const file of files) {
		const isPython = file.path.endsWith(".py");
		processFileImports(
			file,
			isPython,
			filePathSet,
			moduleNameMap,
			baseDir,
			seenEdges,
			edges,
		);
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

	const circularDependencies = findCycles(edges);

	return { edges, graph, circularDependencies };
}

let cachedSearchBase: string | null = null;

function getSearchBase(baseDir: string): string {
	if (cachedSearchBase) return cachedSearchBase;
	const appSrc = path.join(baseDir, "app", "src");
	const rootSrc = path.join(baseDir, "src");
	cachedSearchBase = fs.existsSync(appSrc)
		? appSrc
		: fs.existsSync(rootSrc)
			? rootSrc
			: baseDir;
	return cachedSearchBase;
}

function resolveRelative(
	fromFile: string,
	importPath: string,
	filePathSet: Set<string>,
	isPython: boolean,
	baseDir: string,
): string | null {
	const extensions = isPython
		? [".py", ""]
		: [".ts", ".tsx", ".js", ".jsx", ""];

	let resolvedBase: string;

	if (importPath.startsWith("@/")) {
		// Handle @/ alias common in Vite/Next.js
		const searchBase = getSearchBase(baseDir);
		resolvedBase = path.resolve(searchBase, importPath.slice(2));
	} else if (importPath.startsWith(".")) {
		const dir = path.dirname(fromFile);
		resolvedBase = path.resolve(dir, importPath);
	} else {
		return null;
	}

	for (const ext of extensions) {
		if (filePathSet.has(resolvedBase + ext)) return resolvedBase + ext;
		const idx = path.join(resolvedBase, `__init__${ext}`);
		if (filePathSet.has(idx)) return idx;
		const index = path.join(resolvedBase, `index${ext}`);
		if (filePathSet.has(index)) return index;
	}
	return null;
}

function resolvePythonAbsolute(
	importStr: string,
	moduleNameMap: Map<string, string>,
): string | null {
	if (moduleNameMap.has(importStr)) return moduleNameMap.get(importStr)!;

	const firstPart = importStr.split(".")[0];
	if (moduleNameMap.has(firstPart)) return moduleNameMap.get(firstPart)!;

	return null;
}

export function detectDeadExports(
	files: FileNode[],
	edges: DependencyEdge[],
): { file: string; name: string }[] {
	const importedFiles = new Set(edges.map((e) => e.to));
	const dead: { file: string; name: string }[] = [];

	for (const file of files) {
		// Python and most generic languages do not have reliable symbol-level
		// export metadata here, so file-level import reachability would produce
		// massive false positives. Restrict dead-export detection to module
		// systems where our import graph is meaningful enough.
		if (!/\.(?:[cm]?jsx?|tsx?)$/i.test(file.path)) continue;

		if (!importedFiles.has(file.path) && file.exports.length > 0) {
			for (const exp of file.exports) {
				if (exp !== "default" && exp !== "module.exports") {
					dead.push({ file: file.relativePath, name: exp });
				}
			}
		}
	}

	return dead;
}
