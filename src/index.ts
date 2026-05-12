#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import updateNotifier from "update-notifier";
import { analyze } from "./analyzer";
import {
	generateBadge,
	printDeadCode,
	printStats,
	runCoupling,
	runExplain,
	runInstallDeps,
	runLicense,
	runMcpServer,
	runProfileCommand,
	runPrRisk,
	runScan,
	runTimeMachineCommand,
	runWatch,
	saveBadge,
} from "./commands";
import {
	markDepsAsInstalled,
	setupMcpConfigs,
	shouldRunDepsSetup,
	shouldRunMcpSetup,
} from "./mcp-setup";
import { generateReport } from "./reporter/html";
import { calculateHealthScore } from "./reporter/stats";
import { type Locale, setLocale, t } from "./utils/i18n";
import { listPlugins } from "./utils/plugins";

export * from "./types/index";

const pkgPath = path.resolve(__dirname, "../package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

const isWin = process.platform === "win32";

// Manually check for --lang flag before commander parses
const langIndex = process.argv.indexOf("--lang");
if (langIndex !== -1 && process.argv[langIndex + 1]) {
	setLocale(process.argv[langIndex + 1] as Locale);
}

const program = new Command();

// Global option for language (keep for documentation)
program.option(
	"--lang <locale>",
	"Set language (en, ua, cs, ko, ru, de, fr)",
	"en",
);

// Check for updates
const notifier = updateNotifier({
	pkg,
	updateCheckInterval: 0, // Check every time for debugging
	distTag: "latest",
});

if (notifier.update && notifier.update.latest !== pkg.version) {
	notifier.notify({ isGlobal: true, defer: false });
}

// Auto-configure on first run
(async () => {
	// 1. Dependency Setup (Independently of MCP)
	if (shouldRunDepsSetup()) {
		await runInstallDeps(true);
		markDepsAsInstalled();
	}

	// 2. MCP Setup
	if (shouldRunMcpSetup()) {
		const count = setupMcpConfigs();
		if (count > 0) {
			const symbol = isWin ? "v" : "✓";
			console.log(
				chalk.green(
					`\n  ${symbol} Automatically configured CodePulse as an MCP server for ${count} AI agent(s) on your PC!\n`,
				),
			);
		}
	}
})();

program
	.name("codepulse")
	.description(t("cli.description"))
	.version(pkg.version);

program.configureHelp({
	subcommandTerm: (cmd) => chalk.cyan(cmd.name()),
	subcommandDescription: (cmd) => chalk.gray(cmd.description()),
	optionTerm: (option) => chalk.yellow(option.flags),
	optionDescription: (option) => chalk.gray(option.description),
	commandUsage: (command) =>
		chalk.magenta(`${command.name()} ${command.usage()}`),
	commandDescription: (command) => chalk.italic(command.description()),
});

program.addHelpText(
	"before",
	`
${chalk.bold.blue("  ____           _      ____       _               ")}
${chalk.bold.blue(" / ___|___   __| | ___|  _ \\ _   _| |___  ___      ")}
${chalk.bold.blue("| |   / _ \\ / _` |/ _ \\ |_) | | | | / __|/ _ \\     ")}
${chalk.bold.blue("| |__| (_) | (_| |  __/  __/| |_| | \\__ \\  __/     ")}
${chalk.bold.blue(" \\____\\___/ \\__,_|\\___|_|    \\__,_|_|___/\\___|     ")}
`,
);

program.addHelpText(
	"after",
	`
${chalk.bold(t("cli.examples"))}
  ${chalk.gray("$")} codepulse scan .
  ${chalk.gray("$")} codepulse stats src --json
  ${chalk.gray("$")} codepulse explain complexity
  ${chalk.gray("$")} codepulse license mit "John Doe"
`,
);

program
	.command("license <type> [name]")
	.description("Generate a license file (mit, apache, gpl)")
	.action(runLicense);

program
	.command("install-deps")
	.description(
		"Automatically install all required external linters (Biome, Ruff, Cppcheck, ShellCheck, GolangCI)",
	)
	.action(runInstallDeps);

program
	.command("mcp")
	.description("Start the Model Context Protocol (MCP) server for AI agents")
	.action(async () => {
		try {
			await runMcpServer();
		} catch (err) {
			console.error(chalk.red("MCP Server failed to start:"), err);
			process.exit(1);
		}
	});

program
	.command("setup-mcp")
	.description(
		"Configure CodePulse as MCP server for AI agents + generate agent rules files",
	)
	.option(
		"--rules-only",
		"Only generate agent rules files (.clinerules, .cursorrules, etc.) without MCP config",
	)
	.option(
		"--dir <dir>",
		"Target directory for rules files (default: current directory)",
	)
	.action((opts) => {
		const isWinLocal = process.platform === "win32";
		const checkMark = isWinLocal ? "v" : "✓";
		const bullet = isWinLocal ? "*" : "•";

		let mcpCount = 0;
		if (!opts.rulesOnly) {
			mcpCount = setupMcpConfigs();
			if (mcpCount > 0) {
				console.log(
					chalk.green(
						`\n  ${checkMark} Configured CodePulse as MCP server for ${mcpCount} AI agent(s)`,
					),
				);
			} else {
				console.log(
					chalk.yellow(
						"\n  ! No supported AI agent configurations found on this system.",
					),
				);
			}
		}

		// Generate agent rules files
		const { generateAllAgentRules } = require("./rules/agents/registry");
		const targetDir = opts.dir ? path.resolve(opts.dir) : process.cwd();
		const allRules = generateAllAgentRules(targetDir);

		if (allRules.length > 0) {
			console.log(chalk.green(`\n  ${checkMark} Generated agent rules files:`));
			for (const rule of allRules) {
				console.log(chalk.gray(`    ${bullet} ${rule.name}: ${rule.path}`));
			}
		} else {
			console.log(
				chalk.gray(
					"\n  All agent rules files already contain CodePulse instructions.",
				),
			);
		}

		const total = mcpCount + allRules.length;
		if (total > 0) {
			console.log(
				chalk.cyan(
					`\n  AI agents (${allRules.length} supported) will now proactively use CodePulse tools for code analysis.\n`,
				),
			);
		}
		console.log("");
	});

program
	.command("scan [dir]")
	.description("Analyze project and generate full HTML report")
	.option("--open", "Open report in browser after generation")
	.option("--sarif", "Generate SARIF report for CI/CD")
	.option("-d, --debug", "Show detailed issues list")
	.option("--json", "Output issues as JSON (CI-friendly)")
	.option(
		"--focus <type>",
		"Filter by issue type (dead-export|high-complexity|god-file|critical-node)",
	)
	.option("--severity <level>", "Filter by severity (info|warning|error)")
	.option("--max-issues <number>", "Limit number of issues shown")
	.option(
		"--fail-on <level>",
		"Exit with code 1 if issues of this severity exist",
	)
	.option("--group-by <field>", "Group output by field (file|type|severity)")
	.option("--strict", "Strict mode: treat warnings as errors, lower thresholds")
	.action(runScan);

program
	.command("watch [dir]")
	.description("Run CodePulse in real-time watch mode with TUI dashboard")
	.option("-d, --debug", "Show detailed issues list in the dashboard")
	.option(
		"--strict",
		"Strict mode: lower complexity thresholds and treat warnings as errors",
	)
	.action((dir = ".", opts) => runWatch(dir, opts));

program
	.command("stats [dir]")
	.description("Print quick stats to console")
	.option("--json", "Output as JSON")
	.action(async (dir = ".", opts) => {
		const absDir = path.resolve(dir);
		const spinner = ora("Analyzing...").start();
		try {
			const result = await analyze(absDir);
			spinner.stop();
			if (opts.json) {
				console.log(
					JSON.stringify(
						{
							totalFiles: result.totalFiles,
							totalLines: result.totalLines,
							avgComplexity: result.avgComplexity,
							issues: result.issues.length,
							errors: result.issues.filter((i) => i.severity === "error")
								.length,
							warnings: result.issues.filter((i) => i.severity === "warning")
								.length,
						},
						null,
						2,
					),
				);
			} else {
				printStats(result, absDir);
			}
		} catch (err) {
			spinner.fail("Failed");
			console.error(err);
		}
	});

program
	.command("dead [dir]")
	.description("Show unused exports")
	.option("--json", "Output as JSON")
	.action(async (dir = ".", opts) => {
		const absDir = path.resolve(dir);
		const spinner = ora("Detecting dead code...").start();
		try {
			const result = await analyze(absDir);
			spinner.stop();
			if (opts.json) {
				const dead = result.issues.filter((i) => i.type === "dead-export");
				console.log(JSON.stringify(dead, null, 2));
			} else {
				printDeadCode(result);
			}
		} catch (err) {
			spinner.fail("Failed");
			console.error(err);
		}
	});

program
	.command("graph [dir]")
	.description("Generate only the dependency graph SVG")
	.action(async (dir = ".") => {
		const absDir = path.resolve(dir);
		const spinner = ora("Building graph...").start();
		try {
			const result = await analyze(absDir);
			const reportPath = generateReport(result, absDir);
			spinner.succeed(chalk.green("Graph saved!"));
			console.log(`  ${chalk.cyan(path.join(reportPath, "graph.svg"))}\n`);
		} catch (err) {
			spinner.fail("Failed");
			console.error(err);
		}
	});

program
	.command("coupling [dir]")
	.description(
		"Detect hidden dependencies between files that change together (Temporal Coupling)",
	)
	.action(runCoupling);

program
	.command("pr-risk")
	.description(
		"Evaluate architectural risk of changed files (Pull Request analysis)",
	)
	.option("--files <list>", "Comma-separated list of changed files")
	.option("--stdin", "Read list of files from stdin")
	.option(
		"--threshold <number>",
		"Risk score threshold to exit with code 1 (default: 60)",
	)
	.action(runPrRisk);

program
	.command("badge [dir]")
	.description("Generate a quality badge SVG")
	.action(async (dir = ".") => {
		const absDir = path.resolve(dir);
		try {
			const result = await analyze(absDir);
			const healthStats = {
				vulnerabilities: result.issues.filter((i) => i.type === "vulnerability")
					.length,
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
			console.log(chalk.green(`\n  ✓ Badge generated: ${badgePath}`));
			console.log(chalk.gray(`    Score: ${score}/100\n`));
		} catch (err) {
			console.error(chalk.red("Failed to generate badge"), err);
		}
	});

program
	.command("explain [topic]")
	.description("Explain what a detected issue means and how to fix it")
	.action(runExplain);

program
	.command("time-machine [dir]")
	.description(
		"Build dependency graph history across git commits (Time Machine)",
	)
	.option(
		"--commits <number>",
		"Number of commit points to sample (default: 30)",
	)
	.option(
		"--strategy <type>",
		"Sampling strategy: max-points, every-nth, interval, tag-only",
	)
	.option(
		"--interval <period>",
		"For interval strategy: daily, weekly, monthly",
	)
	.option("--since <date>", "Only analyze commits after this date")
	.option("--json", "Output as JSON")
	.action(runTimeMachineCommand);

program
	.command("profile <file>")
	.description(
		"Correlate profiler data (.cpuprofile, .prof) with code complexity",
	)
	.option("-d, --dir <dir>", "Project directory (default: current)")
	.option(
		"--lang <language>",
		"Force language: js, ts, py (auto-detected by default)",
	)
	.option("--top <number>", "Number of top hotspots to show (default: 20)")
	.option("--json", "Output as JSON")
	.action(runProfileCommand);

const plugins = program
	.command("plugins")
	.description("Manage and list custom analysis plugins");

plugins
	.command("list")
	.description("List all available plugins with metadata")
	.option("--json", "Output as JSON")
	.action(async (opts) => {
		try {
			const plugins = await listPlugins();

			if (opts.json) {
				console.log(JSON.stringify(plugins, null, 2));
			} else {
				if (plugins.length === 0) {
					console.log(chalk.yellow("\n  No plugins found.\n"));
					return;
				}

				console.log(chalk.bold(`\n  📦 Loaded Plugins\n  ${"─".repeat(50)}`));

				for (const plugin of plugins) {
					const statusIcon = plugin.enabled
						? chalk.green("●")
						: chalk.gray("○");
					console.log(
						`\n  ${statusIcon} ${chalk.cyan(plugin.name)} ${chalk.gray(`v${plugin.version}`)}`,
					);
					console.log(`    ${chalk.white(plugin.description)}`);
					console.log(
						`    ${chalk.gray(`Category: ${plugin.category} | Author: ${plugin.author} | File: ${plugin.file}`)}`,
					);
				}
				console.log("");
			}
		} catch (err) {
			console.error(chalk.red("Failed to list plugins:"), err);
			process.exit(1);
		}
	});

program.parse(process.argv);
