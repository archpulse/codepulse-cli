import * as fs from "node:fs";
import * as path from "node:path";
import { isMainThread, parentPort, workerData } from "node:worker_threads";
import { runRules } from "../rules";
import type {
	AnalysisCache,
	AnalysisResult,
	FileNode,
} from "../types/analysis";
import type { ProjectConfig, ScanOptions } from "../types/config";
import { loadPlugins } from "../utils/plugins";
import {
	calculateHotspots,
	getGitChurn,
	getTemporalCoupling,
} from "./git";
import {
	loadAnalysisCache,
	pruneAnalysisCache,
	saveAnalysisCache,
} from "./cache";
import { buildGraph, detectDeadExports } from "./graph";
import { scanFilesAsync } from "./scanner";
import { runFastLinterChecks } from "../rules/fastLinter";
import { runSecurityChecks } from "../rules/security";
import {
	analyzeFileEntry,
	FILE_ANALYSIS_WORKER_ROLE,
	processFilesSequentially,
	processFilesWithWorkers,
} from "./workers";
import {
	createEmptyCache,
	createFastLinterContext,
	createSecurityContext,
	loadConfig,
} from "./context";

if (
	!isMainThread &&
	parentPort &&
	workerData?.role === FILE_ANALYSIS_WORKER_ROLE
) {
	parentPort.on("message", async (job: any) => {
		try {
			const file = await analyzeFileEntry(job.filePath, workerData.dir);
			parentPort?.postMessage({ index: job.index, file });
		} catch {
			parentPort?.postMessage({ index: job.index, file: null });
		}
	});
}

export async function analyze(
	dir: string,
	options: {
		pro?: boolean;
		strict?: boolean;
		precision?: boolean | "auto";
		silent?: boolean;
		cache?: AnalysisCache;
	} = {},
): Promise<AnalysisResult> {
	const absDir = path.resolve(dir);
	const config = loadConfig(absDir, options);
	const silent = options.silent || false;
	const cache = await initializeCache(absDir, options.cache);

	const scanOptions = getScanOptions(absDir, config);
	const filePaths = await scanFilesAsync(scanOptions);
	pruneAnalysisCache(cache, filePaths);

	// Resolve auto precision
	const resolvedPrecision = config.precision === "auto"
		? (detectEslintConfig(absDir) && isJsTsProject(filePaths))
		: !!config.precision;

	config.precision = resolvedPrecision;

	// Memory optimization: run expensive tasks sequentially to reduce peak RSS
	const churnMap = await getChurnMap(absDir, cache);
	
	const files = await runFileAnalysis(
		filePaths,
		absDir,
		churnMap,
		config,
		silent,
		cache,
	);
	
	const unparsedFiles = filePaths.filter(p => !files.some(f => f.path === p));

	const fastLinterIssues = await runFastLinterChecks(
		createFastLinterContext(filePaths, absDir, config),
	).catch(() => []);

	const securityIssues = await runSecurityChecks(
		createSecurityContext(filePaths, absDir, config),
	).catch(() => []);

	const { edges, graph, circularDependencies } = buildGraph(files, absDir);
	const deadExports = detectDeadExports(files, edges);
	const hotspots = calculateHotspots(files);
	const temporalCouplings = options.pro ? getTemporalCoupling(absDir) : undefined;

	updateCriticalNodes(graph, config.criticalNodeThreshold || 10);

	const criticalFiles = [...graph.values()]
		.filter((n) => n.isCritical)
		.sort((a, b) => b.centrality - a.centrality);

	const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
	const avgComplexity = files.length
		? files.reduce((sum, f) => sum + f.complexity, 0) / files.length
		: 0;

	const externalRules = await loadPlugins();
	const issues = runRules(
		{ files, graph, edges, config, circularDependencies },
		{ strict: options.strict },
		externalRules,
	);

	issues.push(...fastLinterIssues, ...securityIssues);
	await saveAnalysisCache(dir, cache).catch(() => {});

	return {
		files,
		edges,
		graph,
		deadExports,
		godFiles: files.filter((f) => f.isGodFile),
		criticalFiles,
		circularDependencies,
		hotspots,
		temporalCouplings,
		totalFiles: files.length,
		totalLines,
		avgComplexity,
		issues,
		resolvedPrecision,
		unparsedFiles,
	};
}

async function initializeCache(
	dir: string,
	providedCache?: AnalysisCache,
): Promise<AnalysisCache> {
	if (!providedCache) {
		return loadAnalysisCache(dir).catch(() => createEmptyCache());
	}

	if (providedCache.fileNodes.size === 0) {
		const loaded = await loadAnalysisCache(dir).catch(() => createEmptyCache());
		for (const [filePath, node] of loaded.fileNodes) {
			providedCache.fileNodes.set(filePath, node);
		}
		if (loaded.gitChurn) providedCache.gitChurn = loaded.gitChurn;
		if (loaded.lastScanTime) providedCache.lastScanTime = loaded.lastScanTime;
	}
	return providedCache;
}

function getScanOptions(dir: string, config: ProjectConfig): ScanOptions {
	return {
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
}

async function getChurnMap(
	dir: string,
	cache: AnalysisCache,
): Promise<Map<string, number>> {
	if (cache.gitChurn && Date.now() - (cache.lastScanTime || 0) < 60000) {
		return cache.gitChurn;
	}
	const churnMap = getGitChurn(dir);
	cache.gitChurn = churnMap;
	cache.lastScanTime = Date.now();
	return churnMap;
}

async function runFileAnalysis(
	filePaths: string[],
	dir: string,
	churnMap: Map<string, number>,
	config: ProjectConfig,
	silent: boolean,
	cache: AnalysisCache,
): Promise<FileNode[]> {
	if (filePaths.length === 0) return [];
	try {
		return await processFilesWithWorkers(
			filePaths,
			dir,
			churnMap,
			config,
			__filename,
			silent,
			cache,
		);
	} catch {
		return await processFilesSequentially(
			filePaths,
			dir,
			churnMap,
			config,
			silent,
			cache,
		);
	}
}

function updateCriticalNodes(graph: Map<string, any>, threshold: number) {
	for (const node of graph.values()) {
		const isTypeFile = node.id.includes("/types/") || node.id.endsWith(".d.ts");
		node.isCritical = !isTypeFile && (node.inDegree >= threshold);
	}
}

function detectEslintConfig(dir: string): boolean {
	const configFiles = [
		".eslintrc.js",
		".eslintrc.cjs",
		".eslintrc.mjs",
		".eslintrc.yaml",
		".eslintrc.yml",
		".eslintrc.json",
		".eslintrc",
		"eslint.config.js",
		"eslint.config.mjs",
		"eslint.config.cjs",
	];

	if (configFiles.some((f) => fs.existsSync(path.join(dir, f)))) {
		return true;
	}

	const pkgPath = path.join(dir, "package.json");
	if (fs.existsSync(pkgPath)) {
		try {
			const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
			if (pkg.eslintConfig) return true;
		} catch {
			// Ignore parse errors
		}
	}

	return false;
}

function isJsTsProject(filePaths: string[]): boolean {
	return filePaths.some((p) => /\.(js|ts|jsx|tsx|mjs|cjs)$/i.test(p));
}
