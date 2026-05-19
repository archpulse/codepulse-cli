import { execSync } from "node:child_process";
import type { AnalysisContext, Issue, Rule } from "../types/index";
import { RuffConfig } from "./linters/python";
import { OxlintConfig, EslintConfig } from "./linters/javascript";
import { runShellCheckAsync, runShellCheckSync } from "./linters/shell";
import { runCppcheckAsync, runCppcheckSync } from "./linters/cpp";
import {
	GoLintConfig,
	ReviveConfig,
} from "./linters/go";
import {
	LuacheckConfig,
	SeleneConfig,
} from "./linters/lua";
import { runClippyAsync, runClippySync } from "./linters/rust";
import {
	parseLinterJson,
	runGenericLinterAsync,
	runGenericLinterSync,
	resolveBinaryPath,
} from "./linters/utils";

export { parseLinterJson };

function isCommandAvailable(cmd: string, rootDir: string): boolean {
	try {
		if (cmd === "cargo-clippy") {
			execSync("cargo clippy --version", { stdio: "ignore" });
			return true;
		}

		const resolved = resolveBinaryPath(cmd, rootDir);
		if (resolved !== cmd) return true;

		// If not resolved to local path, check if global cmd works
		execSync(`${cmd} --version`, { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

function runSyncLinterGroup(rootDir: string, context: AnalysisContext, issues: Issue[]) {
	const syncChecks = [
		{ cmd: "ruff", config: RuffConfig },
		{ cmd: context.config.precision ? "eslint" : "oxlint", config: context.config.precision ? EslintConfig : OxlintConfig },
		{ cmd: "golangci-lint", config: GoLintConfig },
		{ cmd: "revive", config: ReviveConfig },
		{ cmd: "luacheck", config: LuacheckConfig },
		{ cmd: "selene", config: SeleneConfig },
	];

	for (const { cmd, config } of syncChecks) {
		if (isCommandAvailable(cmd, rootDir)) {
			runGenericLinterSync(rootDir, context, config, issues);
		}
	}
}

export class FastLinterRule implements Rule {
	name = "fast-linter";
	description = "Runs ultra-fast external linters for multiple languages (Ruff, Oxlint, Cppcheck, Luacheck, Selene, ShellCheck, GolangCI, Revive, Clippy)";

	run(context: AnalysisContext): Issue[] {
		const issues: Issue[] = [];
		const rootDir = context.config.rootDir || process.cwd();

		runSyncLinterGroup(rootDir, context, issues);

		if (isCommandAvailable("shellcheck", rootDir)) runShellCheckSync(rootDir, context, issues);
		if (isCommandAvailable("cppcheck", rootDir)) runCppcheckSync(rootDir, context, issues);
		if (isCommandAvailable("cargo-clippy", rootDir)) runClippySync(rootDir, context, issues);

		return issues;
	}
}

async function resolveJsLinterTask(context: AnalysisContext, rootDir: string): Promise<Issue[]> {
	if (context.config.precision) {
		return isCommandAvailable("eslint", rootDir) 
			? runGenericLinterAsync(rootDir, context, EslintConfig) 
			: Promise.resolve([]);
	}
	return isCommandAvailable("oxlint", rootDir) 
		? runGenericLinterAsync(rootDir, context, OxlintConfig) 
		: Promise.resolve([]);
}

async function runCommonLinters(context: AnalysisContext, rootDir: string): Promise<Issue[]> {
	return runGroup([
		() => isCommandAvailable("ruff", rootDir) ? runGenericLinterAsync(rootDir, context, RuffConfig) : Promise.resolve([]),
		() => resolveJsLinterTask(context, rootDir),
	]);
}

async function runStaticLinters(context: AnalysisContext, rootDir: string): Promise<Issue[]> {
	return runGroup([
		() => isCommandAvailable("shellcheck", rootDir) ? runShellCheckAsync(rootDir, context) : Promise.resolve([]),
		() => isCommandAvailable("cppcheck", rootDir) ? runCppcheckAsync(rootDir, context) : Promise.resolve([]),
	]);
}

async function runLangSpecificLinters(context: AnalysisContext, rootDir: string): Promise<Issue[]> {
	return runGroup([
		() => isCommandAvailable("golangci-lint", rootDir) ? runGenericLinterAsync(rootDir, context, GoLintConfig) : Promise.resolve([]),
		() => isCommandAvailable("revive", rootDir) ? runGenericLinterAsync(rootDir, context, ReviveConfig) : Promise.resolve([]),
		() => isCommandAvailable("luacheck", rootDir) ? runGenericLinterAsync(rootDir, context, LuacheckConfig) : Promise.resolve([]),
		() => isCommandAvailable("selene", rootDir) ? runGenericLinterAsync(rootDir, context, SeleneConfig) : Promise.resolve([]),
		() => isCommandAvailable("cargo-clippy", rootDir) ? runClippyAsync(rootDir, context) : Promise.resolve([]),
	]);
}

export async function runFastLinterChecks(
	context: AnalysisContext,
): Promise<Issue[]> {
	const rootDir = context.config.rootDir || process.cwd();
	const issues: Issue[] = [];

	const groups: Promise<Issue[]>[] = [
		runCommonLinters(context, rootDir),
		runStaticLinters(context, rootDir),
		runLangSpecificLinters(context, rootDir),
	];

	const groupedResults = await Promise.all(groups);
	for (const groupIssues of groupedResults) {
		issues.push(...groupIssues);
	}

	return issues;
}

async function runGroup(
	tasks: Array<() => Promise<Issue[] | null>>,
): Promise<Issue[]> {
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
