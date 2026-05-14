import { EXPLANATIONS } from "../explain";

export const TOOL_DEFINITIONS = [
	{
		name: "codepulse_identity",
		description: [
			"Use when you want a quick architectural map or when a manual read suggests a broader risk.",
			"Returns a project health check with a 0-100 score and highlights:",
			"God Files, Critical Nodes, Hotspots, Dead Exports, and Security Vulnerabilities.",
			"Prefer reading the code first, then use this tool to confirm or widen the picture.",
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
			"Comprehensive project analysis with optional severity and focus filters.",
			"Use after manual inspection when you want a broader debt scan or confirmation of a suspected issue.",
			"Helpful for cleanup, refactors, or checking dead exports, complexity, god files, critical nodes, vulnerabilities, and duplication.",
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
					description: "Limit the number of issues returned (default 15).",
				},
			},
		},
	},
	{
		name: "find_dead_code",
		description: [
			"List unused (dead) exports in the project.",
			"Use when manual inspection suggests there may be stale exports, or when you are doing cleanup work.",
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
			"Identify hotspots in the code: files with both high complexity and frequent git changes.",
			"Use when you want to prioritize refactoring after a manual read or a broad scan.",
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
		name: "get_file_context",
		description: [
			"Get architectural and historical context for a specific file.",
			"Use before editing a file that looks central, risky, or historically coupled.",
			"Returns complexity, centrality, temporal coupling, and whether it's a God File or Critical Node.",
		].join(" "),
		inputSchema: {
			type: "object",
			properties: {
				file: {
					type: "string",
					description:
						"The relative or absolute path of the file to investigate.",
				},
				dir: {
					type: "string",
					description: "The project directory.",
				},
			},
			required: ["file"],
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
