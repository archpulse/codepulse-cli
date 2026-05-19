import { EXPLANATIONS } from "../explain";

export const TOOL_DEFINITIONS = [
	{
		name: "codepulse_identity",
		description: [
			"CRITICAL: Start here for any codebase you don't know.",
			"Provides a high-level architectural health check (0-100 score).",
			"Identifies God Files (refactor targets), Critical Nodes (high-risk areas), and Hotspots (complexity + churn).",
			"Example: Use this to assess the overall technical debt before starting a major feature.",
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
			"Returns quick numeric KPIs (files, lines, avg complexity, issue counts).",
			"Cheaper and faster than codepulse_identity.",
			"Example: Use this to verify if your refactoring actually reduced the average complexity of the project.",
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
			"In-depth issue scanner with filters.",
			"Finds dead exports, complexity violations, vulnerabilities, and duplication.",
			"Example: 'analyze_project(focus=\"dead-export\")' to find unused code for pruning.",
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
		name: "get_file_context",
		description: [
			"MANDATORY before editing complex files.",
			"Returns complexity, centrality (how many files depend on this), and 'Temporal Coupling' (which files usually change together with this one).",
			"Example: If a file has high centrality, you must be extremely careful with export changes.",
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
		name: "get_blast_radius",
		description: [
			"Calculates the transitive impact of a change.",
			"Finds all files that depend on this file directly OR indirectly (dependents of dependents).",
			"Example: Use this to know exactly which tests to run after changing a core utility function.",
		].join(" "),
		inputSchema: {
			type: "object",
			properties: {
				file: {
					type: "string",
					description: "The relative or absolute path of the file.",
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
		name: "find_similar_functions",
		description: [
			"Identifies structural code duplication using AST fingerprinting.",
			"Finds functions that look the same even if variable names differ.",
			"Example: Use this to find logic that should be extracted into a shared helper.",
		].join(" "),
		inputSchema: {
			type: "object",
			properties: {
				file: {
					type: "string",
					description: "The relative or absolute path of the file to search from.",
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
		name: "suggest_split_strategy",
		description: [
			"Provides a concrete plan to refactor a God File.",
			"Analyzes internal clusters and dependencies to suggest how to break a large file into smaller ones.",
			"Example: Use this when 'codepulse_identity' flags a file as a 'God File'.",
		].join(" "),
		inputSchema: {
			type: "object",
			properties: {
				file: {
					type: "string",
					description: "The relative or absolute path of the God File.",
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
		name: "get_layers",
		description: [
			"Retrieves defined architectural boundaries (layers) from config.",
			"Example: Use this to check if a 'Domain' layer is allowed to import from 'Infrastructure'.",
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
		name: "get_architecture_violations",
		description: [
			"Lists all dependencies that break defined layer boundaries.",
			"Example: Run this after a refactor to ensure no circular or forbidden dependencies were introduced.",
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
		name: "visualize_subgraph",
		description: [
			"Generates Mermaid diagram code for a file and its neighbors.",
			"Example: Use this to get an instant visual map of a module's dependencies.",
		].join(" "),
		inputSchema: {
			type: "object",
			properties: {
				file: {
					type: "string",
					description: "The relative or absolute path of the file.",
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
		name: "get_evolutionary_risk",
		description: [
			"Detects code 'rot' by correlating age, complexity, and churn.",
			"Finds files that are becoming increasingly dangerous to modify.",
			"Example: Use this to prioritize refactoring in files with both high complexity and high change frequency.",
		].join(" "),
		inputSchema: {
			type: "object",
			properties: {
				file: {
					type: "string",
					description: "The relative or absolute path of the file.",
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
		name: "find_dead_code",
		description: "Finds unused exports (pruning target).",
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
		description: "Explains architectural concepts like 'God File' or 'Cyclomatic Complexity'.",
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
		description: "Identifies files with high complexity + high churn.",
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
		name: "identify_orphans",
		description: "Finds files not imported by anyone.",
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
		name: "get_directory_context",
		description: "Architectural overview of a specific folder.",
		inputSchema: {
			type: "object",
			properties: {
				path: {
					type: "string",
					description: "The relative or absolute path of the directory.",
				},
				dir: {
					type: "string",
					description: "The project directory.",
				},
			},
			required: ["path"],
		},
	},
	{
		name: "find_cycles_for_file",
		description: "Lists circular dependency cycles for a file.",
		inputSchema: {
			type: "object",
			properties: {
				file: {
					type: "string",
					description: "The relative or absolute path of the file.",
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
		name: "get_authorship_metadata",
		description: "Identifies primary authors of a file.",
		inputSchema: {
			type: "object",
			properties: {
				file: {
					type: "string",
					description: "The relative or absolute path of the file.",
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
		description: "Lists loaded analysis plugins.",
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
		name: "get_semantic_slice",
		description: [
			"CRITICAL for context efficiency.",
			"Returns only the specific function, class, or export from a file.",
			"Avoids reading thousands of lines when only one function is relevant.",
		].join(" "),
		inputSchema: {
			type: "object",
			properties: {
				file: {
					type: "string",
					description: "The path of the file.",
				},
				symbol: {
					type: "string",
					description: "The name of the function, class, or variable to extract.",
				},
				dir: {
					type: "string",
					description: "The project directory.",
				},
			},
			required: ["file", "symbol"],
		},
	},
	{
		name: "predict_change_impact",
		description: [
			"Predicts the blast radius of a change to a specific symbol.",
			"Checks which files depend on this file and might be affected.",
		].join(" "),
		inputSchema: {
			type: "object",
			properties: {
				file: {
					type: "string",
					description: "The path of the file containing the symbol.",
				},
				symbol: {
					type: "string",
					description: "The name of the symbol being changed.",
				},
				dir: {
					type: "string",
					description: "The project directory.",
				},
			},
			required: ["file", "symbol"],
		},
	},
	{
		name: "request_architecture_review",
		description: [
			"Runs a formal check against the project's architectural rules.",
			"Checks for layer violations, circular dependencies, and God File creation.",
			"Example: Call this before finishing a task to ensure you didn't break the architecture.",
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
		name: "store_memory",
		description: [
			"Stores a persistent architectural or contextual memory for this project.",
			"Use this to remember weird hacks, design decisions, or bug root causes across sessions.",
		].join(" "),
		inputSchema: {
			type: "object",
			properties: {
				memory: {
					type: "string",
					description: "The fact or decision to remember.",
				},
				dir: {
					type: "string",
					description: "The project directory.",
				},
			},
			required: ["memory"],
		},
	},
	{
		name: "get_memories",
		description: "Retrieves all stored project memories.",
		inputSchema: {
			type: "object",
			properties: {
				dir: {
					type: "string",
					description: "The project directory.",
				},
			},
		},
	},
	{
		name: "simulate_edit",
		description: [
			"Performs a 'dry run' of a code change.",
			"Validates the new code against AST rules and checks if it introduces architectural violations.",
		].join(" "),
		inputSchema: {
			type: "object",
			properties: {
				file: {
					type: "string",
					description: "The path of the file to modify.",
				},
				new_content: {
					type: "string",
					description: "The full proposed content of the file.",
				},
				dir: {
					type: "string",
					description: "The project directory.",
				},
			},
			required: ["file", "new_content"],
		},
	},
];
