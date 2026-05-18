import * as path from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import { analyze } from "../analyzer";
import {
	generateBadge,
	printDeadCode,
	printStats,
	runAgentCommand,
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
} from "../commands";
import { setupMcpConfigs } from "../mcp-setup";
import { generateReport } from "../reporter/html";
import { calculateHealthScore } from "../reporter/stats";
import { t } from "../utils/i18n";
import { listPlugins } from "../utils/plugins";
import { SYMBOLS } from "../utils/terminal";

export function createProgram(pkg: any): Command {
	const program = new Command();

	setupProgramMetadata(program, pkg);
	setupProgramHelp(program);
	registerAgentCommands(program);
	registerUtilityCommands(program);
	registerMcpCommands(program);
	registerAnalysisCommands(program);
	registerReportCommands(program);
	registerAdvancedCommands(program);
	registerPluginCommands(program);

	return program;
}

function setupProgramMetadata(program: Command, pkg: any) {
	program
		.name("codepulse")
		.description(t("cli.description"))
		.version(pkg.version, "-V, --version", t("cli.help.version"))
		.helpOption("-h, --help", t("cli.help.help"));

	program.configureHelp({
		subcommandTerm: (cmd) => chalk.cyan(cmd.name()),
		subcommandDescription: (cmd) => chalk.gray(cmd.description()),
		optionTerm: (option) => chalk.yellow(option.flags),
		optionDescription: (option) => chalk.gray(option.description),
		commandUsage: (command) =>
			chalk.magenta(`${command.name()} ${command.usage()}`),
		commandDescription: (command) => chalk.italic(command.description()),
	});

	// @ts-ignore
	program.helpInformation = function () {
		const info = Command.prototype.helpInformation.call(this);
		return info
			.replace("Usage:", chalk.bold(t("cli.help.usage")))
			.replace("Options:", chalk.bold(t("cli.help.options")))
			.replace("Commands:", chalk.bold(t("cli.help.commands")));
	};
}

function setupProgramHelp(program: Command) {
	program.addHelpText(
		"before",
		`
${chalk.bold.blue("   ______          __     ____         __          ")}
${chalk.bold.blue("  / ____/____  ___/ /__  / __ \\__  __/ /_______  ")}
${chalk.bold.blue(" / /   / __ \\/ _  / _ \\/ /_/ / / / / / ___/ _ \\ ")}
${chalk.bold.blue("/ /___/ /_/ / /_/ /  __/ ____/ /_/ / (__  )  __/ ")}
${chalk.bold.blue("\\____/\\____/\\__,_/\\___/_/    \\__,_/_/____/\\___/  ")}
${chalk.gray("                   Deep Architectural Intelligence")}
`,
	);

	program.addHelpText(
		"after",
		`
${chalk.bold(t("cli.examples"))}
  ${chalk.gray("$")} codepulse scan .
  ${chalk.gray("$")} codepulse watch
  ${chalk.gray("$")} codepulse agents config
  ${chalk.gray("$")} codepulse agent gemini -D

${chalk.gray("Documentation: https://github.com/archpulse/codepulse")}
`,
	);
}

function registerAgentCommands(program: Command) {
	program
		.command("agent [name] [prompt]")
		.description(t("cli.cmd.agent"))
		.action(runAgentCommand);

	program
		.command("agents [command] [subcommand]")
		.description(t("cli.cmd.agents"))
		.action(runAgentCommand);
}

function registerUtilityCommands(program: Command) {
	program
		.command("license <type> [name]")
		.description(t("cli.cmd.license"))
		.action(runLicense);

	program
		.command("install-deps")
		.description(t("cli.cmd.install_deps"))
		.action(runInstallDeps);
}

function registerMcpCommands(program: Command) {
	program
		.command("mcp")
		.description(t("cli.cmd.mcp"))
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
		.description(t("cli.cmd.setup_mcp"))
		.option(
			"--rules-only",
			"Only generate agent rules files (.clinerules, .cursorrules, etc.) without MCP config",
		)
		.option(
			"--dir <dir>",
			"Target directory for rules files (default: current directory)",
		)
		.action((opts) => {
			let mcpCount = 0;
			if (!opts.rulesOnly) {
				mcpCount = setupMcpConfigs();
				if (mcpCount > 0) {
					console.log(
						chalk.green(
							`\n  ${SYMBOLS.check} Configured CodePulse as MCP server for ${mcpCount} AI agent(s)`,
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

			const { generateAllAgentRules } = require("../rules/agents/registry");
			const targetDir = opts.dir ? path.resolve(opts.dir) : process.cwd();
			const allRules = generateAllAgentRules(targetDir);

			if (allRules.length > 0) {
				console.log(chalk.green(`\n  ${SYMBOLS.check} Generated agent rules files:`));
				for (const rule of allRules) {
					console.log(
						chalk.gray(`    ${SYMBOLS.bullet} ${rule.name}: ${rule.path}`),
					);
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
						`\n  AI agents (${allRules.length} supported) can now use CodePulse tools for code analysis when it helps.\n`,
					),
				);
			}
			console.log("");
		});
}

function registerAnalysisCommands(program: Command) {
	program
		.command("scan [dir]")
		.description(t("cli.cmd.scan"))
		.option("--open", "Open report in browser after generation")
		.option("--sarif", "Generate SARIF report for CI/CD")
		.option("-d, --debug", "Show program issues only")
		.option("--ld", "Show linter debug details (-ld)")
		.option(
			"--ignore-warnings",
			"Hide warning-level issues in detailed output (-diw / -ldiw)",
		)
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
		.description(t("cli.cmd.watch"))
		.option("-d, --debug", "Show detailed issues list in the dashboard")
		.option(
			"--strict",
			"Strict mode: lower complexity thresholds and treat warnings as errors",
		)
		.action((dir = ".", opts) => runWatch(dir, opts));

	program
		.command("stats [dir]")
		.description(t("cli.cmd.stats"))
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
}

function registerReportCommands(program: Command) {
	program
		.command("dead [dir]")
		.description(t("cli.cmd.dead"))
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
		.description(t("cli.cmd.graph"))
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
		.command("badge [dir]")
		.description(t("cli.cmd.badge"))
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
}

function registerAdvancedCommands(program: Command) {
	program
		.command("coupling [dir]")
		.description(t("cli.cmd.coupling"))
		.action(runCoupling);

	program
		.command("pr-risk")
		.description(t("cli.cmd.pr_risk"))
		.option("--files <list>", "Comma-separated list of changed files")
		.option("--stdin", "Read list of files from stdin")
		.option(
			"--threshold <number>",
			"Risk score threshold to exit with code 1 (default: 60)",
		)
		.action(runPrRisk);

	program
		.command("explain [topic]")
		.description(t("cli.cmd.explain"))
		.action(runExplain);

	program
		.command("time-machine [dir]")
		.description(t("cli.cmd.time_machine"))
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
		.description(t("cli.cmd.profile"))
		.option("-d, --dir <dir>", "Project directory (default: current)")
		.option(
			"--lang <language>",
			"Force language: js, ts, py (auto-detected by default)",
		)
		.option("--top <number>", "Number of top hotspots to show (default: 20)")
		.option("--json", "Output as JSON")
		.action(runProfileCommand);
}

function registerPluginCommands(program: Command) {
	const plugins = program
		.command("plugins")
		.description(t("cli.cmd.plugins"));

	plugins
		.command("list")
		.description(t("cli.cmd.plugins_list"))
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
}
