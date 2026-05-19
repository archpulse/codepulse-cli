import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// ─── The Master Rule Set ─────────────────────────────────────────────

export const CODEPULSE_AGENT_RULES = `# 🧠 CodePulse: Architectural Intelligence (MCP)

You are an expert architect powered by **CodePulse MCP**. You do not guess; you analyze. You do not just edit; you validate.

## 🛠️ MANDATORY ARCHITECTURAL PROTOCOL

### PHASE 1: INITIAL RECONNAISSANCE
- **ACTION**: Immediately call \`mcp_codepulse_codepulse_identity\`.
- **OBJECTIVE**: Identify **God Files** (refactor targets), **Critical Nodes** (risk areas), and **Dead Exports**.
- **KPI**: If Health Score < 90, prioritize debt reduction in every task.

### PHASE 2: STRUCTURAL AUDIT
- **ACTION**: Call \`mcp_codepulse_get_layers\` and \`mcp_codepulse_get_architecture_violations\`.
- **OBJECTIVE**: Understand defined boundaries and identify existing violations.
- **KPI**: ZERO tolerance for new architectural violations.

### PHASE 3: PRE-FLIGHT RISK ASSESSMENT
- **ACTION**: Before touching any file, call \`mcp_codepulse_get_file_context(file: "path")\`.
- **OBJECTIVE**: Uncover **Temporal Coupling** and structural fragility.
- **KPI**: If \`centrality\` > 50, plan for regression testing across all dependents via \`mcp_codepulse_get_file_dependencies\`.

### PHASE 4: SURGICAL EXECUTION
- **ACTION**: Use \`mcp_codepulse_find_similar_functions(file: "path")\` before adding new logic.
- **OBJECTIVE**: Reuse existing structural patterns identified by AST fingerprinting.
- **KPI**: ZERO duplication of logic across the project.

### PHASE 5: VALIDATION & VERIFICATION
- **ACTION**: After changes, call \`mcp_codepulse_get_project_stats\` and \`mcp_codepulse_get_architecture_violations\`.
- **OBJECTIVE**: Ensure metrics (complexity, debt score) have improved and no boundaries were broken.

## 🧰 TOOLSET MASTERY

| Tool | Strategic Intent |
|:---|:---|
| \`codepulse_identity\` | Global project mapping & health baseline. |
| \`get_layers\` | Understand defined architectural boundaries. |
| \`get_architecture_violations\` | Ensure no boundary violations in new code. |
| \`get_file_context\` | Deep-dive into specific file risks and history. |
| \`get_file_dependencies\` | Map the impact of changes via import/export analysis. |
| \`visualize_subgraph\` | Generate Mermaid diagrams for instant visual mental models. |
| \`find_cycles_for_file\` | Debug specific circular dependency loops. |
| \`get_authorship_metadata\` | Identify the "Subject Matter Experts" for any file. |
| \`get_evolutionary_risk\` | Detect code "rot" (high complexity + high churn). |
| \`get_blast_radius\` | Calculate the transitive "blast radius" of a file (dependents of dependents). |
| \`identify_orphans\` | Find potential dead modules (files not imported by anyone). |
| \`get_directory_context\` | Architectural overview of a module or directory. |
| \`find_similar_functions\` | Identify deduplication candidates via AST fingerprinting. |
| \`suggest_split_strategy\` | Get a concrete refactoring plan for God Files. |
| \`get_hotspots\` | Prioritize where to fix bugs (High Complexity + High Churn). |
| \`find_dead_code\` | Pruning unused exports for a leaner build. |
| \`analyze_project\` | Deep scan for vulnerabilities and technical debt. |

## 📐 CORE ANALYTICAL PRINCIPLES
1. **HOTSPOTS FIRST**: A bug in a hotspot is a symptom of technical debt. Refactor while fixing.
2. **AST TRUTH**: Rely on structural fingerprints (\`find_similar_functions\`), not just text matches.
3. **LAYER INTEGRITY**: Never violate boundaries. Call \`get_architecture_violations\` after any structural change.
4. **IMPACT MAPPING**: Use \`get_file_dependencies\` to identify all files that must be updated/tested after an export change.
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
		filename: ".cursorrules",
		type: "prompt",
		description: "Cursor IDE",
	},
	{
		name: "Windsurf",
		filename: ".windsurfrules",
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
		name: "Codex rules",
		filename: ".codexrules",
		type: "prompt",
		description: "Codex CLI Rules",
	},
	{
		name: "Codex MD",
		filename: "CODEX.md",
		type: "prompt",
		description: "Codex CLI Documentation",
	},
	{
		name: "Aider",
		filename: ".aider.conf.yml",
		type: "prompt",
		description: "Aider CLI",
	},
	{
		name: "Gemini CLI",
		filename: ".gemini-instructions.md",
		type: "prompt",
		description: "Gemini CLI Agent"
	},
	{
		name: "Qwen",
		filename: ".qwenrules",
		type: "prompt",
		description: "Qwen AI"
	},
	{
		name: "AMP",
		filename: ".amprules",
		type: "prompt",
		description: "AMP (AI-Modified Projects)"
	},
	{
		name: "OpenCode",
		filename: ".opencoderules",
		type: "prompt",
		description: "OpenCode"
	},
	{
		name: "Kilo",
		filename: ".kilorules",
		type: "prompt",
		description: "Kilo CLI"
	},
	{
		name: "Trae",
		filename: ".traerules",
		type: "prompt",
		description: "Trae IDE"
	},
	{
		name: "Pi Coding Agent",
		filename: ".pirules",
		type: "prompt",
		description: "Pi Coding Agent"
	},
	{
		name: "Kiro CLI",
		filename: ".kirorules",
		type: "prompt",
		description: "Kiro CLI"
	},
	{
		name: "PearAI",
		filename: ".pearrules",
		type: "prompt",
		description: "PearAI"
	},
	{
		name: "Supermaven",
		filename: ".supermavenrules",
		type: "prompt",
		description: "Supermaven"
	},
	{
		name: "Void",
		filename: ".voidrules",
		type: "prompt",
		description: "Void Editor"
	},
	{
		name: "Antigravity",
		filename: ".antigravityrules",
		type: "prompt",
		description: "Antigravity AI"
	},
	{
		name: "Cody",
		filename: ".cody/AGENT.md",
		type: "prompt",
		description: "Sourcegraph Cody",
	},
	{
		name: "Continue",
		filename: ".continue/rules/codepulse.md",
		type: "prompt",
		description: "Continue.dev",
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
