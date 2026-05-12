import { EXPLANATIONS } from "../explain";

export const TOOL_DEFINITIONS = [
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
					description: "Limit the number of issues returned (default 15).",
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
		name: "get_file_context",
		description: [
			"Get deep architectural and historical context for a specific file.",
			"USE THIS when you are about to edit a file and want to understand its risks.",
			"Returns complexity, centrality, temporal coupling (files that change with it),",
			"and whether it's a God File or Critical Node.",
			"This is the best way to avoid breaking architectural boundaries or ignoring",
			"hidden dependencies during a task.",
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
