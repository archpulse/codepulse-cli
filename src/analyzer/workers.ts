import * as fs from "node:fs";
import * as os from "node:os";
import { Worker } from "node:worker_threads";
import type { AnalysisCache, FileNode } from "../types/analysis";
import type { ProjectConfig } from "../types/config";
import { analyzeFile } from "./ast";
import { readFileForAnalysis } from "./scanner";

export interface FileAnalysisJob {
	index: number;
	filePath: string;
}

export interface FileAnalysisWorkerResult {
	index: number;
	file: FileNode | null;
}

export const FILE_ANALYSIS_WORKER_ROLE = "file-analysis-worker";

export function getWorkerCount(fileCount: number): number {
	if (fileCount <= 1) return 1;
	const available = os.availableParallelism?.() ?? os.cpus().length ?? 2;
	const clamped = Math.max(2, Math.min(24, available));
	return Math.min(clamped, fileCount);
}

export function finalizeFileNode(
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

export async function analyzeFileEntry(
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
	} catch {
		return null;
	}
}

export async function analyzeAndFinalizeFile(
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

export async function processFilesSequentially(
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

export async function processFilesWithWorkers(
	filePaths: string[],
	dir: string,
	churnMap: Map<string, number>,
	config: ProjectConfig,
	workerPath: string,
	silent = false,
	cache?: AnalysisCache,
): Promise<FileNode[]> {
	const results: (FileNode | null)[] = Array.from({ length: filePaths.length }) as (FileNode | null)[];
	results.fill(null);
	const { pendingJobs, processedCount } = prepareJobs(
		filePaths,
		results,
		churnMap,
		config,
		cache,
		silent,
	);

	let processed = processedCount;
	const total = filePaths.length;

	const workerCount = getWorkerCount(pendingJobs.length);
	if (workerCount === 1) {
		return runJobsSequentially(
			pendingJobs,
			results,
			dir,
			churnMap,
			config,
			cache,
			silent,
			processed,
			total,
		);
	}

	await runJobsInParallel(
		pendingJobs,
		results,
		dir,
		churnMap,
		config,
		cache,
		workerPath,
		workerCount,
		silent,
		processed,
		total,
		filePaths,
	);

	if (!silent) process.stdout.write("\n");
	return results.filter((file): file is FileNode => file !== null);
}

function prepareJobs(
	filePaths: string[],
	results: (FileNode | null)[],
	churnMap: Map<string, number>,
	config: ProjectConfig,
	cache: AnalysisCache | undefined,
	silent: boolean,
) {
	const pendingJobs: FileAnalysisJob[] = [];
	let processedCount = 0;
	const total = filePaths.length;

	for (let index = 0; index < filePaths.length; index++) {
		const filePath = filePaths[index];
		try {
			const stats = fs.statSync(filePath);
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
					processedCount++;
					updateProgress(silent, processedCount, total);
					continue;
				}
			}
			pendingJobs.push({ index, filePath });
		} catch {
			processedCount++;
			updateProgress(silent, processedCount, total);
		}
	}
	return { pendingJobs, processedCount };
}

async function runJobsSequentially(
	pendingJobs: FileAnalysisJob[],
	results: (FileNode | null)[],
	dir: string,
	churnMap: Map<string, number>,
	config: ProjectConfig,
	cache: AnalysisCache | undefined,
	silent: boolean,
	processed: number,
	total: number,
): Promise<FileNode[]> {
	let currentProcessed = processed;
	for (const job of pendingJobs) {
		results[job.index] = await analyzeAndFinalizeFile(
			job.filePath,
			dir,
			churnMap,
			config,
			cache,
		);
		currentProcessed++;
		updateProgress(silent, currentProcessed, total);
	}
	if (!silent) process.stdout.write("\n");
	return results.filter((file): file is FileNode => file !== null);
}

async function runJobsInParallel(
	pendingJobs: FileAnalysisJob[],
	results: (FileNode | null)[],
	dir: string,
	churnMap: Map<string, number>,
	config: ProjectConfig,
	cache: AnalysisCache | undefined,
	workerPath: string,
	workerCount: number,
	silent: boolean,
	processed: number,
	total: number,
	filePaths: string[],
): Promise<void> {
	const workers: Worker[] = [];
	let nextJobIndex = 0;
	let currentProcessed = processed;

	return new Promise<void>((resolve, reject) => {
		let settled = false;
		const finish = () => {
			if (settled) return;
			settled = true;
			Promise.allSettled(workers.map((worker) => worker.terminate())).finally(
				() => resolve(),
			);
		};
		const fail = (error: unknown) => {
			if (settled) return;
			settled = true;
			Promise.allSettled(workers.map((worker) => worker.terminate())).finally(
				() => reject(error),
			);
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
					currentProcessed++;
					updateProgress(silent, currentProcessed, total);
					if (currentProcessed >= total) {
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
}

function updateProgress(silent: boolean, processed: number, total: number) {
	if (!silent && (processed % 10 === 0 || processed === total)) {
		process.stdout.write(`\r  Analyzing files: ${processed}/${total}...`);
	}
}
