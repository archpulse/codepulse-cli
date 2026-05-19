import { exec as execCallback, execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";
import type { AnalysisContext, Issue } from "../../types/analysis";

export const LINTER_MAX_BUFFER = 50 * 1024 * 1024;
export const execAsync = promisify(execCallback);

export type CommandResult = {
	output: string;
	failure: unknown;
};

export function parseLinterJson<T>(output: string): T | null {
	const text = output.trim();
	if (!text) return null;

	try {
		return JSON.parse(text) as T;
	} catch {
		// Fall through to embedded JSON extraction.
	}

	const candidates = extractJsonCandidates(text);
	for (const candidate of candidates) {
		try {
			return JSON.parse(candidate) as T;
		} catch {
			// Try the next candidate.
		}
	}

	return null;
}

function extractJsonCandidates(text: string): string[] {
	const candidates: string[] = [];

	const objectStart = text.indexOf("{");
	const objectEnd = text.lastIndexOf("}");
	if (objectStart !== -1 && objectEnd > objectStart) {
		candidates.push(text.slice(objectStart, objectEnd + 1));
	}

	const arrayStart = text.indexOf("[");
	const arrayEnd = text.lastIndexOf("]");
	if (arrayStart !== -1 && arrayEnd > arrayStart) {
		candidates.push(text.slice(arrayStart, arrayEnd + 1));
	}

	return candidates;
}

export function hasAnyFile(context: AnalysisContext, extensions: string[]): boolean {
	return context.files.some((file) =>
		extensions.some((ext) => file.relativePath.toLowerCase().endsWith(ext)),
	);
}

function getLocalBinPaths(startDir: string): string[] {
	const paths: string[] = [];
	let current = startDir;
	while (current !== path.dirname(current)) {
		const localPath = path.join(current, "node_modules", ".bin");
		if (fs.existsSync(localPath)) {
			paths.push(localPath);
		}
		current = path.dirname(current);
	}
	return paths;
}

export function runCommandSync(command: string, cwd: string): CommandResult {
	const env = { ...process.env };
	const localBins = getLocalBinPaths(cwd);
	if (localBins.length > 0) {
		env.PATH = `${localBins.join(path.delimiter)}${path.delimiter}${env.PATH || ""}`;
	}

	try {
		return {
			output: execSync(command, {
				cwd,
				env,
				encoding: "utf-8",
				stdio: ["ignore", "pipe", "pipe"],
				maxBuffer: LINTER_MAX_BUFFER,
			}),
			failure: null,
		};
	} catch (e: any) {
		return {
			output: `${e.stdout || ""}${e.stderr ? `\n${e.stderr}` : ""}`,
			failure: e,
		};
	}
}

export async function runCommandAsync(
	command: string,
	cwd: string,
): Promise<CommandResult> {
	const env = { ...process.env };
	const localBins = getLocalBinPaths(cwd);
	if (localBins.length > 0) {
		env.PATH = `${localBins.join(path.delimiter)}${path.delimiter}${env.PATH || ""}`;
	}

	try {
		const { stdout } = await execAsync(command, {
			cwd,
			env,
			maxBuffer: LINTER_MAX_BUFFER,
			encoding: "utf-8",
		});
		return {
			output: stdout,
			failure: null,
		};
	} catch (e: any) {
		return {
			output: `${e.stdout || ""}${e.stderr ? `\n${e.stderr}` : ""}`,
			failure: e,
		};
	}
}

export function buildFailureIssue(
	tool: string,
	rootDir: string,
	command: string,
	failure: unknown,
): Issue {
	const err = failure as {
		message?: string;
		stderr?: string;
		stdout?: string;
		status?: number | null;
		signal?: NodeJS.Signals | null;
	};
	const text = `${err.stderr || err.stdout || err.message || "unknown failure"}`;
	const reason = normalizeFailureReason(text, err.status, err.signal);
	const cwdName = path.basename(rootDir);

	return {
		type: "linter",
		file: cwdName || tool.toLowerCase(),
		line: 0,
		message: `[${tool}] failed to complete: ${reason}`,
		context: [
			`tool: ${tool}`,
			`cwd: ${rootDir}`,
			`cwd_name: ${cwdName}`,
			`command: ${command}`,
			err.status !== null && err.status !== undefined
				? `exit_code: ${err.status}`
				: null,
			err.signal ? `signal: ${err.signal}` : null,
			text.trim() ? `stderr_stdout: ${trimDebugText(text)}` : null,
		]
			.filter(Boolean)
			.join("\n"),
		severity: "warning",
	};
}

function trimDebugText(text: string): string {
	const compact = text.replace(/\s+/g, " ").trim();
	return compact.length > 400 ? `${compact.slice(0, 400)}…` : compact;
}

function normalizeFailureReason(
	text: string,
	status?: number | null,
	signal?: NodeJS.Signals | null,
): string {
	const lower = text.toLowerCase();
	if (
		lower.includes("killed") ||
		lower.includes("out of memory") ||
		lower.includes("oom")
	) {
		return "process was killed, likely due to memory pressure";
	}
	if (signal) return `terminated by signal ${signal}`;
	if (status !== null && status !== undefined) {
		return `exited with code ${status}`;
	}
	return text.trim() || "unknown failure";
}

export function resolveBinaryPath(cmd: string, startDir: string): string {
	let current = startDir;
	while (current !== path.dirname(current)) {
		const localPath = path.join(current, "node_modules", ".bin", cmd);
		if (fs.existsSync(localPath)) {
			return localPath;
		}
		current = path.dirname(current);
	}

	try {
		execSync(`${cmd} --version`, { stdio: "ignore" });
		return cmd;
	} catch {
		return cmd;
	}
}

export interface LinterConfig {
	name: string;
	extensions: string[];
	command: string;
	processOutput: (
		output: string,
		failure: unknown,
		rootDir: string,
		command: string,
	) => Issue[];
}

export async function runGenericLinterAsync(
	rootDir: string,
	context: AnalysisContext,
	config: LinterConfig,
): Promise<Issue[]> {
	if (!hasAnyFile(context, config.extensions)) return [];
	const { output, failure } = await runCommandAsync(config.command, rootDir);
	return config.processOutput(output, failure, rootDir, config.command);
}

export function runGenericLinterSync(
	rootDir: string,
	context: AnalysisContext,
	config: LinterConfig,
	issues: Issue[],
) {
	if (!hasAnyFile(context, config.extensions)) return;
	const { output, failure } = runCommandSync(config.command, rootDir);
	const newIssues = config.processOutput(
		output,
		failure,
		rootDir,
		config.command,
	);
	issues.push(...newIssues);
}

