import * as path from "node:path";
import chalk from "chalk";
import ora from "ora";
import { analyze } from "../analyzer";
import { computeProfileCorrelation } from "../analyzer/profiler/debt-score";
import { parseCProfile } from "../analyzer/profiler/parser-cprofile";
import { parseV8Profile } from "../analyzer/profiler/parser-v8";
import type { DebtCategory, ProfileEntry } from "../types/index";

const isWin = process.platform === "win32";
const sym = {
	bullet: isWin ? "*" : "•",
	check: isWin ? "v" : "✓",
	cross: isWin ? "x" : "✗",
	line: isWin ? "-" : "─",
	hotspot: isWin ? "!" : "🔴",
	dormant: isWin ? "~" : "🟡",
	io: isWin ? ">" : "🔵",
};

const CATEGORY_LABELS: Record<DebtCategory, { icon: string; label: string }> = {
	"active-hotspot": { icon: sym.hotspot, label: "Active Hotspot" },
	"dormant-debt": { icon: sym.dormant, label: "Dormant Debt" },
	"io-bound": { icon: sym.io, label: "I/O Bound" },
};

/**
 * CLI handler for `codepulse profile <file>`.
 */
export async function runProfileCommand(
	profileFile: string,
	opts: {
		dir?: string;
		lang?: string;
		top?: string;
		json?: boolean;
	} = {},
): Promise<void> {
	const absProfilePath = path.resolve(profileFile);
	const projectDir = path.resolve(opts.dir ?? ".");
	const topN = Number.parseInt(opts.top ?? "20", 10);

	const spinner = ora("Parsing profile data...").start();

	try {
		// Step 1: Parse profile
		const entries = parseProfile(absProfilePath, projectDir, opts.lang);
		spinner.text = `Parsed ${entries.length} profile entries. Analyzing project...`;

		// Step 2: Analyze project AST
		const analysis = await analyze(projectDir, { silent: true });
		spinner.text = "Correlating profile with AST...";

		// Step 3: Correlate
		const result = computeProfileCorrelation(entries, analysis.files);
		spinner.stop();

		if (opts.json) {
			console.log(JSON.stringify(result, null, 2));
			return;
		}

		printProfileReport(result, topN);
	} catch (err) {
		spinner.fail("Profile analysis failed");
		console.error(err);
	}
}

function parseProfile(
	profilePath: string,
	projectDir: string,
	lang?: string,
): ProfileEntry[] {
	const ext = path.extname(profilePath).toLowerCase();

	// Auto-detect language from extension
	if (lang === "py" || ext === ".prof" || ext === ".pstats") {
		return parseCProfile(profilePath, projectDir);
	}

	if (lang === "js" || lang === "ts" || ext === ".cpuprofile") {
		return parseV8Profile(profilePath, projectDir);
	}

	// Fallback: try V8 first, then cProfile
	try {
		const entries = parseV8Profile(profilePath, projectDir);
		if (entries.length > 0) return entries;
	} catch {
		// Ignore
	}

	return parseCProfile(profilePath, projectDir);
}

function printProfileReport(result: any, topN: number): void {
	const { matched, unmatchedEntries, totalProfileEntries, matchRate } = result;

	console.log(`\n${chalk.bold.cyan(`  ${sym.line.repeat(52)}`)}`);
	console.log(chalk.bold.white("  Runtime Complexity Correlation"));
	console.log(`${chalk.cyan(`  ${sym.line.repeat(52)}`)}\n`);

	console.log(
		`  ${chalk.gray("Profile entries:")} ${chalk.white(totalProfileEntries)}`,
	);
	console.log(
		`  ${chalk.gray("Matched:")}         ${chalk.green(matched.length)} (${matchRate}%)`,
	);
	console.log(
		`  ${chalk.gray("Unmatched:")}       ${chalk.yellow(unmatchedEntries.length)}\n`,
	);

	if (matched.length === 0) {
		console.log(
			chalk.yellow(
				"  No matches found. Check that the profile was recorded from this project.\n",
			),
		);
		return;
	}

	// Category breakdown
	const categories = {
		"active-hotspot": matched.filter(
			(m: any) => m.category === "active-hotspot",
		),
		"dormant-debt": matched.filter((m: any) => m.category === "dormant-debt"),
		"io-bound": matched.filter((m: any) => m.category === "io-bound"),
	};

	console.log(chalk.bold.white("  Categories:"));
	for (const [cat, items] of Object.entries(categories)) {
		const info = CATEGORY_LABELS[cat as DebtCategory];
		console.log(`  ${info.icon} ${info.label}: ${chalk.white(items.length)}`);
	}
	console.log("");

	// Top N hotspots
	const topItems = matched.slice(0, topN);
	console.log(
		chalk.bold.white(
			`  Top ${Math.min(topN, topItems.length)} Performance-Heavy Technical Debt:\n`,
		),
	);

	// Table header
	const header = `  ${"Function".padEnd(25)} ${"File".padEnd(30)} ${"CC".padStart(4)} ${"Self".padStart(8)} ${"Score".padStart(6)} Category`;
	console.log(chalk.bold.gray(header));
	console.log(chalk.gray(`  ${sym.line.repeat(90)}`));

	for (const item of topItems) {
		const catInfo = CATEGORY_LABELS[item.category as DebtCategory];
		const funcName = truncate(item.functionName, 24);
		const file = truncate(item.file, 29);
		const selfTime = formatTime(item.selfTimeMs);
		const scoreColor =
			item.debtScore >= 5
				? chalk.red
				: item.debtScore >= 2
					? chalk.yellow
					: chalk.green;

		console.log(
			`  ${chalk.white(funcName.padEnd(25))} ${chalk.gray(file.padEnd(30))} ${chalk.cyan(String(item.complexity).padStart(4))} ${chalk.yellow(selfTime.padStart(8))} ${scoreColor(String(item.debtScore).padStart(6))} ${catInfo.icon} ${chalk.gray(catInfo.label)}`,
		);
	}

	console.log(
		`\n  ${chalk.gray("CC = Cyclomatic Complexity, Self = Self Time")}\n`,
	);
}

function truncate(str: string, maxLen: number): string {
	if (str.length <= maxLen) return str;
	return `${str.slice(0, maxLen - 1)}…`;
}

function formatTime(ms: number): string {
	if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
	if (ms >= 1) return `${ms.toFixed(1)}ms`;
	return `${(ms * 1000).toFixed(0)}µs`;
}
