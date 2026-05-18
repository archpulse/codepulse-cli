import { isMainThread, parentPort, workerData } from "node:worker_threads";
import { runRules } from "../rules";
import type {
	AnalysisCache,
	AnalysisResult,
	FileNode,
} from "../types/analysis";
import type { ScanOptions } from "../types/config";
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
import { scanFiles } from "./scanner";
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
		silent?: boolean;
		cache?: AnalysisCache;
	} = {},
): Promise<AnalysisResult> {
	const config = loadConfig(dir, options);
	const silent = options.silent || false;
	const cache = await initializeCache(dir, options.cache);

	const scanOptions = getScanOptions(dir, config);
	const filePaths = scanFiles(scanOptions);
	pruneAnalysisCache(cache, filePaths);

	const fastLinterPromise = runFastLinterChecks(
		createFastLinterContext(filePaths, dir, config),
	);
	const securityPromise = runSecurityChecks(
		createSecurityContext(filePaths, dir, config),
	);

	const churnMap = await getChurnMap(dir, cache);
	const files = await runFileAnalysis(
		filePaths,
		dir,
		churnMap,
		config,
		silent,
		cache,
	);

	const { edges, graph, circularDependencies } = buildGraph(files, dir);
	const deadExports = detectDeadExports(files, edges);
	const hotspots = calculateHotspots(files);
	const temporalCouplings = options.pro ? getTemporalCoupling(dir) : undefined;

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
		{ files, graph, edges, config },
		{ strict: options.strict },
		externalRules,
	);

	const [linterIssues, securityIssues] = await Promise.all([
		fastLinterPromise.catch(() => []),
		securityPromise.catch(() => []),
	]);

	issues.push(...linterIssues, ...securityIssues);
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

function getScanOptions(dir: string, config: any): ScanOptions {
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
	config: any,
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
		node.isCritical = node.inDegree >= threshold;
	}
}
