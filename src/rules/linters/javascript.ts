import * as path from "node:path";
import type { Issue } from "../../types/analysis";
import { buildFailureIssue, parseLinterJson, type LinterConfig } from "./utils";

const ESLINT_COMMAND = "eslint . --format json";
const OXLINT_COMMAND = "oxlint -f json .";

export const EslintConfig: LinterConfig = {
	name: "eslint",
	extensions: [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"],
	command: ESLINT_COMMAND,
	processOutput: processEslintOutput,
};

export const OxlintConfig: LinterConfig = {
	name: "oxlint",
	extensions: [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"],
	command: OXLINT_COMMAND,
	processOutput: processOxlintOutput,
};

interface EslintMessage {
	ruleId: string;
	severity: number;
	message: string;
	line: number;
	column: number;
}

interface EslintResult {
	filePath: string;
	messages: EslintMessage[];
}

function processEslintOutput(
	output: string,
	failure: unknown,
	rootDir: string,
	command: string,
): Issue[] {
	const issues: Issue[] = [];
	const data = parseLinterJson<EslintResult[]>(output);

	if (Array.isArray(data)) {
		for (const result of data) {
			const relativePath = path.relative(rootDir, result.filePath);
			for (const m of result.messages) {
				issues.push({
					type: "linter",
					file: relativePath,
					line: m.line,
					message: `[ESLint] ${m.ruleId}: ${m.message}`,
					severity: m.severity === 2 ? "error" : "warning",
				});
			}
		}
	}

	if (failure && (!data || data.length === 0)) {
		issues.push(buildFailureIssue("ESLint", rootDir, command, failure));
	}
	return issues;
}

function processOxlintOutput(
	output: string,
	failure: unknown,
	rootDir: string,
	command: string,
): Issue[] {
	const issues: Issue[] = [];
	const data = parseLinterJson<any>(output);

	if (data && Array.isArray(data.diagnostics)) {
		for (const diag of data.diagnostics) {
			const line = diag.labels && diag.labels[0] && diag.labels[0].span ? diag.labels[0].span.line : 0;
			issues.push({
				type: "linter",
				file: path.relative(rootDir, path.resolve(rootDir, diag.filename)),
				line: line,
				message: `[Oxlint] ${diag.code}: ${diag.message}`,
				severity: diag.severity.toLowerCase() === "error" ? "error" : "warning",
			});
		}
	}

	if (failure && (!data || !data.diagnostics)) {
		issues.push(buildFailureIssue("Oxlint", rootDir, command, failure));
	}
	return issues;
}
