import chalk from "chalk";
import { EXPLANATIONS, type ExplainKey } from "../explain";

export function listExplainTopics(sym: any) {
	const topics = Object.keys(EXPLANATIONS) as ExplainKey[];
	console.log(`\n${chalk.bold.cyan("  CodePulse — Available Topics")}`);
	console.log(`${chalk.gray(sym.line.repeat(30))}\n`);
	for (const key of topics) {
		const e = EXPLANATIONS[key];
		console.log(`  ${chalk.cyan(key)}`);
		console.log(`    ${chalk.gray(e.short)}\n`);
	}
	console.log(
		chalk.gray(`  Usage: ${chalk.white("codepulse explain <topic>")}\n`),
	);
}

export function explainTopic(topic: string, sym: any) {
	const key = topic.toLowerCase() as ExplainKey;
	const entry = EXPLANATIONS[key];

	if (!entry) {
		const topics = Object.keys(EXPLANATIONS) as ExplainKey[];
		console.log(chalk.red(`\n  Unknown topic: "${topic}"`));
		console.log(chalk.gray(`  Available: ${topics.join(", ")}\n`));
		process.exit(1);
	}

	const { full } = entry;

	console.log(`\n${chalk.bold.cyan(sym.line.repeat(52))}`);
	console.log(chalk.bold.white(`  ${key.toUpperCase().replace(/-/g, " ")}`));
	console.log(`${chalk.cyan(sym.line.repeat(52))}\n`);

	console.log(`  ${chalk.white(full.description)}\n`);

	console.log(chalk.bold.yellow("  Detected when:"));
	for (const c of full.criteria) {
		console.log(`    ${chalk.gray(sym.bullet)} ${c}`);
	}

	console.log(`\n${chalk.bold.red("  Risks:")}`);
	for (const r of full.risks) {
		console.log(`    ${chalk.red(sym.cross)} ${r}`);
	}

	console.log(`\n${chalk.bold.green("  Recommended fixes:")}`);
	for (const f of full.fix) {
		console.log(`    ${chalk.green(sym.check)} ${f}`);
	}

	console.log(`\n${chalk.gray(sym.line.repeat(52))}\n`);
}

export function runExplain(topic?: string) {
	const isWin = process.platform === "win32";
	const sym = {
		bullet: isWin ? "*" : "•",
		cross: isWin ? "x" : "✗",
		check: isWin ? "v" : "✓",
		line: isWin ? "-" : "─",
	};

	if (!topic) {
		listExplainTopics(sym);
		return;
	}

	explainTopic(topic, sym);
}
