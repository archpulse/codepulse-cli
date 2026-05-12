import * as path from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { analyze } from "../analyzer";
import { EXPLANATIONS, type ExplainKey } from "../explain";
import { calculateHealthScore } from "../reporter/stats";

// ─── Tool Handlers ───────────────────────────────────────────────────

const TOOL_HANDLERS: Record<
	string,
	(args: any, absDir: string) => Promise<any>
> = {
	codepulse_identity: async (_args, absDir) => {
		const result = await analyze(absDir, { silent: true });

		const vulnerabilities = result.issues.filter(
			(i) => i.type === "vulnerability",
		).length;
		const healthStats = {
			vulnerabilities,
			deadExports: result.deadExports.length,
			godFiles: result.godFiles.length,
			criticalFiles: result.criticalFiles.length,
			hotspots: result.hotspots,
			avgComplexity: result.avgComplexity,
		};
		const healthScore = calculateHealthScore(healthStats, result);

		const errors = result.issues.filter((i) => i.severity === "error");
		const warnings = result.issues.filter((i) => i.severity === "warning");

		// Build the actionable summary
		const sections: string[] = [];

		sections.push(`# CodePulse — Project Health Check`);
		sections.push(`**Health Score: ${healthScore}/100** ${healthScore >= 80 ? "✅" : healthScore >= 50 ? "⚠️" : "🔴"}`);
		sections.push("");
		sections.push(`| Metric | Value |`);
		sections.push(`|--------|-------|`);
		sections.push(`| Files | ${result.totalFiles} |`);
		sections.push(`| Lines | ${result.totalLines} |`);
		sections.push(`| Avg Complexity | ${result.avgComplexity.toFixed(1)} |`);
		sections.push(`| Errors | ${errors.length} |`);
		sections.push(`| Warnings | ${warnings.length} |`);

		// Flag critical problems the model should act on
		if (result.godFiles.length > 0) {
			sections.push("");
			sections.push(`## 🚨 God Files (${result.godFiles.length}) — SPLIT THESE`);
			for (const gf of result.godFiles.slice(0, 5)) {
				sections.push(`- **${gf.relativePath}**: ${gf.lines} lines, ${gf.imports.length} imports, complexity ${gf.complexity}`);
			}
		}

		if (result.criticalFiles.length > 0) {
			sections.push("");
			sections.push(`## ⚡ Critical Nodes (${result.criticalFiles.length}) — HIGH-RISK DEPENDENCIES`);
			for (const cf of result.criticalFiles.slice(0, 5)) {
				sections.push(`- **${path.basename(cf.id)}**: ${cf.inDegree} dependents (inDegree), centrality ${cf.centrality}`);
			}
		}

		if (result.hotspots.length > 0) {
			sections.push("");
			sections.push(`## 🔥 Hotspots (${result.hotspots.length}) — REFACTOR PRIORITY`);
			for (const h of result.hotspots.slice(0, 5)) {
				sections.push(`- **${h.file}**: complexity ${h.complexity}, churn ${h.churn}, score ${h.score}`);
			}
		}

		if (result.deadExports.length > 0) {
			sections.push("");
			sections.push(`## 🗑️ Dead Exports: ${result.deadExports.length} unused exports found`);
		}

		if (vulnerabilities > 0) {
			sections.push("");
			sections.push(`## 🛡️ Security: ${vulnerabilities} vulnerability patterns detected`);
		}

		sections.push("");
		sections.push("---");
		sections.push("**Available CodePulse tools you should use:**");
		sections.push("- `analyze_project` — Get full issue list filtered by severity/type");
		sections.push("- `get_hotspots` — Find files that need refactoring most urgently");
		sections.push("- `find_dead_code` — List all unused exports to clean up");
		sections.push("- `explain_concept` — Understand what any detected issue means");
		sections.push("- `get_project_stats` — Quick numeric overview");

		return {
			content: [{ type: "text", text: sections.join("\n") }],
		};
	},

	get_project_stats: async (_args, absDir) => {
		const result = await analyze(absDir, { silent: true });
		const stats = {
			totalFiles: result.totalFiles,
			totalLines: result.totalLines,
			avgComplexity: result.avgComplexity.toFixed(2),
			issues: result.issues.length,
			errors: result.issues.filter((i) => i.severity === "error").length,
			warnings: result.issues.filter((i) => i.severity === "warning").length,
			hotspots: result.hotspots.length,
			deadExports: result.deadExports.length,
		};
		return {
			content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
		};
	},

	analyze_project: async (args, absDir) => {
		const result = await analyze(absDir, { silent: true });
		let filteredIssues = result.issues;

		if (args?.severity)
			filteredIssues = filteredIssues.filter(
				(i) => i.severity === args.severity,
			);
		if (args?.focus)
			filteredIssues = filteredIssues.filter((i) => i.type === args.focus);

		const limit = args?.limit || 15;
		const totalFound = filteredIssues.length;
		const issues = filteredIssues.slice(0, limit);

		const summary = `
Analysis for ${absDir}
----------------------
Found ${totalFound} issues ${args?.severity ? `with severity ${args.severity}` : ""} ${args?.focus ? `focused on ${args.focus}` : ""}.
${issues.length > 0 ? "\nTop Issues:" : "No issues found."}
${issues.map((i) => `[${i.severity.toUpperCase()}] ${i.file}:${i.line || 0} - ${i.message}`).join("\n")}
${totalFound > limit ? `\n... and ${totalFound - limit} more issues.` : ""}
        `.trim();

		return { content: [{ type: "text", text: summary }] };
	},

	find_dead_code: async (_args, absDir) => {
		const result = await analyze(absDir, { silent: true });
		const dead = result.issues.filter((i) => i.type === "dead-export");

		const summary = `
Dead Code Report for ${absDir}
-----------------------------
Unused exports found: ${dead.length}

${dead.map((i) => `- ${i.file}: ${i.message}`).join("\n")}
        `.trim();

		return { content: [{ type: "text", text: summary }] };
	},

	explain_concept: async (args, _absDir) => {
		const topic = args?.topic as ExplainKey;
		const entry = EXPLANATIONS[topic];
		if (!entry) throw new Error(`Unknown topic: ${topic}`);

		const { full } = entry;
		const text = `
Concept: ${topic.toUpperCase().replace(/-/g, " ")}
---------------------------------------------
${full.description}

Detected when:
${full.criteria.map((c) => `- ${c}`).join("\n")}

Risks:
${full.risks.map((r) => `- ${r}`).join("\n")}

Recommended fixes:
${full.fix.map((f) => `- ${f}`).join("\n")}
        `.trim();

		return { content: [{ type: "text", text }] };
	},

	get_hotspots: async (_args, absDir) => {
		const result = await analyze(absDir, { silent: true });
		const hotspots = result.hotspots;

		const summary = `
Code Hotspots for ${absDir}
(Files with high complexity and frequent changes)
--------------------------------------------------
${hotspots.length === 0 ? "No significant hotspots found." : ""}
${hotspots.map((h) => `- ${h.file}: Complexity ${h.complexity}, Churn ${h.churn}, Score ${h.score}`).join("\n")}
        `.trim();

		return { content: [{ type: "text", text: summary }] };
	},

	list_plugins: async () => {
		const { listPlugins } = await import("../utils/plugins");
		const plugins = await listPlugins();

		const summary = `
Global CodePulse Plugins
---------------------------
${plugins.length === 0 ? "No plugins found in ~/.config/codepulse/plugins." : ""}
${plugins.map((p) => `${p.enabled ? "●" : "○"} ${p.name} v${p.version} - ${p.description}`).join("\n")}
        `.trim();

		return { content: [{ type: "text", text: summary }] };
	},
};

// ─── Tool Definitions with Agent-Centric Descriptions ────────────────

const TOOL_DEFINITIONS = [
	{
		name: "codepulse_identity",
		description: [
			"IMPORTANT: Call this tool FIRST when starting any coding session in a new project.",
			"Returns a complete project health check with a 0-100 score, identifying:",
			"God Files (overly large modules that should be split),",
			"Critical Nodes (files with dangerously high dependency counts),",
			"Hotspots (complex files changed frequently — top refactoring targets),",
			"Dead Exports (unused code that should be removed),",
			"Security Vulnerabilities.",
			"This gives you an instant architectural map so you know exactly where problems are",
			"BEFORE you start reading code or making changes.",
		].join(" "),
		inputSchema: {
			type: "object",
			properties: {
				dir: {
					type: "string",
					description:
						"The directory path to analyze. Defaults to current directory.",
				},
			},
		},
	},
	{
		name: "get_project_stats",
		description: [
			"Get quick numeric statistics about the project.",
			"USE THIS when you need a fast overview of project size and quality metrics",
			"(file count, line count, average complexity, issue counts).",
			"This is cheaper than a full analyze_project call.",
			"Prefer this when you just need numbers, not the full issue list.",
		].join(" "),
		inputSchema: {
			type: "object",
			properties: {
				dir: {
					type: "string",
					description:
						"The directory path to analyze. Defaults to current directory.",
				},
			},
		},
	},
	{
		name: "analyze_project",
		description: [
			"Comprehensive project analysis. Can filter by severity or focus on specific issue types.",
			"USE THIS BEFORE any refactoring task — it tells you exactly which files have problems",
			"and what kind (dead exports, high complexity, god files, critical nodes, vulnerabilities, duplication).",
			"USE THIS when the user asks you to 'clean up', 'refactor', 'improve code quality',",
			"or when you notice a file seems overly complex.",
			"Filter by severity (error/warning/info) or focus on a specific issue type for targeted results.",
		].join(" "),
		inputSchema: {
			type: "object",
			properties: {
				dir: {
					type: "string",
					description: "The directory path to analyze.",
				},
				severity: {
					type: "string",
					enum: ["info", "warning", "error"],
					description: "Filter issues by severity.",
				},
				focus: {
					type: "string",
					enum: [
						"dead-export",
						"high-complexity",
						"god-file",
						"critical-node",
						"vulnerability",
						"duplication",
					],
					description: "Focus on a specific type of issue.",
				},
				limit: {
					type: "number",
					description:
						"Limit the number of issues returned (default 15).",
				},
			},
		},
	},
	{
		name: "find_dead_code",
		description: [
			"List all unused (dead) exports in the project.",
			"USE THIS when cleaning up a codebase, removing deprecated features,",
			"or when you suspect there are exports that nothing imports anymore.",
			"Dead exports increase bundle size and confuse developers — always clean them up.",
		].join(" "),
		inputSchema: {
			type: "object",
			properties: {
				dir: {
					type: "string",
					description: "The directory path to analyze.",
				},
			},
		},
	},
	{
		name: "explain_concept",
		description: [
			"Get a detailed explanation of a code quality concept (e.g., God File, Cyclomatic Complexity).",
			"USE THIS when you encounter an unfamiliar issue type from analyze_project",
			"and need to understand what it means, why it's risky, and how to fix it.",
			"Also useful when explaining code quality issues to the user.",
		].join(" "),
		inputSchema: {
			type: "object",
			properties: {
				topic: {
					type: "string",
					enum: Object.keys(EXPLANATIONS),
					description: "The topic to explain.",
				},
			},
		},
	},
	{
		name: "get_hotspots",
		description: [
			"Identify 'hotspots' in the code — files with BOTH high complexity AND frequent git changes.",
			"USE THIS when deciding what to refactor first.",
			"Hotspots are the #1 source of bugs because complex code that changes often",
			"is statistically most likely to introduce regressions.",
			"USE THIS BEFORE starting any large refactoring effort to prioritize your work.",
		].join(" "),
		inputSchema: {
			type: "object",
			properties: {
				dir: {
					type: "string",
					description: "The directory path to analyze.",
				},
			},
		},
	},
	{
		name: "list_plugins",
		description: [
			"List all loaded CodePulse plugins and their status.",
			"Use this to check what additional analysis rules are installed.",
		].join(" "),
		inputSchema: {
			type: "object",
			properties: {
				dir: {
					type: "string",
					description: "The directory path to analyze.",
				},
			},
		},
	},
];

// ─── Server Setup ────────────────────────────────────────────────────

async function handleMcpToolCall(name: string, args: any) {
	const dir = args?.dir || process.cwd();
	const absDir = path.resolve(dir);

	const handler = TOOL_HANDLERS[name];
	if (!handler) {
		throw new Error(`Tool not found: ${name}`);
	}

	return await handler(args, absDir);
}

export async function runMcpServer() {
	const server = new Server(
		{
			name: "codepulse",
			version: "3.0.0",
		},
		{
			capabilities: {
				tools: {},
			},
		},
	);

	server.setRequestHandler(ListToolsRequestSchema, async () => {
		return { tools: TOOL_DEFINITIONS };
	});

	server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
		try {
			const { name, arguments: args } = request.params;
			return await handleMcpToolCall(name, args);
		} catch (err: any) {
			return {
				content: [{ type: "text", text: `Error: ${err.message}` }],
				isError: true,
			};
		}
	});

	const transport = new StdioServerTransport();
	await server.connect(transport);
}
