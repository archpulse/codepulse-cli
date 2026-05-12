import * as path from "node:path";
import chalk from "chalk";
import ora from "ora";
import { analyze } from "../analyzer";
import type { AnalysisResult } from "../types";

/**
 * CLI handler for `codepulse pr-risk`.
 */
export async function runPrRisk(opts: any = {}) {
	let files: string[] = [];

	if (opts.files) {
		files = opts.files.split(",").map((f: string) => f.trim());
	} else {
		// Try to read from stdin
		try {
			const stdinBuffer = require("node:fs").readFileSync(0);
			files = stdinBuffer
				.toString()
				.split("\n")
				.map((f) => f.trim())
				.filter((f) => f.length > 0);
		} catch {
			console.error(
				chalk.red(
					"No files provided. Use --files 'a.ts,b.ts' or pipe git diff output.",
				),
			);
			process.exit(1);
		}
	}

	if (files.length === 0) {
		console.error(chalk.red("No files provided for risk analysis."));
		process.exit(1);
	}

	const absDir = path.resolve(".");
	const spinner = ora("Evaluating PR architectural risk...").start();

	try {
		const result = await analyze(absDir, { silent: true, pro: true });
		spinner.stop();

		const riskReport = calculateRisk(files, result);
		printRiskReport(riskReport, result);

		if (riskReport.totalScore >= (opts.threshold || 60)) {
			console.log(
				chalk.red(
					`\n  ❌ PR Risk Score exceeds threshold (${opts.threshold || 60}). Review recommended.`,
				),
			);
			process.exit(1);
		} else {
			console.log(
				chalk.green(`\n  ✅ PR Risk Score is within acceptable limits.`),
			);
		}
	} catch (err) {
		spinner.fail("Risk analysis failed");
		console.error(err);
		process.exit(1);
	}
}

interface FileRisk {
	file: string;
	centrality: number;
	complexity: number;
	churn: number;
	score: number;
	reasons: string[];
}

function calculateFileRisk(
	relPath: string,
	result: AnalysisResult,
): FileRisk | null {
	const absPath = path.resolve(relPath);
	const fileNode = result.files.find(
		(f) => f.path === absPath || f.relativePath === relPath,
	);
	const graphNode = result.graph.get(fileNode?.path || "");

	if (!fileNode) return null;

	let score = 0;
	const reasons: string[] = [];

	// 1. Centrality (Weight: 30)
	const centralityNorm = Math.min(1, (graphNode?.centrality || 0) / 50);
	const centralityScore = centralityNorm * 30;
	score += centralityScore;
	if (centralityScore > 15)
		reasons.push(`High centrality (${graphNode?.centrality})`);

	// 2. Complexity (Weight: 25)
	const complexityNorm = Math.min(1, fileNode.complexity / 30);
	const complexityScore = complexityNorm * 25;
	score += complexityScore;
	if (complexityScore > 15)
		reasons.push(`High complexity (${fileNode.complexity})`);

	// 3. Churn (Weight: 15)
	const churnNorm = Math.min(1, (fileNode.churn || 0) / 50);
	const churnScore = churnNorm * 15;
	score += churnScore;
	if (churnScore > 10)
		reasons.push(`Frequent changes (${fileNode.churn} changes/6mo)`);

	// 4. Structural Penalties
	if (fileNode.isGodFile) {
		score += 20;
		reasons.push("God File detected");
	}
	if (graphNode?.isCritical) {
		score += 15;
		reasons.push("Critical Node detected");
	}

	return {
		file: relPath,
		centrality: graphNode?.centrality || 0,
		complexity: fileNode.complexity,
		churn: fileNode.churn || 0,
		score: Math.min(100, Math.round(score)),
		reasons,
	};
}

function calculateRisk(files: string[], result: AnalysisResult) {
	const fileRisks: FileRisk[] = [];

	for (const relPath of files) {
		const risk = calculateFileRisk(relPath, result);
		if (risk) {
			fileRisks.push(risk);
		}
	}

	const totalScore =
		fileRisks.length > 0 ? Math.max(...fileRisks.map((r) => r.score)) : 0;

	return {
		fileRisks: fileRisks.sort((a, b) => b.score - a.score),
		totalScore,
	};
}

function printRiskReport(report: any, result: AnalysisResult) {
	console.log(
		`\n  ${chalk.bold.red("🎯 PR Risk Score: ")} ${report.totalScore}/100`,
	);
	console.log(chalk.gray(`  ${"─".repeat(40)}`));

	for (const r of report.fileRisks.slice(0, 10)) {
		console.log(`\n  ${chalk.white(r.file)}`);
		for (const reason of r.reasons) {
			console.log(`    ${chalk.red("●")} ${chalk.gray(reason)}`);
		}
		console.log(
			`    ${chalk.gray("Risk contribution: ")} ${chalk.yellow(`${r.score} pts`)}`,
		);
	}

	// Temporal coupling warnings
	const changedFiles = new Set(report.fileRisks.map((r: any) => r.file));
	const couplingWarnings: string[] = [];

	if (result.temporalCouplings) {
		for (const c of result.temporalCouplings) {
			if (c.couplingDegree >= 0.7) {
				const hasA = changedFiles.has(c.fileA);
				const hasB = changedFiles.has(c.fileB);

				if (hasA && !hasB)
					couplingWarnings.push(`${c.fileB} (coupled with ${c.fileA})`);
				if (hasB && !hasA)
					couplingWarnings.push(`${c.fileA} (coupled with ${c.fileB})`);
			}
		}
	}

	if (couplingWarnings.length > 0) {
		console.log(
			`\n  ${chalk.bold.yellow("⚠️  Missing from PR but temporally coupled:")}`,
		);
		for (const w of Array.from(new Set(couplingWarnings)).slice(0, 5)) {
			console.log(`    ${chalk.gray("•")} ${w}`);
		}
	}
}
