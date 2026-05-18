import type { Issue } from "../../types/analysis";
import { buildFailureIssue, parseLinterJson, type LinterConfig } from "./utils";

const RUFF_COMMAND = "ruff check . --output-format json --quiet";

export const RuffConfig: LinterConfig = {
	name: "ruff",
	extensions: [".py"],
	command: RUFF_COMMAND,
	processOutput: processRuffOutput,
};

function processRuffOutput(
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
		issues.push(buildFailureIssue("Ruff", rootDir, command, failure));
	}
	return issues;
}
