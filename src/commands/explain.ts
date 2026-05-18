import chalk from "chalk";
import { EXPLANATIONS, type ExplainKey } from "../explain";
import { SYMBOLS } from "../utils/terminal";

export function listExplainTopics() {
	const topics = Object.keys(EXPLANATIONS) as ExplainKey[];
	console.log(`\n${chalk.bold.cyan("  CodePulse — Available Topics")}`);
	console.log(`${chalk.gray(SYMBOLS.line.repeat(30))}\n`);
	for (const key of topics) {
		const e = EXPLANATIONS[key];
		console.log(`  ${chalk.cyan(key)}`);
		console.log(`    ${chalk.gray(e.short)}\n`);
	}
	console.log(
		chalk.gray(`  Usage: ${chalk.white("codepulse explain <topic>")}\n`),
	);
}

export function explainTopic(topic: string) {
	const key = topic.toLowerCase() as ExplainKey;
	const entry = EXPLANATIONS[key];

	if (!entry) {
		const topics = Object.keys(EXPLANATIONS) as ExplainKey[];
		console.log(chalk.red(`\n  Unknown topic: "${topic}"`));
		console.log(chalk.gray(`  Available: ${topics.join(", ")}\n`));
		process.exit(1);
	}

	const { full } = entry;

	console.log(`\n${chalk.bold.cyan(SYMBOLS.line.repeat(52))}`);
	console.log(chalk.bold.white(`  ${key.toUpperCase().replace(/-/g, " ")}`));
	console.log(`${chalk.cyan(SYMBOLS.line.repeat(52))}\n`);

	console.log(`  ${chalk.white(full.description)}\n`);

	console.log(chalk.bold.yellow("  Detected when:"));
	for (const c of full.criteria) {
		console.log(`    ${chalk.gray(SYMBOLS.bullet)} ${c}`);
	}

	console.log(`\n${chalk.bold.red("  Risks:")}`);
	for (const r of full.risks) {
		console.log(`    ${chalk.red(SYMBOLS.cross)} ${r}`);
	}

	console.log(`\n${chalk.bold.green("  Recommended fixes:")}`);
	for (const f of full.fix) {
		console.log(`    ${chalk.green(SYMBOLS.check)} ${f}`);
	}

	console.log(`\n${chalk.gray(SYMBOLS.line.repeat(52))}\n`);
}

export function runExplain(topic?: string) {
	if (!topic) {
		listExplainTopics();
		return;
	}

	explainTopic(topic);
}
