import { execSync } from "node:child_process";
import type { AnalysisContext, Issue, Rule } from "../types/index";
import { RuffConfig } from "./linters/python";
import { OxlintConfig } from "./linters/javascript";
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
} from "./linters/utils";

export { parseLinterJson };

export class FastLinterRule implements Rule {
	name = "fast-linter";
	description =
		"Runs ultra-fast external linters for multiple languages (Ruff, Oxlint, Cppcheck, Luacheck, Selene, ShellCheck, GolangCI, Revive, Clippy)";

	run(context: AnalysisContext): Issue[] {
		const issues: Issue[] = [];
		const rootDir = context.config.rootDir || process.cwd();

		if (this.isCommandAvailable("ruff"))
			runGenericLinterSync(rootDir, context, RuffConfig, issues);
		if (this.isCommandAvailable("oxlint"))
			runGenericLinterSync(rootDir, context, OxlintConfig, issues);
		if (this.isCommandAvailable("shellcheck"))
			runShellCheckSync(rootDir, context, issues);
		if (this.isCommandAvailable("cppcheck"))
			runCppcheckSync(rootDir, context, issues);
		if (this.isCommandAvailable("golangci-lint"))
			runGenericLinterSync(rootDir, context, GoLintConfig, issues);
		if (this.isCommandAvailable("revive"))
			runGenericLinterSync(rootDir, context, ReviveConfig, issues);
		if (this.isCommandAvailable("luacheck"))
			runGenericLinterSync(rootDir, context, LuacheckConfig, issues);
		if (this.isCommandAvailable("selene"))
			runGenericLinterSync(rootDir, context, SeleneConfig, issues);
		if (this.isCommandAvailable("cargo-clippy"))
			runClippySync(rootDir, context, issues);

		return issues;
	}

	private isCommandAvailable(cmd: string): boolean {
		try {
			if (cmd === "cargo-clippy") {
				execSync("cargo clippy --version", { stdio: "ignore" });
			} else {
				execSync(`${cmd} --version`, { stdio: "ignore" });
			}
			return true;
		} catch {
			return false;
		}
	}
}

export async function runFastLinterChecks(
	context: AnalysisContext,
): Promise<Issue[]> {
	const rootDir = context.config.rootDir || process.cwd();
	const issues: Issue[] = [];

	const groups: Promise<Issue[]>[] = [
		runGroup([
			() => runGenericLinterAsync(rootDir, context, RuffConfig),
			() => runGenericLinterAsync(rootDir, context, OxlintConfig),
		]),
		runGroup([
			() => runShellCheckAsync(rootDir, context),
			() => runCppcheckAsync(rootDir, context),
		]),
		runGroup([
			() => runGenericLinterAsync(rootDir, context, GoLintConfig),
			() => runGenericLinterAsync(rootDir, context, ReviveConfig),
			() => runGenericLinterAsync(rootDir, context, LuacheckConfig),
			() => runGenericLinterAsync(rootDir, context, SeleneConfig),
			() => runClippyAsync(rootDir, context),
		]),
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
