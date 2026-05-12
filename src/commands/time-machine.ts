import * as path from "node:path";
import chalk from "chalk";
import ora from "ora";
import { runTimeMachine } from "../analyzer/time-machine/engine";
import type { SamplingStrategy } from "../types/index";

const isWin = process.platform === "win32";
const sym = {
	bullet: isWin ? "*" : "•",
	check: isWin ? "v" : "✓",
	arrow: isWin ? "->" : "→",
	line: isWin ? "-" : "─",
};

/**
 * CLI handler for `codepulse time-machine [dir]`.
 */
export async function runTimeMachineCommand(
	dir = ".",
	opts: {
		commits?: string;
		strategy?: string;
		interval?: string;
		since?: string;
		json?: boolean;
	} = {},
): Promise<void> {
	const absDir = path.resolve(dir);

	const strategy = resolveStrategy(opts);
	const spinner = ora("Scanning git history...").start();

	try {
		const result = await runTimeMachine({
			dir: absDir,
			strategy,
			since: opts.since,
			onProgress: (current, total, sha) => {
				spinner.text = `Processing commit ${current}/${total} [${sha.slice(0, 7)}]`;
			},
		});

		spinner.stop();

		if (result.snapshots.length === 0) {
			console.log(
				chalk.yellow("\n  No commits found. Is this a git repository?\n"),
			);
			return;
		}

		if (opts.json) {
			console.log(JSON.stringify(result, null, 2));
			return;
		}

		printTimeMachineSummary(result);
	} catch (err) {
		spinner.fail("Time Machine analysis failed");
		console.error(err);
	}
}

function resolveStrategy(opts: {
	commits?: string;
	strategy?: string;
	interval?: string;
}): SamplingStrategy {
	const strategyType = opts.strategy ?? "max-points";

	switch (strategyType) {
		case "every-nth":
			return {
				type: "every-nth",
				n: Number.parseInt(opts.commits ?? "10", 10),
			};
		case "interval":
			return {
				type: "date-interval",
				interval: (opts.interval as "daily" | "weekly" | "monthly") ?? "weekly",
			};
		case "tag-only":
			return { type: "tag-only" };
		default:
			return {
				type: "max-points",
				count: Number.parseInt(opts.commits ?? "30", 10),
			};
	}
}

function printTimeMachineSummary(result: any): void {
	const { snapshots, totalCommitsScanned, totalParseOperations, cacheHits } =
		result;

	console.log(`\n${chalk.bold.cyan(`  ${sym.line.repeat(52)}`)}`);
	console.log(chalk.bold.white("  Dependency Graph Time Machine"));
	console.log(`${chalk.cyan(`  ${sym.line.repeat(52)}`)}\n`);

	console.log(
		`  ${chalk.gray("Commits scanned:")}  ${chalk.white(totalCommitsScanned)}`,
	);
	console.log(
		`  ${chalk.gray("Snapshots taken:")}  ${chalk.white(snapshots.length)}`,
	);
	console.log(
		`  ${chalk.gray("AST parses:")}       ${chalk.white(totalParseOperations)}`,
	);
	console.log(`  ${chalk.gray("Cache hits:")}       ${chalk.green(cacheHits)}`);

	const efficiency =
		totalParseOperations + cacheHits > 0
			? Math.round((cacheHits / (totalParseOperations + cacheHits)) * 100)
			: 0;
	console.log(
		`  ${chalk.gray("Cache efficiency:")} ${chalk.green(`${efficiency}%`)}\n`,
	);

	// Show timeline summary
	console.log(chalk.bold.white("  Timeline:"));
	const first = snapshots[0];
	const last = snapshots[snapshots.length - 1];

	if (first && last) {
		console.log(
			`  ${chalk.gray(formatDate(first.date))} ${sym.arrow} ${chalk.gray(formatDate(last.date))}`,
		);
		console.log(
			`  ${chalk.gray("Files:")} ${first.stats.files} ${sym.arrow} ${last.stats.files}`,
		);
		console.log(
			`  ${chalk.gray("Lines:")} ${first.stats.totalLines} ${sym.arrow} ${last.stats.totalLines}`,
		);
		console.log(
			`  ${chalk.gray("Avg Complexity:")} ${first.stats.avgComplexity} ${sym.arrow} ${last.stats.avgComplexity}`,
		);

		const edgesDelta = last.graph.edges.length - first.graph.edges.length;
		const sign = edgesDelta >= 0 ? "+" : "";
		console.log(
			`  ${chalk.gray("Dependencies:")} ${first.graph.edges.length} ${sym.arrow} ${last.graph.edges.length} (${chalk[edgesDelta > 0 ? "red" : "green"](`${sign}${edgesDelta}`)})`,
		);
	}

	console.log(
		`\n  ${chalk.green(sym.check)} Snapshots saved to ${chalk.cyan(".codepulse-cache/snapshots/")}\n`,
	);
}

function formatDate(iso: string): string {
	try {
		return new Date(iso).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	} catch {
		return iso.slice(0, 10);
	}
}
