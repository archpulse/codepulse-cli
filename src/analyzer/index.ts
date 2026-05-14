import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
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
	calculateHotspots,
	getGitChurn,
	getTemporalCoupling,
	type TemporalCoupling,
} from "./git";
import {
	loadAnalysisCache,
	pruneAnalysisCache,
	saveAnalysisCache,
} from "./cache";
import { buildGraph, detectDeadExports } from "./graph";
import { readFileForAnalysis, scanFiles } from "./scanner";
import { runFastLinterChecks } from "../rules/fastLinter";
import { runSecurityChecks } from "../rules/security";

interface FileAnalysisJob {
	index: number;
	filePath: string;
}

interface FileAnalysisWorkerResult {
	index: number;
	file: FileNode | null;
}

const FILE_ANALYSIS_WORKER_ROLE = "file-analysis-worker";

if (
	!isMainThread &&
	parentPort &&
	workerData?.role === FILE_ANALYSIS_WORKER_ROLE
) {
	parentPort.on("message", async (job: FileAnalysisJob) => {
		try {
			const file = await analyzeFileEntry(job.filePath, workerData.dir);
			parentPort?.postMessage({ index: job.index, file });
		} catch {
			parentPort?.postMessage({ index: job.index, file: null });
		}
	});
}

function createEmptyCache(): AnalysisCache {
	return {
		fileNodes: new Map<string, FileNode>(),
	};
}

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

function createFastLinterContext(
	filePaths: string[],
	dir: string,
	config: ProjectConfig,
): AnalysisContext {
	return {
		files: filePaths.map((filePath) => ({
			path: filePath,
			relativePath: path.relative(dir, filePath),
			content: "",
			imports: [],
			exports: [],
			functions: [],
			lines: 0,
			complexity: 0,
			isGodFile: false,
		})),
		graph: new Map(),
		edges: [],
		config,
	};
}

function createSecurityContext(
	filePaths: string[],
	dir: string,
	config: ProjectConfig,
): AnalysisContext {
	return {
		files: filePaths.map((filePath) => ({
			path: filePath,
			relativePath: path.relative(dir, filePath),
			content: "",
			imports: [],
			exports: [],
			functions: [],
			lines: 0,
			complexity: 0,
			isGodFile: false,
		})),
		graph: new Map(),
		edges: [],
		config,
	};
}

function finalizeFileNode(
	result: FileNode,
	churnMap: Map<string, number>,
	config: ProjectConfig,
	mtime?: number,
	size?: number,
	cache?: AnalysisCache,
	filePath?: string,
): FileNode {
	if (mtime !== undefined) result.mtime = mtime;
	if (size !== undefined) result.size = size;
	result.churn = churnMap.get(result.relativePath) || 0;
	result.isGodFile =
		result.lines > (config.godFileLines || 500) ||
		result.imports.length > (config.godFileImports || 15);
	if (cache && filePath) cache.fileNodes.set(filePath, result);
	return result;
}

async function analyzeFileEntry(
	filePath: string,
	dir: string,
): Promise<FileNode | null> {
	try {
		const stats = await fs.promises.stat(filePath);
		const fileData = await readFileForAnalysis(filePath);
		if (!fileData.content) return null;
		const result = analyzeFile(filePath, dir, fileData.content);
		if (!result) return null;
		result.mtime = stats.mtimeMs;
		result.size = stats.size;
		return result;
	} catch (_err) {
		return null;
	}
}

async function processFilesSequentially(
	filePaths: string[],
	dir: string,
	churnMap: Map<string, number>,
	config: ProjectConfig,
	silent = false,
	cache?: AnalysisCache,
): Promise<FileNode[]> {
	const files: FileNode[] = [];
	let processed = 0;
	const total = filePaths.length;

	for (const filePath of filePaths) {
		const result = await analyzeAndFinalizeFile(
			filePath,
			dir,
			churnMap,
			config,
			cache,
		);
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

	async function analyzeAndFinalizeFile(
		filePath: string,
		dir: string,
		churnMap: Map<string, number>,
		config: ProjectConfig,
	cache?: AnalysisCache,
): Promise<FileNode | null> {
		try {
			const stats = await fs.promises.stat(filePath);
			if (cache?.fileNodes.has(filePath)) {
				const cached = cache.fileNodes.get(filePath)!;
				if (
					cached.mtime === stats.mtimeMs &&
					(cached.size === undefined || cached.size === stats.size)
				) {
					return finalizeFileNode(
						cached,
						churnMap,
						config,
						stats.mtimeMs,
						stats.size,
						cache,
						filePath,
					);
				}
			}

			const fileData = await readFileForAnalysis(filePath);
			if (!fileData.content) return null;

		const result = analyzeFile(filePath, dir, fileData.content);
		if (!result) return null;

		return finalizeFileNode(
			result,
			churnMap,
			config,
			stats.mtimeMs,
			stats.size,
			cache,
			filePath,
		);
	} catch {
		return null;
	}
}

function getWorkerCount(fileCount: number): number {
	if (fileCount <= 1) return 1;
	const available = os.availableParallelism?.() ?? os.cpus().length ?? 2;
	const clamped = Math.max(2, Math.min(24, available));
	return Math.min(clamped, fileCount);
}

async function processFilesWithWorkers(
	filePaths: string[],
	dir: string,
	churnMap: Map<string, number>,
	config: ProjectConfig,
	silent = false,
	cache?: AnalysisCache,
): Promise<FileNode[]> {
	const results: (FileNode | null)[] = new Array(filePaths.length).fill(null);
	const pendingJobs: FileAnalysisJob[] = [];
	let processed = 0;
	const total = filePaths.length;

	for (let index = 0; index < filePaths.length; index++) {
		const filePath = filePaths[index];
		try {
			const stats = await fs.promises.stat(filePath);
			if (cache?.fileNodes.has(filePath)) {
				const cached = cache.fileNodes.get(filePath)!;
				if (
					cached.mtime === stats.mtimeMs &&
					(cached.size === undefined || cached.size === stats.size)
				) {
					results[index] = finalizeFileNode(
						cached,
						churnMap,
						config,
						stats.mtimeMs,
						stats.size,
						cache,
						filePath,
					);
					processed++;
					if (!silent && (processed % 10 === 0 || processed === total)) {
						process.stdout.write(
							`\r  Analyzing files: ${processed}/${total}...`,
						);
					}
					continue;
				}
			}
			pendingJobs.push({ index, filePath });
		} catch {
			processed++;
			if (!silent && (processed % 10 === 0 || processed === total)) {
				process.stdout.write(`\r  Analyzing files: ${processed}/${total}...`);
			}
		}
	}

	const workerCount = getWorkerCount(pendingJobs.length);
	if (workerCount === 1) {
		for (const job of pendingJobs) {
			results[job.index] = await analyzeAndFinalizeFile(
				job.filePath,
				dir,
				churnMap,
				config,
				cache,
			);
			processed++;
			if (!silent && (processed % 10 === 0 || processed === total)) {
				process.stdout.write(`\r  Analyzing files: ${processed}/${total}...`);
			}
		}
		if (!silent) process.stdout.write("\n");
		return results.filter((file): file is FileNode => file !== null);
	}

	const workerPath = __filename;
	const workers: Worker[] = [];
	let nextJobIndex = 0;

	await new Promise<void>((resolve, reject) => {
		let settled = false;
		const finish = () => {
			if (settled) return;
			settled = true;
			Promise.allSettled(workers.map((worker) => worker.terminate()))
				.then(() => resolve())
				.catch(() => resolve());
		};
		const fail = (error: unknown) => {
			if (settled) return;
			settled = true;
			Promise.allSettled(workers.map((worker) => worker.terminate()))
				.then(() => reject(error))
				.catch(() => reject(error));
		};
		const scheduleNext = (worker: Worker) => {
			if (settled) return;
			const job = pendingJobs[nextJobIndex++];
			if (job) {
				worker.postMessage({ ...job, dir });
			}
		};

		try {
			for (let i = 0; i < workerCount; i++) {
				const worker = new Worker(workerPath, {
					workerData: { role: FILE_ANALYSIS_WORKER_ROLE, dir },
				});
				workers.push(worker);
				worker.on("message", (message: FileAnalysisWorkerResult) => {
					if (settled) return;
					if (message.file) {
						results[message.index] = finalizeFileNode(
							message.file,
							churnMap,
							config,
							message.file.mtime,
							message.file.size,
							cache,
							filePaths[message.index],
						);
					}
					processed++;
					if (!silent && (processed % 10 === 0 || processed === total)) {
						process.stdout.write(
							`\r  Analyzing files: ${processed}/${total}...`,
						);
					}
					if (processed >= total) {
						finish();
						return;
					}
					if (nextJobIndex < pendingJobs.length) {
						scheduleNext(worker);
					}
				});
				worker.on("error", fail);
				scheduleNext(worker);
			}
		} catch (error) {
			fail(error);
		}
	});

	if (!silent) process.stdout.write("\n");
	return results.filter((file): file is FileNode => file !== null);
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
	let cache = options.cache;
	if (!cache) {
		cache = await loadAnalysisCache(dir).catch(() => createEmptyCache());
	} else if (cache.fileNodes.size === 0) {
		const loaded = await loadAnalysisCache(dir).catch(() => createEmptyCache());
		for (const [filePath, node] of loaded.fileNodes) {
			cache.fileNodes.set(filePath, node);
		}
		if (loaded.gitChurn) cache.gitChurn = loaded.gitChurn;
		if (loaded.lastScanTime) cache.lastScanTime = loaded.lastScanTime;
	}

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
	pruneAnalysisCache(cache, filePaths);
	const fastLinterPromise = runFastLinterChecks(
		createFastLinterContext(filePaths, dir, config),
	);
	const securityPromise = runSecurityChecks(
		createSecurityContext(filePaths, dir, config),
	);

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

	let files: FileNode[];
	try {
		files =
			filePaths.length > 0
				? await processFilesWithWorkers(
						filePaths,
						dir,
						churnMap,
						config,
						silent,
						cache,
					)
				: [];
	} catch {
		files = await processFilesSequentially(
			filePaths,
			dir,
			churnMap,
			config,
			silent,
			cache,
		);
	}

	const { edges, graph, circularDependencies } = buildGraph(files, dir);
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
	const linterIssues = await fastLinterPromise.catch(() => []);
	const securityIssues = await securityPromise.catch(() => []);
	issues.push(...linterIssues);
	issues.push(...securityIssues);

	await saveAnalysisCache(dir, cache).catch(() => {});

	return {
		files,
		edges,
		graph,
		deadExports,
		godFiles,
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
