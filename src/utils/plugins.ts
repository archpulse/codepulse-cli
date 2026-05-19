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

function getGlobalPluginsDir(): string {
	const home = os.homedir();
	let baseDir: string;

	if (process.platform === "win32") {
		baseDir = process.env.APPDATA || path.join(home, "AppData", "Roaming");
	} else if (process.platform === "darwin") {
		baseDir = path.join(home, "Library", "Application Support");
	} else {
		baseDir = path.join(home, ".config");
	}

	return path.join(baseDir, "codepulse", "plugins");
}

function getLocalPluginsDir(): string {
	return path.join(process.cwd(), "plugins");
}

async function forEachPlugin(
	callback: (ruleInstance: Rule, entryName: string) => void,
) {
	const searchDirs = [getGlobalPluginsDir(), getLocalPluginsDir()];

	for (const pluginsDir of searchDirs) {
		if (!fs.existsSync(pluginsDir)) continue;
		
		const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });

		for (const entry of entries) {
			if (entry.isFile() && (entry.name.endsWith(".js") || entry.name.endsWith(".ts"))) {
				try {
					const pluginPath = path.resolve(path.join(pluginsDir, entry.name));
					
					// Use require for CommonJS. 
					// For .ts files to work, the environment must have ts-node registered.
					const module = require(pluginPath);
					const PluginClass = module.default || module;

					if (typeof PluginClass === "function") {
						const ruleInstance = new PluginClass();
						if (ruleInstance.name && typeof ruleInstance.run === "function") {
							callback(ruleInstance, entry.name);
						}
					}
				} catch (err) {
					// console.error(`Failed to load plugin ${entry.name}:`, err);
				}
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
