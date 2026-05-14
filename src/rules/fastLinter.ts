import { exec as execCallback, execSync } from "node:child_process";
import * as path from "node:path";
import { promisify } from "node:util";
import type { AnalysisContext, Issue, Rule } from "../types/index";

const LINTER_MAX_BUFFER = 50 * 1024 * 1024;
const execAsync = promisify(execCallback);

type CommandResult = {
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

export class FastLinterRule implements Rule {
	name = "fast-linter";
	description =
		"Runs ultra-fast external linters for multiple languages (Ruff, Oxlint, Cppcheck, Luacheck, ShellCheck, GolangCI)";

	run(context: AnalysisContext): Issue[] {
		const issues: Issue[] = [];
		const rootDir = context.config.rootDir || process.cwd();

		if (this.isCommandAvailable("ruff")) this.runRuff(rootDir, issues);
		if (this.isCommandAvailable("oxlint")) this.runOxlint(rootDir, issues);
		if (this.isCommandAvailable("shellcheck"))
			this.runShellCheck(rootDir, context, issues);
		if (this.isCommandAvailable("cppcheck"))
			this.runCppcheck(rootDir, context, issues);
		if (this.isCommandAvailable("golangci-lint"))
			this.runGoLint(rootDir, context, issues);
		if (this.isCommandAvailable("luacheck"))
			this.runLuacheck(rootDir, context, issues);

		return issues;
	}

	private isCommandAvailable(cmd: string): boolean {
		try {
			execSync(`${cmd} --version`, { stdio: "ignore" });
			return true;
		} catch {
			return false;
		}
	}

	private runRuff(rootDir: string, issues: Issue[]) {
		const { output, failure } = this.runCommand(
			"ruff check . --output-format json --quiet",
			rootDir,
		);
		const data = parseLinterJson<any[]>(output);
		if (Array.isArray(data)) {
			for (const ri of data) {
				issues.push({
					type: "linter",
					file: ri.filename,
					line: ri.location.row,
					message: `[Ruff] ${ri.code}: ${ri.message}`,
					severity: "warning",
					suggestion: ri.fix
						? 'Run "ruff check --fix" to fix this issue.'
						: undefined,
				});
			}
		}
		if (failure && !data) {
			this.reportFailure(
				"Ruff",
				rootDir,
				"ruff check . --output-format json --quiet",
				failure,
				issues,
			);
		}
	}

	private runOxlint(rootDir: string, issues: Issue[]) {
		const { output, failure } = this.runCommand("oxlint . --format json", rootDir);
		const data = parseLinterJson<{ diagnostics?: any[] }>(output);
		if (data?.diagnostics) {
			for (const d of data.diagnostics) {
				let message = d.message;
				if (d.help && d.help.length > message.length) message = d.help;
				const label = d.labels?.[0];
				const line = label?.span?.line || 0;

				issues.push({
					type: "linter",
					file: d.filename || "unknown",
					line,
					message: `[Oxlint] ${d.code}: ${message}`,
					severity: d.severity === "error" ? "error" : "warning",
				});
			}
		}
		if (failure && !data) {
			this.reportFailure(
				"Oxlint",
				rootDir,
				"oxlint . --format json",
				failure,
				issues,
			);
		}
	}

	private runShellCheck(
		rootDir: string,
		context: AnalysisContext,
		issues: Issue[],
	) {
		const shFiles = context.files
			.filter((f) => f.relativePath.endsWith(".sh"))
			.map((f) => `"${f.relativePath}"`);

		if (shFiles.length === 0) return;

		const command = `shellcheck -f json ${shFiles.join(" ")}`;
		const { output, failure } = this.runCommand(command, rootDir);
		const data = parseLinterJson<any[]>(output);
		if (Array.isArray(data)) {
			for (const si of data) {
				issues.push({
					type: "linter",
					file: si.file,
					line: si.line,
					message: `[ShellCheck] SC${si.code}: ${si.message}`,
					severity: si.level === "error" ? "error" : "warning",
				});
			}
		}
		if (failure && !data) {
			this.reportFailure("ShellCheck", rootDir, command, failure, issues);
		}
	}

	private runCppcheck(rootDir: string, context: AnalysisContext, issues: Issue[]) {
		const cppFiles = context.files.filter((f) =>
			/\.(cpp|c|hpp|h|cxx|cc)$/i.test(f.relativePath),
		);
		if (cppFiles.length === 0) return;

		const template =
			'{"file":"{file}","line":{line},"severity":"{severity}","message":"{message}","id":"{id}"}';
		const command = `cppcheck --template='${template}' --enable=warning --quiet .`;
		const { output, failure } = this.runCommand(command, rootDir);

		for (const line of output.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed.startsWith("{")) continue;
			try {
				const ci = JSON.parse(trimmed);
				issues.push({
					type: "linter",
					file: ci.file,
					line: ci.line,
					message: `[Cppcheck] ${ci.id}: ${ci.message}`,
					severity: ci.severity === "error" ? "error" : "warning",
				});
			} catch {
				// Ignore malformed diagnostic lines.
			}
		}

		if (failure && !output.trim()) {
			this.reportFailure("Cppcheck", rootDir, command, failure, issues);
		}
	}

	private runGoLint(rootDir: string, context: AnalysisContext, issues: Issue[]) {
		const goFiles = context.files.filter((f) => f.relativePath.endsWith(".go"));
		if (goFiles.length === 0) return;

		const command = "golangci-lint run --out-format json";
		const { output, failure } = this.runCommand(command, rootDir);
		const data = parseLinterJson<{ Issues?: any[] }>(output);
		if (data?.Issues) {
			for (const gi of data.Issues) {
				issues.push({
					type: "linter",
					file: gi.Pos.Filename,
					line: gi.Pos.Line,
					message: `[GoLint] ${gi.FromLinter}: ${gi.Text}`,
					severity: "warning",
				});
			}
		}
		if (failure && !data) {
			this.reportFailure("GolangCI-Lint", rootDir, command, failure, issues);
		}
	}

	private runLuacheck(rootDir: string, context: AnalysisContext, issues: Issue[]) {
		const luaFiles = context.files.filter((f) => f.relativePath.endsWith(".lua"));
		if (luaFiles.length === 0) return;

		const command = "luacheck . --formatter json";
		const { output, failure } = this.runCommand(command, rootDir);
		const data = parseLinterJson<any[]>(output);
		if (Array.isArray(data)) {
			for (const fileResult of data) {
				for (const ev of fileResult.events) {
					issues.push({
						type: "linter",
						file: fileResult.file,
						line: ev.line,
						message: `[Luacheck] ${ev.code}: ${ev.message}`,
						severity: ev.type === "error" ? "error" : "warning",
					});
				}
			}
		}
		if (failure && !data) {
			this.reportFailure("Luacheck", rootDir, command, failure, issues);
		}
	}

	private runCommand(command: string, cwd: string): CommandResult {
		try {
			return {
				output: execSync(command, {
					cwd,
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

	private reportFailure(
		tool: string,
		rootDir: string,
		command: string,
		failure: unknown,
		issues: Issue[],
	) {
		const err = failure as {
			message?: string;
			stderr?: string;
			stdout?: string;
			status?: number | null;
			signal?: NodeJS.Signals | null;
		};
		const text = `${err.stderr || err.stdout || err.message || "unknown failure"}`;
		const reason = this.normalizeFailureReason(text, err.status, err.signal);
		const cwdName = path.basename(rootDir);
		const context = [
			`tool: ${tool}`,
			`cwd: ${rootDir}`,
			`cwd_name: ${cwdName}`,
			`command: ${command}`,
			err.status !== null && err.status !== undefined
				? `exit_code: ${err.status}`
				: null,
			err.signal ? `signal: ${err.signal}` : null,
			text.trim() ? `stderr_stdout: ${this.trimDebugText(text)}` : null,
		]
			.filter(Boolean)
			.join("\n");

		issues.push({
			type: "linter",
			file: cwdName || tool.toLowerCase(),
			line: 0,
			message: `[${tool}] failed to complete: ${reason}`,
			context,
			severity: "warning",
		});
	}

	private trimDebugText(text: string): string {
		const compact = text.replace(/\s+/g, " ").trim();
		return compact.length > 400 ? `${compact.slice(0, 400)}…` : compact;
	}

	private normalizeFailureReason(
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
}

export async function runFastLinterChecks(
	context: AnalysisContext,
): Promise<Issue[]> {
	const rootDir = context.config.rootDir || process.cwd();
	const issues: Issue[] = [];

	const groups: Promise<Issue[]>[] = [
		runGroup([
			() => runRuffAsync(rootDir, context),
			() => runOxlintAsync(rootDir, context),
		]),
		runGroup([
			() => runShellCheckAsync(rootDir, context),
			() => runCppcheckAsync(rootDir, context),
		]),
		runGroup([
			() => runGoLintAsync(rootDir, context),
			() => runLuacheckAsync(rootDir, context),
		]),
	];

	const groupedResults = await Promise.all(groups);
	for (const groupIssues of groupedResults) {
		issues.push(...groupIssues);
	}

	return issues;
}

async function runGroup(tasks: Array<() => Promise<Issue[] | null>>): Promise<Issue[]> {
	const enabled = tasks.map((task) => task());
	const results = await Promise.all(enabled);
	const issues: Issue[] = [];
	for (const groupIssues of results) {
		if (groupIssues && groupIssues.length > 0) {
			issues.push(...groupIssues);
		}
	}
	return issues;
}

function hasAnyFile(context: AnalysisContext, extensions: string[]): boolean {
	return context.files.some((file) =>
		extensions.some((ext) => file.relativePath.toLowerCase().endsWith(ext)),
	);
}

async function runRuffAsync(rootDir: string, context: AnalysisContext): Promise<Issue[]> {
	if (!hasAnyFile(context, [".py"])) return [];
	const { output, failure } = await runCommandAsync(
		"ruff check . --output-format json --quiet",
		rootDir,
	);
	const issues: Issue[] = [];
	const data = parseLinterJson<any[]>(output);
	if (Array.isArray(data)) {
		for (const ri of data) {
			issues.push({
				type: "linter",
				file: ri.filename,
				line: ri.location.row,
				message: `[Ruff] ${ri.code}: ${ri.message}`,
				severity: "warning",
				suggestion: ri.fix
					? 'Run "ruff check --fix" to fix this issue.'
					: undefined,
			});
		}
	}
	if (failure && !data) {
		issues.push(buildFailureIssue("Ruff", rootDir, "ruff check . --output-format json --quiet", failure));
	}
	return issues;
}

async function runOxlintAsync(rootDir: string, context: AnalysisContext): Promise<Issue[]> {
	if (
		!hasAnyFile(context, [
			".js",
			".jsx",
			".ts",
			".tsx",
			".mjs",
			".cjs",
		])
	)
		return [];
	const { output, failure } = await runCommandAsync(
		"oxlint . --format json",
		rootDir,
	);
	const issues: Issue[] = [];
	const data = parseLinterJson<{ diagnostics?: any[] }>(output);
	if (data?.diagnostics) {
		for (const d of data.diagnostics) {
			let message = d.message;
			if (d.help && d.help.length > message.length) message = d.help;
			const label = d.labels?.[0];
			const line = label?.span?.line || 0;
			issues.push({
				type: "linter",
				file: d.filename || "unknown",
				line,
				message: `[Oxlint] ${d.code}: ${message}`,
				severity: d.severity === "error" ? "error" : "warning",
			});
		}
	}
	if (failure && !data) {
		issues.push(buildFailureIssue("Oxlint", rootDir, "oxlint . --format json", failure));
	}
	return issues;
}

async function runShellCheckAsync(
	rootDir: string,
	context: AnalysisContext,
): Promise<Issue[]> {
	const shFiles = context.files
		.filter((f) => f.relativePath.endsWith(".sh"))
		.map((f) => `"${f.relativePath}"`);
	if (shFiles.length === 0) return [];

	const command = `shellcheck -f json ${shFiles.join(" ")}`;
	const { output, failure } = await runCommandAsync(command, rootDir);
	const issues: Issue[] = [];
	const data = parseLinterJson<any[]>(output);
	if (Array.isArray(data)) {
		for (const si of data) {
			issues.push({
				type: "linter",
				file: si.file,
				line: si.line,
				message: `[ShellCheck] SC${si.code}: ${si.message}`,
				severity: si.level === "error" ? "error" : "warning",
			});
		}
	}
	if (failure && !data) {
		issues.push(buildFailureIssue("ShellCheck", rootDir, command, failure));
	}
	return issues;
}

async function runCppcheckAsync(
	rootDir: string,
	context: AnalysisContext,
): Promise<Issue[]> {
	const cppFiles = context.files.filter((f) =>
		/\.(cpp|c|hpp|h|cxx|cc)$/i.test(f.relativePath),
	);
	if (cppFiles.length === 0) return [];

	const template =
		'{"file":"{file}","line":{line},"severity":"{severity}","message":"{message}","id":"{id}"}';
	const command = `cppcheck --template='${template}' --enable=warning --quiet .`;
	const { output, failure } = await runCommandAsync(command, rootDir);
	const issues: Issue[] = [];

	for (const line of output.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed.startsWith("{")) continue;
		try {
			const ci = JSON.parse(trimmed);
			issues.push({
				type: "linter",
				file: ci.file,
				line: ci.line,
				message: `[Cppcheck] ${ci.id}: ${ci.message}`,
				severity: ci.severity === "error" ? "error" : "warning",
			});
		} catch {
			// Ignore malformed diagnostic lines.
		}
	}

	if (failure && !output.trim()) {
		issues.push(buildFailureIssue("Cppcheck", rootDir, command, failure));
	}
	return issues;
}

async function runGoLintAsync(
	rootDir: string,
	context: AnalysisContext,
): Promise<Issue[]> {
	const goFiles = context.files.filter((f) => f.relativePath.endsWith(".go"));
	if (goFiles.length === 0) return [];

	const command = "golangci-lint run --out-format json";
	const { output, failure } = await runCommandAsync(command, rootDir);
	const issues: Issue[] = [];
	const data = parseLinterJson<{ Issues?: any[] }>(output);
	if (data?.Issues) {
		for (const gi of data.Issues) {
			issues.push({
				type: "linter",
				file: gi.Pos.Filename,
				line: gi.Pos.Line,
				message: `[GoLint] ${gi.FromLinter}: ${gi.Text}`,
				severity: "warning",
			});
		}
	}
	if (failure && !data) {
		issues.push(buildFailureIssue("GolangCI-Lint", rootDir, command, failure));
	}
	return issues;
}

async function runLuacheckAsync(
	rootDir: string,
	context: AnalysisContext,
): Promise<Issue[]> {
	const luaFiles = context.files.filter((f) => f.relativePath.endsWith(".lua"));
	if (luaFiles.length === 0) return [];

	const command = "luacheck . --formatter json";
	const { output, failure } = await runCommandAsync(command, rootDir);
	const issues: Issue[] = [];
	const data = parseLinterJson<any[]>(output);
	if (Array.isArray(data)) {
		for (const fileResult of data) {
			for (const ev of fileResult.events) {
				issues.push({
					type: "linter",
					file: fileResult.file,
					line: ev.line,
					message: `[Luacheck] ${ev.code}: ${ev.message}`,
					severity: ev.type === "error" ? "error" : "warning",
				});
			}
		}
	}
	if (failure && !data) {
		issues.push(buildFailureIssue("Luacheck", rootDir, command, failure));
	}
	return issues;
}

async function runCommandAsync(
	command: string,
	cwd: string,
): Promise<CommandResult> {
	try {
		const { stdout } = await execAsync(command, {
			cwd,
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

function buildFailureIssue(
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
