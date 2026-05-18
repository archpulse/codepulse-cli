import chalk from "chalk";
import updateNotifier from "update-notifier";
import { runInstallDeps } from "../commands";
import {
	markDepsAsInstalled,
	setupMcpConfigs,
	shouldRunDepsSetup,
	shouldRunMcpSetup,
} from "../mcp-setup";
import { SYMBOLS } from "../utils/terminal";

export async function notifyAboutUpdates(pkg: any, notifier: any): Promise<void> {
	try {
		const update = await notifier.fetchInfo();
		const mutableNotifier = notifier as typeof notifier & {
			update: Awaited<ReturnType<typeof notifier.fetchInfo>>;
		};
		mutableNotifier.update = update;
		if (update.latest !== update.current) {
			mutableNotifier.notify({ isGlobal: true, defer: false });
		}
	} catch {
		// Ignore registry/network errors so startup remains usable offline.
	}
}

export async function bootstrap(pkg: any) {
	const notifier = updateNotifier({
		pkg,
		distTag: "latest",
		shouldNotifyInNpmScript: true,
	});

	await notifyAboutUpdates(pkg, notifier);

	// 1. Dependency Setup (Independently of MCP)
	if (shouldRunDepsSetup()) {
		await runInstallDeps(true);
		markDepsAsInstalled();
	}

	// 2. MCP Setup
	if (shouldRunMcpSetup()) {
		const count = setupMcpConfigs();
		if (count > 0) {
			console.log(
				chalk.green(
					`\n  ${SYMBOLS.check} Automatically configured CodePulse as an MCP server for ${count} AI agent(s) on your PC!\n`,
				),
			);
		}
	}
}
