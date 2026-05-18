import type { Issue } from "../../types/analysis";
import { buildFailureIssue, parseLinterJson, type LinterConfig } from "./utils";

const GOLINT_COMMAND = "golangci-lint run --out-format json";
const REVIVE_COMMAND = "revive -formatter json ./...";

export const GoLintConfig: LinterConfig = {
	name: "golangci-lint",
	extensions: [".go"],
	command: GOLINT_COMMAND,
	processOutput: processGoLintOutput,
};

export const ReviveConfig: LinterConfig = {
	name: "revive",
	extensions: [".go"],
	command: REVIVE_COMMAND,
	processOutput: processReviveOutput,
};

function processGoLintOutput(
	output: string,
	failure: unknown,
	rootDir: string,
	command: string,
): Issue[] {
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

function processReviveOutput(
	output: string,
	failure: unknown,
	rootDir: string,
	command: string,
): Issue[] {
	const issues: Issue[] = [];
	const data = parseLinterJson<any[]>(output);
	if (Array.isArray(data)) {
		for (const ri of data) {
			issues.push({
				type: "linter",
				file: ri.File,
				line: ri.Position?.Start?.Line ?? 0,
				message: `[Revive] ${ri.RuleName}: ${ri.Failure}`,
				severity: ri.Severity === "error" ? "error" : "warning",
			});
		}
	}
	if (failure && !data) {
		issues.push(buildFailureIssue("Revive", rootDir, command, failure));
	}
	return issues;
}
