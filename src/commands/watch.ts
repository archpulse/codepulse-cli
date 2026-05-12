import * as path from "node:path";
import * as readline from "node:readline";
import ansiEscapes from "ansi-escapes";
import chalk from "chalk";
import * as chokidar from "chokidar";
import logUpdate from "log-update";
import { analyze } from "../analyzer";
import { calculateHealthScore } from "../reporter/stats";
import type { AnalysisCache, AnalysisResult } from "../types/index";

export async function runWatch(dir: string, opts: any = {}) {
	const absDir = path.resolve(dir);
	console.log(ansiEscapes.clearScreen);
	console.log(chalk.bold.cyan("\n  🚀 CodePulse Watch Mode Active"));
	console.log(chalk.gray(`  Monitoring: ${absDir}\n`));

	let isAnalyzing = false;
	let _lastResult: AnalysisResult | null = null;
	let debounceTimer: NodeJS.Timeout | null = null;
	let showFullIssues = false;

	const cache: AnalysisCache = {
		fileNodes: new Map(),
	};

	// Keypress handling
	if (process.stdin.isTTY) {
		process.stdin.setRawMode(true);
		process.stdin.resume();
		readline.emitKeypressEvents(process.stdin);

		process.stdin.on("keypress", (_str, key) => {
			if (key.ctrl && key.name === "c") {
				cleanup();
			} else if (key.ctrl && key.name === "o") {
				showFullIssues = !showFullIssues;
				if (_lastResult)
					renderDashboard(_lastResult, isAnalyzing, showFullIssues);
			}
		});
	}

	const cleanup = () => {
		watcher.close();
		logUpdate.clear();
		if (process.stdin.isTTY) {
			process.stdin.setRawMode(false);
			process.stdin.pause();
		}
		process.exit();
	};

	const performAnalysis = async () => {
		if (isAnalyzing) return;
		isAnalyzing = true;

		if (_lastResult) {
			renderDashboard(_lastResult, true, showFullIssues);
		}

		try {
			const result = await analyze(absDir, {
				silent: true,
				cache,
				strict: opts.strict,
			});
			_lastResult = result;
			renderDashboard(result, false, showFullIssues);
		} catch (_err) {
			// Silent error
		} finally {
			isAnalyzing = false;
		}
	};

	const debouncedAnalysis = () => {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(performAnalysis, 700);
	};

	// Initial analysis
	await performAnalysis();

	// Watcher
	const watcher = chokidar.watch(absDir, {
		ignored: [
			"**/node_modules/**",
			"**/.git/**",
			"**/dist/**",
			"**/build/**",
			"**/coverage/**",
			"**/.codepulse-report/**",
			"**/*.min.js",
		],
		persistent: true,
		ignoreInitial: true,
		usePolling: false,
		interval: 1000,
		binaryInterval: 3000,
	});

	watcher.on("all", (_event, filePath) => {
		const ext = path.extname(filePath).toLowerCase();
		const supportedExts = [
			".ts",
			".tsx",
			".js",
			".jsx",
			".py",
			".java",
			".cpp",
			".c",
			".cs",
			".lua",
			".css",
			".scss",
			".html",
		];
		if (supportedExts.includes(ext)) {
			debouncedAnalysis();
		}
	});

	process.on("SIGINT", () => {
		cleanup();
	});
}

function renderIssuesList(issues: any[], showFull: boolean) {
	const displayedIssues = showFull ? issues : issues.slice(0, 5);
	if (displayedIssues.length === 0) return "";

	const title = showFull
		? chalk.bold.red(`🐞 All Issues (${issues.length})`)
		: chalk.bold.red("🐞 Recent Issues");

	let list = `\n  ${title}\n  ${chalk.gray("─".repeat(20))}\n`;
	list += displayedIssues
		.map((i) => {
			const color =
				i.severity === "error"
					? chalk.red
					: i.severity === "warning"
						? chalk.yellow
						: chalk.blue;

			const isGlobal = i.file === "unknown";
			const fileLabel = isGlobal ? chalk.italic.gray("global") : i.file;
			const lineLabel = i.line && !isGlobal ? chalk.gray(`:${i.line}`) : "";
			const msg = showFull ? i.message : `${i.message.slice(0, 60)}...`;

			const prefix = `  ${color("●")} ${chalk.white(fileLabel)}${lineLabel} `;
			return prefix + chalk.gray(msg);
		})
		.join("\n");
	return `${list}\n`;
}

function renderDashboard(
	result: AnalysisResult,
	analyzing: boolean,
	showFullIssues: boolean,
) {
	const {
		totalFiles,
		totalLines,
		avgComplexity,
		issues,
		hotspots,
		criticalFiles,
		deadExports,
	} = result;

	const healthStats = {
		vulnerabilities: issues.filter((i) => i.type === "vulnerability").length,
		deadExports: deadExports.length,
		godFiles: result.godFiles.length,
		criticalFiles: criticalFiles.length,
		hotspots: hotspots,
		avgComplexity: avgComplexity,
	};

	const score = calculateHealthScore(healthStats, result);
	const errors = issues.filter((i) => i.severity === "error").length;
	const warnings = issues.filter((i) => i.severity === "warning").length;
	const linterCount = issues.filter((i) => i.type === "linter").length;

	const scoreColor =
		score > 90 ? chalk.green : score > 70 ? chalk.yellow : chalk.red;

	const statusLine = analyzing
		? chalk.yellow("  🔄 Analyzing changes...")
		: chalk.green("  ✨ System Idle");

	const issuesList = renderIssuesList(issues, showFullIssues);

	const dashboard = `
  ${chalk.bold.white("📊 Code Health Dashboard")}   [${scoreColor(`${score}/100`)}]
  ${chalk.gray("─".repeat(50))}

  ${chalk.white("Files:")} ${chalk.cyan(totalFiles)} | ${chalk.white("Lines:")} ${chalk.cyan(totalLines)} | ${chalk.white("Avg Complexity:")} ${chalk.yellow(avgComplexity.toFixed(2))}
  ${chalk.white("Issues:")} ${chalk.red(`${errors} errors`)} | ${chalk.yellow(`${warnings} warnings`)} | ${chalk.blue(`${linterCount} lint`)}

  ${chalk.bold.magenta("🏗️  Structural Risks")}
  ${chalk.gray("─".repeat(20))}
  Critical Nodes: ${criticalFiles.length > 0 ? chalk.red(criticalFiles.length) : chalk.green("0")}
  God Files:      ${result.godFiles.length > 0 ? chalk.yellow(result.godFiles.length) : chalk.green("0")}
  Dead Exports:   ${deadExports.length > 0 ? chalk.yellow(deadExports.length) : chalk.green("0")}

  ${chalk.bold.hex("#FFA500")("🔥 Complexity Hotspots")}
  ${chalk.gray("─".repeat(20))}
  ${hotspots
		.slice(0, 5)
		.map(
			(h) =>
				`${chalk.red("●")} ${chalk.white(h.file.padEnd(30))} ${chalk.yellow(h.score.toString().padStart(3))} pts`,
		)
		.join("\n  ")}
${issuesList}
  ${chalk.gray("─".repeat(50))}
  ${statusLine}
  ${chalk.italic.gray(`Watching for changes... Press ${chalk.white("Ctrl+O")} to toggle full view, ${chalk.white("Ctrl+C")} to stop.`)}
`;

	logUpdate(dashboard);
}
