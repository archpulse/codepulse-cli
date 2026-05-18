import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { Rule } from "../types/rules";

export interface PluginInfo {
	name: string;
	description?: string;
	version?: string;
	author?: string;
	category?: string;
	enabled: boolean;
	file: string;
	rule: Rule;
}

function getPluginsDir(): string {
	const home = os.homedir();
	let baseDir: string;

	if (process.platform === "win32") {
		baseDir = process.env.APPDATA || path.join(home, "AppData", "Roaming");
	} else if (process.platform === "darwin") {
		baseDir = path.join(home, "Library", "Application Support");
	} else {
		baseDir = path.join(home, ".config");
	}

	const pluginsDir = path.join(baseDir, "codepulse", "plugins");
	if (!fs.existsSync(pluginsDir)) {
		fs.mkdirSync(pluginsDir, { recursive: true });
	}
	return pluginsDir;
}

async function forEachPlugin(
	callback: (ruleInstance: Rule, entryName: string) => void,
) {
	const pluginsDir = getPluginsDir();
	const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });

	for (const entry of entries) {
		if (entry.isFile() && entry.name.endsWith(".js")) {
			try {
				const pluginPath = path.join(pluginsDir, entry.name);
				const plugin = require(pluginPath);

				if (plugin?.default && typeof plugin.default === "function") {
					const ruleInstance = new plugin.default();
					if (ruleInstance.name && typeof ruleInstance.run === "function") {
						callback(ruleInstance, entry.name);
					}
				}
			} catch {
				// Silently skip or log depending on context
			}
		}
	}
}

export async function loadPlugins(): Promise<Rule[]> {
	const rules: Rule[] = [];
	await forEachPlugin((ruleInstance) => {
		ruleInstance.enabled = ruleInstance.enabled !== false;
		rules.push(ruleInstance);
	});
	return rules;
}

export async function listPlugins(): Promise<PluginInfo[]> {
	const plugins: PluginInfo[] = [];
	await forEachPlugin((ruleInstance, entryName) => {
		plugins.push({
			name: ruleInstance.name,
			description: ruleInstance.description || "No description provided",
			version: ruleInstance.version || "1.0.0",
			author: ruleInstance.author || "Unknown",
			category: ruleInstance.category || "custom",
			enabled: ruleInstance.enabled !== false,
			file: entryName,
			rule: ruleInstance,
		});
	});
	return plugins.sort((a, b) => a.name.localeCompare(b.name));
}
