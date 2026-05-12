import * as fs from "node:fs";
import * as path from "node:path";
import { runRules } from "../rules";
import type {
	AnalysisCache,
	AnalysisContext,
	AnalysisResult,
	FileNode,
	ProjectConfig,
	ScanOptions,
} from "../types/index";
import { loadPlugins } from "../utils/plugins";
import { analyzeFile } from "./ast";
import {
	type TemporalCoupling,
	calculateHotspots,
	getGitChurn,
	getTemporalCoupling,
} from "./git";
import { buildGraph, detectDeadExports } from "./graph";
import { scanFiles } from "./scanner";

function loadConfig(dir: string, options: { strict?: boolean }): ProjectConfig {
	let config: ProjectConfig = {
		maxComplexity: options.strict ? 10 : 20,
		godFileLines: 500,
		godFileImports: 15,
		criticalNodeThreshold: 10,
		duplicationThreshold: 15,
		exclude: [],
	};

	const configPath = path.join(dir, ".codepulse.json");
	if (fs.existsSync(configPath)) {
		try {
			const userConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
			config = { ...config, ...userConfig };
		} catch (_err) {
			console.warn("Failed to parse .codepulse.json, using defaults.");
		}
	}
	return config;
}

function processSingleFile(
	filePath: string,
	dir: string,
	churnMap: Map<string, number>,
	config: ProjectConfig,
	cache?: AnalysisCache,
): FileNode | null {
	try {
		const mtime = fs.statSync(filePath).mtimeMs;
		let result: FileNode | null = null;

		if (cache?.fileNodes.has(filePath)) {
			const cached = cache.fileNodes.get(filePath)!;
			if (cached.mtime === mtime) {
				result = cached;
			}
		}

		if (!result) {
			result = analyzeFile(filePath, dir);
			if (result) {
				result.mtime = mtime;
				if (cache) cache.fileNodes.set(filePath, result);
			}
		}

		if (result) {
			const rel = result.relativePath;
			result.churn = churnMap.get(rel) || 0;
			result.isGodFile =
				result.lines > (config.godFileLines || 500) ||
				result.imports.length > (config.godFileImports || 15);
		}
		return result;
	} catch (_err) {
		return null;
	}
}

function processFiles(
	filePaths: string[],
	dir: string,
	churnMap: Map<string, number>,
	config: ProjectConfig,
	silent = false,
	cache?: AnalysisCache,
): FileNode[] {
	const files: FileNode[] = [];
	let processed = 0;
	const total = filePaths.length;

	for (const filePath of filePaths) {
		const result = processSingleFile(filePath, dir, churnMap, config, cache);
		if (result) {
			files.push(result);
		}
		processed++;
		if (!silent && (processed % 10 === 0 || processed === total)) {
			process.stdout.write(`\r  Analyzing files: ${processed}/${total}...`);
		}
	}
	if (!silent) process.stdout.write("\n");
	return files;
}

export async function analyze(
	dir: string,
	options: {
		pro?: boolean;
		strict?: boolean;
		silent?: boolean;
		cache?: AnalysisCache;
	} = {},
): Promise<AnalysisResult> {
	const config = loadConfig(dir, options);
	const silent = options.silent || false;
	const cache = options.cache;

	const scanOptions: ScanOptions = {
		dir,
		extensions: [
			".ts",
			".tsx",
			".js",
			".jsx",
			".py",
			".java",
			".cpp",
			".c",
			".cs",
			".lua",
			".css",
			".scss",
			".html",
		],
		exclude: [
			"node_modules",
			".git",
			"dist",
			"build",
			"coverage",
			"__pycache__",
			".codepulse-report",
			"*.min.js",
			"*.test.ts",
			"*.spec.ts",
			...(config.exclude || []),
		],
	};

	const filePaths = scanFiles(scanOptions);

	let churnMap: Map<string, number>;
	if (cache?.gitChurn && Date.now() - (cache.lastScanTime || 0) < 60000) {
		churnMap = cache.gitChurn;
	} else {
		churnMap = getGitChurn(dir);
		if (cache) {
			cache.gitChurn = churnMap;
			cache.lastScanTime = Date.now();
		}
	}

	const files = processFiles(filePaths, dir, churnMap, config, silent, cache);

	const { edges, graph } = buildGraph(files, dir);
	const deadExports = detectDeadExports(files, edges);
	const godFiles = files.filter((f) => f.isGodFile);
	const hotspots = calculateHotspots(files);
	let temporalCouplings: TemporalCoupling[] | undefined;

	if (options.pro) {
		temporalCouplings = getTemporalCoupling(dir);
	}

	for (const node of graph.values()) {
		node.isCritical = node.inDegree >= (config.criticalNodeThreshold || 10);
	}

	const criticalFiles = [...graph.values()]
		.filter((n) => n.isCritical)
		.sort((a, b) => b.centrality - a.centrality);

	const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
	const avgComplexity = files.length
		? files.reduce((sum, f) => sum + f.complexity, 0) / files.length
		: 0;

	const context: AnalysisContext = { files, graph, edges, config };
	const externalRules = await loadPlugins();
	const issues = runRules(context, { strict: options.strict }, externalRules);

	return {
		files,
		edges,
		graph,
		deadExports,
		godFiles,
		criticalFiles,
		hotspots,
		temporalCouplings,
		totalFiles: files.length,
		totalLines,
		avgComplexity,
		issues,
	};
}
