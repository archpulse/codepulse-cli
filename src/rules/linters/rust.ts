import type { AnalysisContext, Issue } from "../../types/analysis";
import { buildFailureIssue, runCommandSync, type LinterConfig } from "./utils";

const CLIPPY_COMMAND = "cargo clippy --message-format=json";

export const ClippyConfig: LinterConfig = {
	name: "clippy",
	extensions: [".rs"],
	command: CLIPPY_COMMAND,
	processOutput: processClippyOutput,
};

export async function runClippyAsync(
	rootDir: string,
	context: AnalysisContext,
): Promise<Issue[]> {
	const { hasAnyFile } = require("./utils");
	if (!hasAnyFile(context, [".rs"])) return [];

	const isCargoAvailable = await checkCargoAvailableAsync();
	if (!isCargoAvailable) return [];

	const { runCommandAsync } = require("./utils");
	const { output, failure } = await runCommandAsync(CLIPPY_COMMAND, rootDir);
	return processClippyOutput(output, failure, rootDir);
}

export function runClippySync(
	rootDir: string,
	context: AnalysisContext,
	issues: Issue[],
) {
	const { hasAnyFile } = require("./utils");
	if (!hasAnyFile(context, [".rs"])) return;

	const isCargoAvailable = checkCargoAvailableSync();
	if (!isCargoAvailable) return;

	const { output, failure } = runCommandSync(CLIPPY_COMMAND, rootDir);
	const newIssues = processClippyOutput(output, failure, rootDir);
	issues.push(...newIssues);
}

async function checkCargoAvailableAsync(): Promise<boolean> {
	const { execAsync } = require("./utils");
	try {
		await execAsync("cargo --version");
		return true;
	} catch {
		return false;
	}
}

function checkCargoAvailableSync(): boolean {
	const { failure } = runCommandSync("cargo --version", process.cwd());
	return !failure;
}

function processClippyOutput(
	output: string,
	failure: unknown,
	rootDir: string,
): Issue[] {
	const issues: Issue[] = [];
	for (const line of output.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed.startsWith("{")) continue;
		try {
			const data = JSON.parse(trimmed);
			if (data.reason === "compiler-message") {
				const msg = data.message;
				const primarySpan =
					msg.spans.find((s: any) => s.is_primary) || msg.spans[0];
				if (primarySpan) {
					issues.push({
						type: "linter",
						file: primarySpan.file_name,
						line: primarySpan.line_start,
						message: `[Clippy] ${msg.code?.code || "error"}: ${msg.message}`,
						severity: msg.level === "error" ? "error" : "warning",
					});
				}
			}
		} catch {
			// Ignore
		}
	}

	if (failure && !output.trim()) {
		issues.push(buildFailureIssue("Clippy", rootDir, CLIPPY_COMMAND, failure));
	}
	return issues;
}
