import type { AnalysisContext, Issue } from "../../types/analysis";
import { buildFailureIssue, parseLinterJson, type LinterConfig } from "./utils";

export const ShellCheckConfig: LinterConfig = {
	name: "shellcheck",
	extensions: [".sh"],
	command: "", // Will be dynamic in runShellCheckSync/Async
	processOutput: processShellCheckOutput,
};

export async function runShellCheckAsync(
	rootDir: string,
	context: AnalysisContext,
): Promise<Issue[]> {
	const shFiles = getShellFiles(context);
	if (shFiles.length === 0) return [];

	const command = `shellcheck -f json ${shFiles.join(" ")}`;
	const { runCommandAsync } = require("./utils");
	const { output, failure } = await runCommandAsync(command, rootDir);
	return processShellCheckOutput(output, failure, rootDir, command);
}

export function runShellCheckSync(
	rootDir: string,
	context: AnalysisContext,
	issues: Issue[],
) {
	const shFiles = getShellFiles(context);
	if (shFiles.length === 0) return;

	const command = `shellcheck -f json ${shFiles.join(" ")}`;
	const { runCommandSync } = require("./utils");
	const { output, failure } = runCommandSync(command, rootDir);
	const newIssues = processShellCheckOutput(output, failure, rootDir, command);
	issues.push(...newIssues);
}

function getShellFiles(context: AnalysisContext): string[] {
	return context.files
		.filter((f) => f.relativePath.endsWith(".sh"))
		.map((f) => `"${f.relativePath}"`);
}

function processShellCheckOutput(
	output: string,
	failure: unknown,
	rootDir: string,
	command: string,
): Issue[] {
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
