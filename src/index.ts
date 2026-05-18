#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import chalk from "chalk";
import { normalizeScanArgs } from "./commands/scan";
import { type Locale, setLocale, t } from "./utils/i18n";
import { createProgram } from "./cli/program";
import { bootstrap } from "./cli/bootstrap";

export * from "./types/index";

const pkgPath = path.resolve(__dirname, "../package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

// Manually check for --lang flag before commander parses
const langIndex = process.argv.indexOf("--lang");
if (langIndex !== -1 && process.argv[langIndex + 1]) {
	setLocale(process.argv[langIndex + 1] as Locale);
}

async function start() {
	try {
		await bootstrap(pkg);
		const program = createProgram(pkg);

		// Global option for language (keep for documentation)
		program.option("--lang <locale>", t("cli.help.lang"));

		process.argv = normalizeScanArgs(process.argv);
		program.parse(process.argv);
	} catch (err) {
		console.error(chalk.red("Failed to start CodePulse:"), err);
		process.exit(1);
	}
}

start();
