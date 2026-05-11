import * as path from "node:path";

function getWinPaths(appData: string): string[] {
	return [
		path.join(appData, "github-copilot", "mcp_server_config.json"),
		path.join(appData, "Claude", "claude_desktop_config.json"),
		path.join(appData, "OpenClaude", "config.json"),
		path.join(appData, "opencode", "mcp.json"),
		path.join(
			appData,
			"Code",
			"User",
			"globalStorage",
			"kilocode.kilo-code",
			"settings",
			"mcp_settings.json",
		),
		path.join(appData, "Kiro", "mcp_config.json"),
		path.join(appData, "Zed", "settings.json"),
		path.join(
			appData,
			"Code",
			"User",
			"globalStorage",
			"saoudrizwan.claude-dev",
			"settings",
			"cline_mcp_settings.json",
		),
		path.join(
			appData,
			"Code",
			"User",
			"globalStorage",
			"rooveterinaryinc.roo-cline",
			"settings",
			"mcp_settings.json",
		),
		path.join(
			appData,
			"Cursor",
			"User",
			"globalStorage",
			"rooveterinaryinc.roo-cline",
			"settings",
			"mcp_settings.json",
		),
		path.join(
			appData,
			"Cursor",
			"User",
			"globalStorage",
			"saoudrizwan.claude-dev",
			"settings",
			"cline_mcp_settings.json",
		),
		path.join(appData, "Codeium", "Windsurf", "mcp_config.json"),
		path.join(
			appData,
			"anythingllm-desktop",
			"storage",
			"plugins",
			"anythingllm_mcp_servers.json",
		),
	];
}

function getMacPaths(home: string): string[] {
	const appSupport = path.join(home, "Library", "Application Support");
	return [
		path.join(appSupport, "github-copilot", "mcp_server_config.json"),
		path.join(appSupport, "Claude", "claude_desktop_config.json"),
		path.join(appSupport, "OpenClaude", "config.json"),
		path.join(appSupport, "opencode", "mcp.json"),
		path.join(
			appSupport,
			"Code",
			"User",
			"globalStorage",
			"kilocode.kilo-code",
			"settings",
			"mcp_settings.json",
		),
		path.join(appSupport, "Kiro", "mcp_config.json"),
		path.join(appSupport, "Zed", "settings.json"),
		path.join(
			appSupport,
			"Code",
			"User",
			"globalStorage",
			"saoudrizwan.claude-dev",
			"settings",
			"cline_mcp_settings.json",
		),
		path.join(
			appSupport,
			"Code",
			"User",
			"globalStorage",
			"rooveterinaryinc.roo-cline",
			"settings",
			"mcp_settings.json",
		),
		path.join(
			appSupport,
			"Cursor",
			"User",
			"globalStorage",
			"rooveterinaryinc.roo-cline",
			"settings",
			"mcp_settings.json",
		),
		path.join(
			appSupport,
			"Cursor",
			"User",
			"globalStorage",
			"saoudrizwan.claude-dev",
			"settings",
			"cline_mcp_settings.json",
		),
		path.join(appSupport, "Codeium", "Windsurf", "mcp_config.json"),
		path.join(
			appSupport,
			"anythingllm-desktop",
			"storage",
			"plugins",
			"anythingllm_mcp_servers.json",
		),
	];
}

function getLinuxPaths(home: string): string[] {
	const configDir = path.join(home, ".config");
	return [
		path.join(configDir, "github-copilot", "mcp_server_config.json"),
		path.join(configDir, "Claude", "claude_desktop_config.json"),
		path.join(configDir, "OpenClaude", "config.json"),
		path.join(configDir, "opencode", "mcp.json"),
		path.join(
			home,
			".vscode",
			"data",
			"User",
			"globalStorage",
			"kilocode.kilo-code",
			"settings",
			"mcp_settings.json",
		),
		path.join(configDir, "Kiro", "mcp_config.json"),
		path.join(configDir, "zed", "settings.json"),
		path.join(
			configDir,
			"Code",
			"User",
			"globalStorage",
			"saoudrizwan.claude-dev",
			"settings",
			"cline_mcp_settings.json",
		),
		path.join(
			configDir,
			"Code",
			"User",
			"globalStorage",
			"rooveterinaryinc.roo-cline",
			"settings",
			"mcp_settings.json",
		),
		path.join(
			configDir,
			"Cursor",
			"User",
			"globalStorage",
			"rooveterinaryinc.roo-cline",
			"settings",
			"mcp_settings.json",
		),
		path.join(
			configDir,
			"Cursor",
			"User",
			"globalStorage",
			"saoudrizwan.claude-dev",
			"settings",
			"cline_mcp_settings.json",
		),
		path.join(home, ".codeium", "windsurf", "mcp_config.json"),
		path.join(
			configDir,
			"anythingllm-desktop",
			"storage",
			"plugins",
			"anythingllm_mcp_servers.json",
		),
	];
}

export function getConfigPaths(
	home: string,
	isWin: boolean,
	isMac: boolean,
	appData: string,
): string[] {
	const osPaths = isWin
		? getWinPaths(appData)
		: isMac
			? getMacPaths(home)
			: getLinuxPaths(home);

	return [
		path.join(home, ".copilot", "mcp-config.json"),
		path.join(home, ".openclaude", "config.json"),
		path.join(home, ".openclaude", "mcp_config.json"),
		path.join(home, ".openclaude-profile.json"),
		path.join(home, ".claude.json"),
		path.join(home, ".opencode", "mcp.json"),
		path.join(home, ".opencode", "config.json"),
		path.join(home, ".kilocode", "mcp_config.json"),
		path.join(home, ".kilocode", "config.json"),
		path.join(home, ".kilocode", "mcp.json"),
		path.join(home, ".kilo-code", "mcp_config.json"),
		path.join(home, ".config", "kilo", "kilo.json"),
		path.join(home, ".config", "kilo", "kilo.jsonc"),
		path.join(home, "kilo.json"),
		path.join(home, ".kiro", "settings", "mcp.json"),
		path.join(home, ".kiro", "mcp_config.json"),
		path.join(home, ".kiro", "config.json"),
		path.join(home, ".pi", "agent", "mcp.json"),
		path.join(home, ".pi", "mcp.json"),
		path.join(home, ".mcp.json"),
		path.join(home, ".gemini", "antigravity", "mcp_config.json"),
		path.join(home, ".gemini", "mcp_config.json"),
		path.join(home, ".gemini", "settings.json"),
		path.join(home, ".cursor", "mcp.json"),
		path.join(home, ".cursor", "mcp_config.json"),
		path.join(home, ".qwen", "mcp_config.json"),
		path.join(home, ".qwen", "mcp.json"),
		path.join(home, ".qwen", "settings.json"),
		path.join(home, ".claude", "mcp.json"),
		path.join(home, ".claude", "config.json"),
		...osPaths,
	];
}
