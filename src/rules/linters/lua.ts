import type { Issue } from "../../types/analysis";
import { buildFailureIssue, parseLinterJson, type LinterConfig } from "./utils";

const LUACHECK_COMMAND = "luacheck . --formatter json";
const SELENE_COMMAND = "selene --display-style Json2 .";

export const LuacheckConfig: LinterConfig = {
	name: "luacheck",
	extensions: [".lua"],
	command: LUACHECK_COMMAND,
	processOutput: processLuacheckOutput,
};

export const SeleneConfig: LinterConfig = {
	name: "selene",
	extensions: [".lua"],
	command: SELENE_COMMAND,
	processOutput: processSeleneOutput,
};

function processLuacheckOutput(
	output: string,
	failure: unknown,
	rootDir: string,
	command: string,
): Issue[] {
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

function processSeleneOutput(
	output: string,
	failure: unknown,
	rootDir: string,
	command: string,
): Issue[] {
	const issues: Issue[] = [];
	const data = parseLinterJson<{ diagnostics?: any[] }>(output);
	if (data?.diagnostics) {
		for (const d of data.diagnostics) {
			issues.push({
				type: "linter",
				file: d.file_path,
				line: d.primary_label?.span?.range?.start?.line ?? 0,
				message: `[Selene] ${d.code}: ${d.message}`,
				severity: d.severity === "Error" ? "error" : "warning",
			});
		}
	}
	if (failure && !data) {
		issues.push(buildFailureIssue("Selene", rootDir, command, failure));
	}
	return issues;
}
