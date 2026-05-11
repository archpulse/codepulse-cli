"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupMcpConfigs = setupMcpConfigs;
exports.shouldRunMcpSetup = shouldRunMcpSetup;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
function getConfigPaths(home, isWin, isMac, appData) {
    return [
        // Claude Desktop
        ...(isWin ? [path.join(appData, 'Claude', 'claude_desktop_config.json')] : isMac ? [path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')] : [path.join(home, '.config', 'Claude', 'claude_desktop_config.json')]),
        // Cline (VS Code)
        ...(isWin ? [path.join(appData, 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json')] : isMac ? [path.join(home, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json')] : [path.join(home, '.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json')]),
        // Roo Cline (VS Code)
        ...(isWin ? [path.join(appData, 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'mcp_settings.json')] : isMac ? [path.join(home, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'mcp_settings.json')] : [path.join(home, '.config', 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'mcp_settings.json')]),
        // Roo Cline (Cursor)
        ...(isWin ? [path.join(appData, 'Cursor', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'mcp_settings.json')] : isMac ? [path.join(home, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'mcp_settings.json')] : [path.join(home, '.config', 'Cursor', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'mcp_settings.json')]),
        // Cline (Cursor)
        ...(isWin ? [path.join(appData, 'Cursor', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json')] : isMac ? [path.join(home, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json')] : [path.join(home, '.config', 'Cursor', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json')]),
        // Windsurf
        ...(isWin ? [path.join(appData, 'Codeium', 'Windsurf', 'mcp_config.json')] : isMac ? [path.join(home, 'Library', 'Application Support', 'Codeium', 'Windsurf', 'mcp_config.json')] : [path.join(home, '.codeium', 'windsurf', 'mcp_config.json')]),
        // AnythingLLM
        ...(isWin ? [path.join(appData, 'anythingllm-desktop', 'storage', 'plugins', 'anythingllm_mcp_servers.json')] : isMac ? [path.join(home, 'Library', 'Application Support', 'anythingllm-desktop', 'storage', 'plugins', 'anythingllm_mcp_servers.json')] : [path.join(home, '.config', 'anythingllm-desktop', 'storage', 'plugins', 'anythingllm_mcp_servers.json')]),
        // OpenCode
        ...(isWin ? [path.join(appData, 'opencode', 'mcp.json')] : isMac ? [path.join(home, 'Library', 'Application Support', 'opencode', 'mcp.json')] : [path.join(home, '.config', 'opencode', 'mcp.json')]),
        // Legacy / Other
        path.join(home, '.cursor', 'mcp.json'),
        path.join(home, '.cursor', 'mcp_config.json'),
        path.join(home, '.gemini', 'antigravity', 'mcp_config.json'),
        path.join(home, '.gemini', 'mcp_config.json'),
        path.join(home, '.gemini', 'mcp.json'),
        path.join(home, '.gemini', 'settings.json'),
        path.join(home, '.qwen', 'mcp_config.json'),
        path.join(home, '.qwen', 'mcp.json'),
        path.join(home, '.qwen', 'settings.json'),
        path.join(home, '.claude', 'mcp.json'),
        path.join(home, '.claude', 'config.json'),
        path.join(home, '.claude.json'),
    ];
}
function readJsonConfig(configPath) {
    if (!fs.existsSync(configPath))
        return {};
    try {
        const content = fs.readFileSync(configPath, 'utf8');
        return content.trim() ? JSON.parse(content) : {};
    }
    catch {
        return {};
    }
}
function updateClaudeCodeConfig(configPath, mcpConfig) {
    const config = readJsonConfig(configPath);
    if (!config.projects)
        return false;
    for (const projectPath in config.projects) {
        if (!config.projects[projectPath].mcpServers) {
            config.projects[projectPath].mcpServers = {};
        }
        config.projects[projectPath].mcpServers.codepulse = {
            type: 'stdio',
            ...mcpConfig,
            env: {}
        };
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    return true;
}
function updateStandardConfig(configPath, mcpConfig) {
    const config = readJsonConfig(configPath);
    if (!config.mcpServers) {
        config.mcpServers = {};
    }
    const serverConfig = { ...mcpConfig };
    if (configPath.includes('.gemini') && configPath.endsWith('settings.json')) {
        serverConfig.trust = true;
    }
    config.mcpServers.codepulse = serverConfig;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    return true;
}
function setupMcpConfigs() {
    const home = os.homedir();
    const platform = os.platform();
    const isWin = platform === 'win32';
    const isMac = platform === 'darwin';
    const appData = process.env.APPDATA || (isWin ? path.join(home, 'AppData', 'Roaming') : '');
    const configs = getConfigPaths(home, isWin, isMac, appData);
    const mcpConfig = {
        command: isWin ? 'codepulse.cmd' : 'codepulse',
        args: ['mcp']
    };
    let configuredCount = 0;
    for (const configPath of configs) {
        const dir = path.dirname(configPath);
        if (fs.existsSync(dir) || configPath === path.join(home, '.claude.json')) {
            try {
                let updated = false;
                if (configPath.endsWith('.claude.json')) {
                    updated = updateClaudeCodeConfig(configPath, mcpConfig);
                }
                else {
                    updated = updateStandardConfig(configPath, mcpConfig);
                }
                if (updated)
                    configuredCount++;
            }
            catch (err) {
                // Silently ignore
            }
        }
    }
    if (configuredCount > 0) {
        const codepulseDir = path.join(home, '.codepulse');
        if (!fs.existsSync(codepulseDir)) {
            fs.mkdirSync(codepulseDir, { recursive: true });
        }
        fs.writeFileSync(path.join(codepulseDir, 'mcp-setup-done'), new Date().toISOString(), 'utf8');
    }
    return configuredCount;
}
function shouldRunMcpSetup() {
    const markerPath = path.join(os.homedir(), '.codepulse', 'mcp-setup-done');
    return !fs.existsSync(markerPath);
}
//# sourceMappingURL=mcp-setup.js.map