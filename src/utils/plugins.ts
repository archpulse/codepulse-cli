import * as fs from "node:fs";
import * as path from "node:path";
import chalk from "chalk";
import type { Rule } from "../rules/rule";

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

export async function loadPlugins(dir: string): Promise<Rule[]> {
	const pluginsDir = path.join(dir, "plugins");
	const rules: Rule[] = [];

	if (!fs.existsSync(pluginsDir)) {
		return [];
	}

	const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });

	for (const entry of entries) {
		// Only load .js files (plugins should be compiled to JS)
		if (entry.isFile() && entry.name.endsWith(".js")) {
			try {
				const pluginPath = path.join(pluginsDir, entry.name);
				const plugin = require(pluginPath);

				if (plugin?.default && typeof plugin.default === "function") {
					const ruleInstance = new plugin.default();
					if (ruleInstance.name && typeof ruleInstance.run === "function") {
						// Validate and set defaults
						ruleInstance.enabled = ruleInstance.enabled !== false;
						rules.push(ruleInstance);
					}
				}
			} catch (err) {
				console.error(
					chalk.red(`  ! Failed to load plugin ${entry.name}:`),
					err,
				);
			}
		}
	}

	return rules;
}

export async function listPlugins(dir: string): Promise<PluginInfo[]> {
	const pluginsDir = path.join(dir, "plugins");
	const plugins: PluginInfo[] = [];

	if (!fs.existsSync(pluginsDir)) {
		return [];
	}

	const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });

	for (const entry of entries) {
		// Only list .js files (plugins should be compiled to JS)
		if (entry.isFile() && entry.name.endsWith(".js")) {
			const pluginPath = path.join(pluginsDir, entry.name);
			try {
				const plugin = require(pluginPath);

				if (plugin?.default && typeof plugin.default === "function") {
					const ruleInstance = new plugin.default();
					if (ruleInstance.name && typeof ruleInstance.run === "function") {
						plugins.push({
							name: ruleInstance.name,
							description:
								ruleInstance.description || "No description provided",
							version: ruleInstance.version || "1.0.0",
							author: ruleInstance.author || "Unknown",
							category: ruleInstance.category || "custom",
							enabled: ruleInstance.enabled !== false,
							file: entry.name,
							rule: ruleInstance,
						});
					}
				}
			} catch (_err) {
				// Silently skip invalid plugins during listing
			}
		}
	}

	return plugins.sort((a, b) => a.name.localeCompare(b.name));
}
