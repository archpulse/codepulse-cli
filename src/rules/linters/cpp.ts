import type { AnalysisContext, Issue } from "../../types/analysis";
import { buildFailureIssue, type LinterConfig } from "./utils";

const CPPCHECK_TEMPLATE =
	'{"file":"{file}","line":{line},"severity":"{severity}","message":"{message}","id":"{id}"}';
const CPPCHECK_COMMAND = `cppcheck --template='${CPPCHECK_TEMPLATE}' --enable=warning --quiet .`;

export const CppcheckConfig: LinterConfig = {
	name: "cppcheck",
	extensions: [".cpp", ".c", ".hpp", ".h", ".cxx", ".cc"],
	command: CPPCHECK_COMMAND,
	processOutput: processCppcheckOutput,
};

export async function runCppcheckAsync(
	rootDir: string,
	context: AnalysisContext,
): Promise<Issue[]> {
	if (!hasCppFiles(context)) return [];
	const { runCommandAsync } = require("./utils");
	const { output, failure } = await runCommandAsync(CPPCHECK_COMMAND, rootDir);
	return processCppcheckOutput(output, failure, rootDir);
}

export function runCppcheckSync(
	rootDir: string,
	context: AnalysisContext,
	issues: Issue[],
) {
	if (!hasCppFiles(context)) return;
	const { runCommandSync } = require("./utils");
	const { output, failure } = runCommandSync(CPPCHECK_COMMAND, rootDir);
	const newIssues = processCppcheckOutput(output, failure, rootDir);
	issues.push(...newIssues);
}

function hasCppFiles(context: AnalysisContext): boolean {
	return context.files.some((f) =>
		/\.(cpp|c|hpp|h|cxx|cc)$/i.test(f.relativePath),
	);
}

function processCppcheckOutput(
	output: string,
	failure: unknown,
	rootDir: string,
): Issue[] {
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
		issues.push(buildFailureIssue("Cppcheck", rootDir, CPPCHECK_COMMAND, failure));
	}
	return issues;
}
