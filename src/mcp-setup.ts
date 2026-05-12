import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getConfigPaths } from "./mcp-paths";

function readJsonConfig(configPath: string): any {
	if (!fs.existsSync(configPath)) return {};
	try {
		const content = fs.readFileSync(configPath, "utf8");
		return content.trim() ? JSON.parse(content) : {};
	} catch {
		return {};
	}
}

function updateGitHubCopilotConfig(
	configPath: string,
	mcpConfig: any,
): boolean {
	const config = readJsonConfig(configPath);
	if (!config.mcpServers) {
		config.mcpServers = {};
	}
	config.mcpServers.codepulse = {
		type: "stdio",
		...mcpConfig,
	};
	fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
	return true;
}

function updateClaudeCodeConfig(configPath: string, mcpConfig: any): boolean {
	const config = readJsonConfig(configPath);

	// If it has projects (Claude CLI style)
	if (config.projects) {
		for (const projectPath in config.projects) {
			if (!config.projects[projectPath].mcpServers) {
				config.projects[projectPath].mcpServers = {};
			}
			config.projects[projectPath].mcpServers.codepulse = {
				type: "stdio",
				...mcpConfig,
				env: {},
			};
		}
		fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
		return true;
	}

	// Fallback to standard config if it's just a flat config file
	return updateStandardConfig(configPath, mcpConfig);
}

function updateZedConfig(configPath: string, mcpConfig: any): boolean {
	const config = readJsonConfig(configPath);
	if (!config.context_servers) {
		config.context_servers = {};
	}
	config.context_servers.codepulse = {
		command: mcpConfig.command,
		args: mcpConfig.args,
	};
	fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
	return true;
}

function updateStandardConfig(configPath: string, mcpConfig: any): boolean {
	const config = readJsonConfig(configPath);
	const pathLower = configPath.toLowerCase();

	const { key, isKiloCLI, isOpenCode } = getConfigKeyAndContext(
		config,
		pathLower,
	);

	if (!config[key]) {
		config[key] = {};
	}

	config[key].codepulse = buildServerConfig(
		mcpConfig,
		pathLower,
		isKiloCLI,
		isOpenCode,
	);
	fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
	return true;
}

function getConfigKeyAndContext(config: any, pathLower: string) {
	const isKiloCLI =
		pathLower.includes("kilo") && !pathLower.includes("kilocode");
	const isOpenCode = pathLower.includes("opencode");

	let key = "mcpServers";
	if (config.mcp || isKiloCLI || isOpenCode) {
		key = "mcp";
	}
	return { key, isKiloCLI, isOpenCode };
}

function buildServerConfig(
	mcpConfig: any,
	pathLower: string,
	isKiloCLI: boolean,
	isOpenCode: boolean,
) {
	const serverConfig: any = { ...mcpConfig };

	if (pathLower.includes(".gemini")) {
		serverConfig.trust = true;
	}

	const needsArrayCommand =
		isKiloCLI ||
		isOpenCode ||
		pathLower.includes("openclaude") ||
		pathLower.includes("claude.json");

	if (needsArrayCommand) {
		serverConfig.command = [mcpConfig.command, ...mcpConfig.args];
		delete serverConfig.args;

		if (isKiloCLI || isOpenCode) {
			serverConfig.type = "local";
			serverConfig.enabled = true;
		}
	}
	return serverConfig;
}

export function setupMcpConfigs() {
	const home = os.homedir();
	const platform = os.platform();
	const isWin = platform === "win32";
	const isMac = platform === "darwin";
	const appData =
		process.env.APPDATA || (isWin ? path.join(home, "AppData", "Roaming") : "");

	const configs = getConfigPaths(home, isWin, isMac, appData);
	const mcpConfig = {
		command: isWin ? "codepulse.cmd" : "codepulse",
		args: ["mcp"],
	};

	let configuredCount = 0;

	for (const configPath of configs) {
		if (shouldUpdateConfig(configPath, home)) {
			try {
				if (updateConfigByPath(configPath, mcpConfig)) {
					configuredCount++;
				}
			} catch (_err) {
				// Silently ignore
			}
		}
	}

	if (configuredCount > 0) {
		markMcpSetupDone(home);
	}

	return configuredCount;
}

function shouldUpdateConfig(configPath: string, home: string): boolean {
	const dir = path.dirname(configPath);
	return fs.existsSync(dir) || configPath === path.join(home, ".claude.json");
}

function updateConfigByPath(configPath: string, mcpConfig: any): boolean {
	if (configPath.includes("github-copilot")) {
		return updateGitHubCopilotConfig(configPath, mcpConfig);
	}
	if (configPath.toLowerCase().includes("zed")) {
		return updateZedConfig(configPath, mcpConfig);
	}
	if (configPath.endsWith(".claude.json")) {
		return updateClaudeCodeConfig(configPath, mcpConfig);
	}
	return updateStandardConfig(configPath, mcpConfig);
}

function markMcpSetupDone(home: string) {
	const codepulseDir = path.join(home, ".codepulse");
	if (!fs.existsSync(codepulseDir)) {
		fs.mkdirSync(codepulseDir, { recursive: true });
	}
	fs.writeFileSync(
		path.join(codepulseDir, "mcp-setup-done"),
		new Date().toISOString(),
		"utf8",
	);
}

export function markDepsAsInstalled() {
	const codepulseDir = path.join(os.homedir(), ".codepulse");
	if (!fs.existsSync(codepulseDir)) {
		fs.mkdirSync(codepulseDir, { recursive: true });
	}
	fs.writeFileSync(
		path.join(codepulseDir, "deps-setup-done"),
		new Date().toISOString(),
		"utf8",
	);
}

export function shouldRunMcpSetup(): boolean {
	const markerPath = path.join(os.homedir(), ".codepulse", "mcp-setup-done");
	return !fs.existsSync(markerPath);
}

export function shouldRunDepsSetup(): boolean {
	const markerPath = path.join(os.homedir(), ".codepulse", "deps-setup-done");
	return !fs.existsSync(markerPath);
}
