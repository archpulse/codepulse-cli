import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// ─── The Master Rule Set ─────────────────────────────────────────────

export const CODEPULSE_AGENT_RULES = `# CodePulse — Architectural Intelligence (MCP)

You have a professional code architecture analyzer installed as an MCP tool called **CodePulse**. 
It performs deep AST-based static analysis, builds dependency graphs, and computes cyclomatic complexity.

## MANDATORY WORKFLOW

### 1. Context Acquisition (On Session Start)
- **ALWAYS** call \`codepulse_identity\` first. It returns a 0-100 Health Score and identifies:
  - **God Files**: Modules that are too large and MUST be split.
  - **Critical Nodes**: High-dependency files (highest risk for changes).
  - **Hotspots**: Complex files with high churn (priority for refactoring).

### 2. Risk Assessment (Before Editing)
- **ALWAYS** call \`get_file_context(file: "...path...")\` before modifying any file.
- It reveals **Temporal Coupling** (hidden dependencies from git history) and structural risks.

### 3. Quality Assurance (Before Refactoring)
- Call \`analyze_project\` with \`focus\` filters to identify specific technical debt.
- Call \`find_dead_code\` to clean up unused exports.

## Core Tools Registry

| Tool | Primary Use Case |
|------|------------------|
| \`codepulse_identity\` | Project health overview & refactoring targets |
| \`get_file_context\` | Pre-edit risk check (reveals hidden couplings) |
| \`analyze_project\` | Detailed debt analysis (complexity, god files, etc.) |
| \`get_hotspots\` | Prioritizing where to fix bugs/refactor first |
| \`find_dead_code\` | Removing unused code safely |

## Guiding Principles
- Never guess code quality — verify with CodePulse metrics.
- Prioritize Hotspots over random exploration.
- Maintain the architectural boundaries identified in the dependency graph.
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
