import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// ─── The Master Rule Set ─────────────────────────────────────────────

export const CODEPULSE_AGENT_RULES = `# CodePulse - Architectural Support (MCP)

CodePulse is available through MCP as a secondary source of architectural evidence.

## Default Workflow

1. Read the relevant files and trace the code manually first.
2. If the answer is still unclear, use \`codepulse_identity\` for a project-wide map.
3. Before editing a risky file, use \`get_file_context\` when the file looks central or historically volatile.
4. For broader refactors or cleanup, use \`analyze_project\`, \`get_hotspots\`, and \`find_dead_code\` to confirm what manual inspection suggests.

## Core Tools Registry

| Tool | When to use |
|------|-------------|
| \`codepulse_identity\` | When you need a quick architectural map or a first-pass health check |
| \`get_file_context\` | Before editing a file that may have hidden dependencies or high impact |
| \`analyze_project\` | When you need a broader debt scan or confirmation of a suspected issue |
| \`get_hotspots\` | When you want to prioritize likely refactor targets |
| \`find_dead_code\` | When you are cleaning up unused exports and obvious leftovers |

## Guiding Principles

- Treat CodePulse as a verifier, not a substitute for reading the code.
- Prefer manual inspection for local or obvious changes.
- Use the tools when you need broader context, dependency risk, or dead-code confirmation.
`;

// ─── Agent Registry ──────────────────────────────────────────────────

export interface AgentConfig {
	name: string;
	filename: string;
	global?: boolean; // If some agents prefer home directory
	type: "prompt" | "rule";
	description: string;
}

export const SUPPORTED_AGENTS: AgentConfig[] = [
	{
		name: "Cline",
		filename: ".clinerules",
		type: "prompt",
		description: "Cline / Roo-Cline",
	},
	{
		name: "Cursor",
		filename: "AGENTS.md",
		type: "prompt",
		description: "Cursor IDE",
	},
	{
		name: "Windsurf",
		filename: "agents.md",
		type: "prompt",
		description: "Windsurf (Codeium)",
	},
	{
		name: "GitHub Copilot",
		filename: ".github/copilot-instructions.md",
		type: "prompt",
		description: "Copilot Extensions",
	},
	{
		name: "Claude Code",
		filename: "CLAUDE.md",
		type: "prompt",
		description: "Claude CLI",
	},
	{
		name: "Codex",
		filename: "AGENTS.md",
		type: "prompt",
		description: "Codex CLI",
	},
	{
		name: "Aider",
		filename: "CONVENTIONS.md",
		type: "prompt",
		description: "Aider (as comments or context)",
	},
	{
		name: "Cody",
		filename: "AGENT.md",
		type: "prompt",
		description: "Sourcegraph Cody",
	},
	{
		name: "Continue",
		filename: ".continue/rules/codepulse.md",
		type: "prompt",
		description: "Continue.dev",
	},
	{
		name: "PearAI",
		filename: "AGENT.md",
		type: "prompt",
		description: "PearAI",
	},
	{
		name: "Supermaven",
		filename: "AGENT.md",
		type: "prompt",
		description: "Supermaven",
	},
	{
		name: "Void",
		filename: "AGENT.md",
		type: "prompt",
		description: "Void Editor"
	},
	{
		name: "Antigravity",
		filename: "agent.md",
		type: "prompt",
		description: "Antigravity AI"
	},
	{
		name: "Gemini CLI",
		filename: "gemini.md",
		type: "prompt",
		description: "Gemini CLI Agent"
	},
	{
		name: "Qwen",
		filename: "QWEN.md",
		type: "prompt",
		description: "Qwen AI"
	},
	{
		name: "AMP",
		filename: "AGENTS.md",
		type: "prompt",
		description: "AMP (AI-Modified Projects)"
	},
	{
		name: "OpenCode",
		filename: "AGENTS.md",
		type: "prompt",
		description: "OpenCode"
	},
	{
		name: "Kilo",
		filename: "AGENTS.md",
		type: "prompt",
		description: "Kilo CLI"
	},
	{
		name: "Trae",
		filename: "AGENT.md",
		type: "prompt",
		description: "Trae IDE"
	},
	{
		name: "Pi Coding Agent",
		filename: "SKILL.md",
		type: "prompt",
		description: "Pi Coding Agent"
	},
	{
		name: "Kiro CLI",
		filename: ".kiro/steering/codepulse.md",
		type: "prompt",
		description: "Kiro CLI"
	},
];

/**
 * Generates all rule files for supported agents.
 */
export function generateAllAgentRules(targetDir: string) {
	const generated: { path: string; name: string }[] = [];

	for (const agent of SUPPORTED_AGENTS) {
		// Rules go to home dir (global), Prompts go to project root
		const baseDir = agent.type === "rule" ? os.homedir() : targetDir;
		const filePath = path.join(baseDir, agent.filename);
		
		try {
			// Ensure parent directory exists (e.g. .github/ or .cody/)
			const parent = path.dirname(filePath);
			if (!fs.existsSync(parent)) {
				fs.mkdirSync(parent, { recursive: true });
			}

			let content = CODEPULSE_AGENT_RULES;
			
			if (fs.existsSync(filePath)) {
				const existing = fs.readFileSync(filePath, "utf-8");
				if (existing.includes("CodePulse")) continue;
				
				// Handle JSON-based configs differently if needed, 
				// but for most rules we just append markdown or comments.
				if (agent.filename.endsWith(".json")) {
					// For JSON configs, we often just want to remind they exist 
					// or handle them manually. For now, we'll skip binary/complex JSON.
					continue; 
				}
				
				content = `${existing}\n\n${CODEPULSE_AGENT_RULES}`;
			}

			fs.writeFileSync(filePath, content, "utf-8");
			generated.push({ path: filePath, name: agent.name });
		} catch {
			// Skip failed files (permission issues etc)
		}
	}

	return generated;
}
