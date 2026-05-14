import * as fs from "node:fs";
import * as path from "node:path";
import chalk from "chalk";
import ora from "ora";
import { analyze } from "../analyzer";
import { generateReport } from "../reporter/html";
import { generateSarif } from "../reporter/sarif";
import { calculateHealthScore } from "../reporter/stats";
import { runInstallDepsForProject } from "./install-deps";

import type { Issue, IssueSeverity } from "../types/index";
import { generateBadge, saveBadge } from "./badge";
import { printStats } from "./output";

type ScanDebugMode = "all" | "program" | "linter";

function getScanIssueMode(opts: any): ScanDebugMode {
	if (opts.ld) return "linter";
	if (opts.debug) return "program";
	return "all";
}

export function normalizeScanArgs(argv: string[]): string[] {
	const normalized = [...argv];
	const scanIndex = normalized.indexOf("scan");
	if (scanIndex === -1) return normalized;

	for (let i = scanIndex + 1; i < normalized.length; i++) {
		switch (normalized[i]) {
			case "-ld":
				normalized[i] = "--ld";
				break;
			case "-diw":
				normalized[i] = "--debug";
				normalized.splice(i + 1, 0, "--ignore-warnings");
				i++;
				break;
			case "-ldiw":
				normalized[i] = "--ld";
				normalized.splice(i + 1, 0, "--ignore-warnings");
				i++;
				break;
			case "-iw":
				normalized[i] = "--ignore-warnings";
				break;
			default:
				break;
		}
	}

	return normalized;
}

function filterIssues(
	issues: Issue[],
	opts: any,
	mode: ScanDebugMode = "all",
): Issue[] {
	let result = [...issues];

	if (opts.strict) {
		result = result.map((i) => {
			if (i.type === "dead-export" || i.type === "god-file")
				return { ...i, severity: "error" as IssueSeverity };
			return i;
		});
	}

	if (opts.focus) {
		result = result.filter((i) => i.type === opts.focus);
	}

	if (opts.severity) {
		result = result.filter((i) => i.severity === opts.severity);
	}

	if (opts.maxIssues) {
		result = result.slice(0, Number(opts.maxIssues));
	}

	if (opts.ignoreWarnings) {
		result = result.filter((i) => i.severity !== "warning");
	}

	if (mode === "program") {
		result = result.filter((i) => i.type !== "linter");
	}

	if (mode === "linter") {
		result = result.filter((i) => i.type === "linter");
	}

	return result;
}

function exitWithCode(issues: Issue[], opts: any): void {
	const failOn: IssueSeverity | undefined = opts.failOn;
	if (failOn && issues.some((i) => i.severity === failOn)) {
		process.exit(1);
	}
	if (opts.strict && issues.some((i) => i.severity === "error")) {
		process.exit(1);
	}
}

function printIssues(issues: Issue[]): void {
	if (issues.length === 0) {
		console.log(chalk.green("  ✓ No issues found.\n"));
		return;
	}

	console.log(chalk.bold(`\n  Issues\n  ${"─".repeat(50)}`));

	for (const issue of issues) {
		const color = severityColor(issue.severity);
		const line = issue.line ? chalk.gray(` line ${issue.line}`) : "";
		const sym = issue.symbol
			? chalk.gray("  ❯ ") + chalk.white(issue.symbol)
			: "";
		console.log(
			`\n  ${color(`[${issue.severity.toUpperCase()}]`)} ${chalk.bold(issue.type)}` +
				`\n  ${chalk.cyan(issue.file)}${line}${sym}` +
				`\n  ${issue.message}` +
				(issue.suggestion
					? `\n  ${chalk.gray("→")} ${chalk.italic(issue.suggestion)}`
					: ""),
		);
	}
	console.log("");
}

function printLinterDebug(
	issues: Issue[],
	emit: (text: string) => void = console.log,
	opts: any = {},
): void {
	const linterIssues = filterIssues(issues, opts, "linter");
	if (linterIssues.length === 0) {
		emit(chalk.gray("\n  No linter diagnostics to debug.\n"));
		return;
	}

	emit(chalk.bold(`\n  Linter Debug\n  ${"─".repeat(50)}`));
	for (const issue of linterIssues) {
		emit(
			`\n  ${chalk.yellow(`[${issue.severity.toUpperCase()}]`)} ${chalk.bold(issue.file)}` +
				(issue.line ? chalk.gray(` line ${issue.line}`) : "") +
				`\n  ${issue.message}` +
				(issue.context
					? `\n${issue.context
							.split("\n")
							.map((line) => `  ${chalk.gray(line)}`)
							.join("\n")}`
					: ""),
		);
	}
	emit("");
}

function printGrouped(issues: Issue[], groupBy: string): void {
	if (issues.length === 0) {
		console.log(chalk.green("  ✓ No issues found.\n"));
		return;
	}

	const groups = new Map<string, Issue[]>();

	for (const issue of issues) {
		const key =
			(groupBy === "file"
				? issue.file
				: groupBy === "type"
					? issue.type
					: groupBy === "severity"
						? issue.severity
						: issue.file) || "unknown";

		if (!groups.has(key)) groups.set(key, []);
		groups.get(key)?.push(issue);
	}

	console.log(
		chalk.bold(`\n  Issues grouped by ${groupBy}\n  ${"─".repeat(50)}`),
	);

	for (const [key, groupIssues] of groups) {
		console.log(`\n  ${chalk.bold.cyan(key)}`);
		for (const issue of groupIssues) {
			printSingleIssueGrouped(issue);
		}
	}
	console.log("");
}

function printSingleIssueGrouped(issue: Issue) {
	const color = severityColor(issue.severity);
	const line = issue.line ? `:${issue.line}` : "";
	const sym = issue.symbol ? chalk.gray(" ❯ ") + issue.symbol : "";
	console.log(
		`    ${color(`[${issue.severity.toUpperCase()}]`)} ${issue.type}${line}${sym}` +
			(issue.suggestion
				? `\n    ${chalk.gray("→")} ${chalk.italic(issue.suggestion)}`
				: ""),
	);
}

function severityColor(severity: IssueSeverity): (s: string) => string {
	if (severity === "error") return chalk.red;
	if (severity === "warning") return chalk.yellow;
	return chalk.blue;
}

export async function runScan(dir: string | undefined, opts: any) {
	const absDir = path.resolve(dir || ".");

	if (!fs.existsSync(absDir)) {
		handleMissingDir(dir, absDir);
		return;
	}

	if (opts.json) {
		await handleJsonOutput(absDir, opts);
		return;
	}

	console.log(`\n${chalk.bold.cyan("  ◆ CodePulse CLI")}`);
	console.log(chalk.gray(`  Scanning ${absDir}\n`));

	await runInstallDepsForProject(absDir);

	const spinner = ora({ text: "Scanning files...", color: "cyan" }).start();

	try {
		const result = await analyze(absDir, { strict: opts.strict });
		spinner.text = "Generating report...";
		const { reportPath, badgePath } = await generateScanOutputs(
			result,
			absDir,
			opts,
		);

		spinner.succeed(chalk.green("Analysis complete!"));

		printScanSummary(result, absDir, reportPath, badgePath, opts);

		if (opts.ld) {
			printLinterDebug(result.issues, console.log, opts);
		}

		if (opts.debug || opts.focus || opts.severity) {
			const issues = filterIssues(
				result.issues,
				opts,
				opts.debug ? "program" : "all",
			);
			if (opts.groupBy) printGrouped(issues, opts.groupBy);
			else printIssues(issues);
		}

		if (opts.open) openReport(reportPath);

		exitWithCode(filterIssues(result.issues, opts, getScanIssueMode(opts)), opts);
	} catch (err) {
		spinner.fail(chalk.red("Analysis failed"));
		console.error(err);
		process.exit(1);
	}
}

function handleMissingDir(dir: string | undefined, absDir: string) {
	console.error(chalk.red(`Directory not found: ${absDir}`));
	if (!dir) {
		console.log(
			chalk.gray(
				"\n  Tip: You didn't specify a directory. CodePulse tried scanning the current folder (.), but it might be inaccessible.",
			),
		);
		console.log(
			chalk.gray(`  Usage: ${chalk.white("codepulse scan [dir]")}\n`),
		);
	}
	process.exit(1);
}

async function handleJsonOutput(absDir: string, opts: any) {
	try {
		const result = await analyze(absDir, { strict: opts.strict });
		const issues = filterIssues(result.issues, opts, getScanIssueMode(opts));
		if (opts.ld) printLinterDebug(result.issues, console.error, opts);
		console.log(JSON.stringify(issues, null, 2));
		exitWithCode(issues, opts);
	} catch (err) {
		console.error(JSON.stringify({ error: String(err) }));
		process.exit(1);
	}
}

async function generateScanOutputs(result: any, absDir: string, opts: any) {
	const reportPath = generateReport(result, absDir);
	const healthStats = {
		vulnerabilities: result.issues.filter(
			(i: any) => i.type === "vulnerability",
		).length,
		deadExports: result.deadExports.length,
		godFiles: result.godFiles.length,
		criticalFiles: result.criticalFiles.length,
		circularDependencies: result.circularDependencies.length,
		hotspots: result.hotspots,
		avgComplexity: result.avgComplexity,
	};
	const score = calculateHealthScore(healthStats, result);
	const badgeSvg = generateBadge(result, score);
	const badgePath = saveBadge(badgeSvg, absDir);

	if (opts.sarif) {
		const sarifPath = generateSarif(result, absDir);
		console.log(`\n  ${chalk.bold("SARIF:")}  ${chalk.cyan(sarifPath)}`);
	}

	return { reportPath, badgePath, score };
}

function printScanSummary(
	result: any,
	absDir: string,
	reportPath: string,
	badgePath: string,
	opts: any,
) {
	const mode = getScanIssueMode(opts);
	const issues = filterIssues(result.issues, opts, mode);

	console.log(
		`\n  ${chalk.bold("Report:")} ${chalk.cyan(path.join(reportPath, "index.html"))}`,
	);
	console.log(`  ${chalk.bold("Badge:")}  ${chalk.cyan(badgePath)}`);
	printStats({ ...result, issues }, absDir);

	const errors = issues.filter((i) => i.severity === "error").length;
	const warnings = issues.filter((i) => i.severity === "warning").length;

	printFilters(opts);

	console.log(
		`  ${chalk.bold("Issues:")} ${chalk.red(`${errors} errors`)}  ${chalk.yellow(`${warnings} warnings`)}  ${chalk.gray(`(${issues.length} total)`)}\n`,
	);
}

function printFilters(opts: any) {
	const filters: string[] = [];
	if (opts.focus) filters.push(`focus: ${opts.focus}`);
	if (opts.severity) filters.push(`severity: ${opts.severity}`);
	if (opts.maxIssues) filters.push(`max: ${opts.maxIssues}`);
	if (opts.ignoreWarnings) filters.push("ignore warnings");
	if (opts.strict) filters.push("strict mode");
	if (filters.length)
		console.log(chalk.gray(`  Filters: ${filters.join("  ")}`));
}

function openReport(reportPath: string) {
	const { exec } = require("node:child_process");
	const reportFile = path.join(reportPath, "index.html");
	const openCmd =
		process.platform === "win32"
			? `start ${reportFile}`
			: process.platform === "darwin"
				? `open ${reportFile}`
				: `xdg-open ${reportFile}`;
	exec(openCmd);
}
