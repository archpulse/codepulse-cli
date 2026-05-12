import * as path from "node:path";
import chalk from "chalk";
import ora from "ora";
import { analyze } from "../analyzer";

/**
 * CLI handler for `codepulse coupling [dir]`.
 */
export async function runCoupling(dir = ".", opts: any = {}) {
	const absDir = path.resolve(dir);
	const spinner = ora("Analyzing git history for temporal coupling...").start();

	try {
		const result = await analyze(absDir, { pro: true, silent: true });
		spinner.stop();

		if (!result.temporalCouplings || result.temporalCouplings.length === 0) {
			console.log(chalk.yellow("\n  No significant temporal coupling found.\n"));
			return;
		}

		console.log(chalk.bold.cyan(`\n  🔗 Temporal Coupling Detector`));
		console.log(chalk.gray(`  (Files that frequently change together in the same commit)\n`));

		const header = `  ${"File A".padEnd(35)} ${"File B".padEnd(35)} ${"Degree"}`;
		console.log(chalk.bold.gray(header));
		console.log(chalk.gray(`  ${"─".repeat(header.length + 2)}`));

		for (const c of result.temporalCouplings.slice(0, 20)) {
			const degree = Math.round(c.couplingDegree * 100);
			const color = degree > 80 ? chalk.red : degree > 50 ? chalk.yellow : chalk.green;
			
			console.log(
				`  ${truncate(c.fileA, 35).padEnd(35)} ${truncate(c.fileB, 35).padEnd(35)} ${color(degree + "%")}`
			);
		}

		console.log(chalk.gray(`\n  * threshold: 50% co-change rate. Filtered by ${result.temporalCouplings.length} pairs.\n`));
	} catch (err) {
		spinner.fail("Coupling analysis failed");
		console.error(err);
	}
}

function truncate(str: string, maxLen: number): string {
	if (str.length <= maxLen) return str;
	return "..." + str.slice(-(maxLen - 3));
}
