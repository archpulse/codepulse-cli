import * as path from "node:path";
import chalk from "chalk";
import type { AnalysisResult } from "../types/analysis";
import { SYMBOLS } from "../utils/terminal";

function printIssueStatus(label: string, count: number, type: "error" | "warn" | "info" | "success" | "fire") {
	let symbol = SYMBOLS.check;
	let color = chalk.green;
	let valueStr = "none";

	if (count > 0) {
		valueStr = count.toString();
		if (type === "error") {
			symbol = SYMBOLS.cross;
			color = chalk.red;
		} else if (type === "warn") {
			symbol = SYMBOLS.warn;
			color = chalk.yellow;
		} else if (type === "info") {
			symbol = SYMBOLS.info;
			color = chalk.blue;
		} else if (type === "fire") {
			symbol = SYMBOLS.fire;
			color = chalk.magenta;
		}
	}

	const padding = " ".repeat(Math.max(0, 15 - label.length));
	console.log(`  ${color(symbol)} ${label}:${padding}${color(valueStr)}`);
}

export function printStats(result: AnalysisResult, dir: string): void {
	console.log(`\n${chalk.bold.cyan(SYMBOLS.line.repeat(52))}`);
	console.log(chalk.bold.white("  CodePulse") + chalk.bold.cyan(" CLI") + chalk.gray(" — Project Stats"));
	console.log(chalk.bold.cyan(SYMBOLS.line.repeat(52)));

	console.log(`\n  ${chalk.gray("Directory:")}    ${chalk.white(path.resolve(dir))}`);
	console.log(`  ${chalk.gray("Files:")}        ${chalk.white(result.totalFiles)}`);
	console.log(`  ${chalk.gray("Lines:")}        ${chalk.white(result.totalLines.toLocaleString())}`);
	console.log(`  ${chalk.gray("Avg Complexity:")} ${complexityColor(result.avgComplexity)}`);
	console.log(`  ${chalk.gray("Dependencies:")} ${chalk.white(`${result.edges.length} edges`)}`);

	console.log(`\n${chalk.bold.yellow("  Issues Found")}`);
	console.log(`  ${chalk.gray(SYMBOLS.thinLine.repeat(30))}`);

	printIssueStatus("Dead exports", result.deadExports.length, "error");
	printIssueStatus("God files", result.godFiles.length, "warn");
	printIssueStatus("Critical nodes", result.criticalFiles.length, "error");
	printIssueStatus("Hotspots", result.hotspots.length, "fire");

	const issues = (type: string) => result.issues.filter(i => i.type === type).length;
	printIssueStatus("High complexity", issues("high-complexity"), "warn");
	printIssueStatus("Duplication", issues("duplication"), "warn");
	printIssueStatus("Circular deps", issues("circular-dependency"), "error");
	printIssueStatus("Arch violations", issues("architecture-violation"), "error");
	
	const vulnLen = result.issues.filter(i => i.type === "vulnerability" || i.type === "dependency-vulnerability").length;
	printIssueStatus("Vulnerabilities", vulnLen, "error");
	printIssueStatus("Linter issues", issues("linter"), "info");

	console.log(`\n${chalk.cyan(SYMBOLS.line.repeat(52))}\n`);
}

export function printDeadCode(result: AnalysisResult): void {
	console.log(`\n${chalk.bold.red("Dead Code — Unused Exports")}`);
	console.log(chalk.gray(SYMBOLS.thinLine.repeat(50)));

	if (result.deadExports.length === 0) {
		console.log(chalk.green(`  ${SYMBOLS.check} No dead exports found!`));
		return;
	}

	for (const d of result.deadExports) {
		console.log(`  ${chalk.gray(d.file)}  ${chalk.red(d.name)}`);
	}
	console.log(
		chalk.gray(`\n  Total: ${result.deadExports.length} unused exports\n`),
	);
}

export function printGodFiles(result: AnalysisResult): void {
	console.log(`\n${chalk.bold.yellow("God Files — Oversized Modules")}`);
	console.log(chalk.gray(SYMBOLS.thinLine.repeat(50)));

	if (result.godFiles.length === 0) {
		console.log(chalk.green(`  ${SYMBOLS.check} No god files found!`));
		return;
	}

	for (const f of result.godFiles) {
		console.log(
			`  ${chalk.yellow(f.relativePath)}\n` +
				`    Lines: ${f.lines}  Imports: ${f.imports.length}  Complexity: ${f.complexity}\n`,
		);
	}
}

function complexityColor(value: number): string {
	const v = Math.round(value * 10) / 10;
	if (v > 15) return chalk.red(v);
	if (v > 8) return chalk.yellow(v);
	return chalk.green(v);
}
