import * as path from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { analyze } from "../analyzer";
import { EXPLANATIONS, type ExplainKey } from "../explain";

const TOOL_HANDLERS: Record<
	string,
	(args: any, absDir: string) => Promise<any>
> = {
	get_project_stats: async (_args, absDir) => {
		const result = await analyze(absDir);
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
		const result = await analyze(absDir);
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
		const result = await analyze(absDir);
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
		const result = await analyze(absDir);
		const hotspots = result.hotspots;

		const summary = `
Code Hotspots for ${absDir}
(Files with high complexity and frequent changes)
--------------------------------------------------
${hotspots.length === 0 ? "No significant hotspots found." : ""}
${hotspots.map((h) => `- ${h.file}: Complexity ${h.complexity}, Churn ${h.churn}`).join("\n")}
        `.trim();

		return { content: [{ type: "text", text: summary }] };
	},
	list_plugins: async (_args, absDir) => {
		const { listPlugins } = await import("../utils/plugins");
		const plugins = await listPlugins(absDir);

		const summary = `
Loaded Plugins for ${absDir}
---------------------------
${plugins.length === 0 ? "No plugins found." : ""}
${plugins.map((p) => `${p.enabled ? "●" : "○"} ${p.name} v${p.version} - ${p.description}`).join("\n")}
        `.trim();

		return { content: [{ type: "text", text: summary }] };
	},
};

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
			version: "2.1.0",
		},
		{
			capabilities: {
				tools: {},
			},
		},
	);

	server.setRequestHandler(ListToolsRequestSchema, async () => {
		return {
			tools: [
				{
					name: "get_project_stats",
					description:
						"Get quick statistics about the project: files, lines, average complexity, and issue counts.",
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
					description:
						"Comprehensive project analysis. Can filter by severity or focus on specific issue types.",
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
					description: "List all unused (dead) exports in the project.",
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
					description:
						"Get a detailed explanation of a code quality concept (e.g., God File, Cyclomatic Complexity).",
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
					description:
						'Identify "hotspots" in the code — files with high churn and high complexity.',
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
					description: "List all loaded CodePulse plugins and their status.",
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
			],
		};
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
