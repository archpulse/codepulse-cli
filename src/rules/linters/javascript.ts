import type { Issue } from "../../types/analysis";
import { buildFailureIssue, parseLinterJson, type LinterConfig } from "./utils";

const OXLINT_COMMAND = "oxlint . --format json";

export const OxlintConfig: LinterConfig = {
	name: "oxlint",
	extensions: [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"],
	command: OXLINT_COMMAND,
	processOutput: processOxlintOutput,
};

function processOxlintOutput(
	output: string,
	failure: unknown,
	rootDir: string,
	command: string,
): Issue[] {
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
		issues.push(buildFailureIssue("Oxlint", rootDir, command, failure));
	}
	return issues;
}
