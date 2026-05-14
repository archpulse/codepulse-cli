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
	description: string;
}

export const SUPPORTED_AGENTS: AgentConfig[] = [
	{ name: "Cline", filename: ".clinerules", description: "Cline / Roo-Cline" },
	{ name: "Cursor", filename: ".cursorrules", description: "Cursor IDE" },
	{ name: "Windsurf", filename: ".windsurfrules", description: "Windsurf (Codeium)" },
	{ name: "GitHub Copilot", filename: ".github/copilot-instructions.md", description: "Copilot Extensions" },
	{ name: "Claude Code", filename: "CLAUDE.md", description: "Claude CLI" },
	{ name: "Codex", filename: "CODEX.md", description: "Codex CLI" },
	{ name: "Aider", filename: ".aider.conf.yml", description: "Aider (as comments or context)" },
	{ name: "Cody", filename: ".cody/context.json", description: "Sourcegraph Cody" },
	{ name: "Continue", filename: ".continue/config.json", description: "Continue.dev" },
	{ name: "PearAI", filename: ".pearrules", description: "PearAI" },
	{ name: "Supermaven", filename: ".supermavenrules", description: "Supermaven" },
	{ name: "Void", filename: ".voidrules", description: "Void Editor" },
	{ name: "Antigravity", filename: ".antigravityrules", description: "Antigravity AI" },
	{ name: "Gemini CLI", filename: ".gemini-instructions.md", description: "Gemini CLI Agent" },
	{ name: "Qwen", filename: ".qwenrules", description: "Qwen AI" },
	{ name: "AMP", filename: ".amprules", description: "AMP (AI-Modified Projects)" },
	{ name: "OpenCode", filename: ".opencoderules", description: "OpenCode" },
	{ name: "Kilo", filename: ".kilorules", description: "Kilo CLI" },
	{ name: "Trae", filename: ".traerules", description: "Trae IDE" },
	{ name: "Pi Coding Agent", filename: ".pirules", description: "Pi Coding Agent" },
	{ name: "Kiro CLI", filename: ".kirorules", description: "Kiro CLI" },
	// Global variants
	{ name: "Cline Global", filename: ".clinerules", global: true, description: "Global Cline rules" },
	{ name: "Cursor Global", filename: ".cursorrules", global: true, description: "Global Cursor rules" },
	{ name: "Gemini CLI Global", filename: ".gemini-instructions.md", global: true, description: "Global Gemini CLI rules" },
];

/**
 * Generates all rule files for supported agents.
 */
export function generateAllAgentRules(targetDir: string) {
	const generated: { path: string; name: string }[] = [];

	for (const agent of SUPPORTED_AGENTS) {
		const baseDir = agent.global ? os.homedir() : path.join(targetDir, "rules");
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
		} catch (err) {
			// Skip failed files (permission issues etc)
		}
	}

	return generated;
}
