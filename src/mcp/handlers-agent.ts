import * as fs from "node:fs";
import * as path from "node:path";
import { analyze } from "../analyzer";
import { analyzeFile } from "../analyzer/ast";
import { McpHandler, McpHandlerResponse } from "./types";

const CALL_HISTORY = new Map<string, number>();

function trackCall(name: string, args: any): string | null {
	const key = `${name}:${JSON.stringify(args)}`;
	const count = (CALL_HISTORY.get(key) || 0) + 1;
	CALL_HISTORY.set(key, count);
	if (count > 3) {
		return `⚠️ LOOP DETECTED: You have called ${name} with these exact arguments ${count} times in this session. Consider if you are stuck in a cycle.`;
	}
	return null;
}

function addRiskIndicators(sections: string[], fileNode: any, result: any) {
	const isCritical = result.criticalFiles.some((cf: any) => cf.id === fileNode.path);
	const isHotspot = result.hotspots.some((h: any) => h.file === fileNode.relativePath);

	if (isCritical) {
		sections.push("🚨 **CRITICAL NODE**: This file is a central dependency in the project. Any change here has a high probability of causing regressions across the system.");
	}
	if (isHotspot) {
		sections.push("🔥 **HOTSPOT**: This file has high complexity and high change frequency. It is prone to bugs.");
	}
}

function addDependentsSection(sections: string[], dependents: Set<string>) {
	sections.push(`Direct dependent files: ${dependents.size}`);
	if (dependents.size > 0) {
		sections.push("### Potential Affected Files:");
		for (const d of dependents) {
			sections.push(`- ${d}`);
		}
		sections.push("");
		sections.push("⚠️ Recommendation: After changing this symbol, verify its usage in the files listed above. If you are changing an export's signature, you MUST update these files.");
	} else {
		sections.push("_No direct dependents found for this file. The change blast radius is likely localized._");
	}
}

export const AGENT_HANDLERS: Record<string, McpHandler> = {
	get_semantic_slice: async (args, absDir): Promise<McpHandlerResponse> => {
		const loopWarning = trackCall("get_semantic_slice", args);
		const result = await analyze(absDir, { silent: true });
		const filePath = args.file;
		const symbolName = args.symbol;
		const relPath = path.isAbsolute(filePath)
			? path.relative(absDir, filePath)
			: filePath;
		const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(absDir, filePath);

		const fileNode = result.files.find(
			(f) => f.path === absPath || f.relativePath === relPath,
		);

		if (!fileNode) {
			return {
				content: [{ type: "text", text: `File not found: ${relPath}` }],
				isError: true,
			};
		}

		const func = fileNode.functions.find((f) => f.name === symbolName);
		if (!func) {
			return {
				content: [
					{
						type: "text",
						text: `Symbol '${symbolName}' not found in ${relPath}. Available symbols: ${fileNode.functions.map((f) => f.name).join(", ")}`,
					},
				],
				isError: true,
			};
		}

		try {
			const content = fs.readFileSync(absPath, "utf-8");
			const lines = content.split("\n");
			const slice = lines.slice(func.startLine - 1, func.endLine).join("\n");

			return {
				content: [
					{
						type: "text",
						text: (loopWarning ? loopWarning + "\n\n" : "") + `\`\`\`typescript\n// File: ${relPath}, Symbol: ${symbolName}, Lines: ${func.startLine}-${func.endLine}\n${slice}\n\`\`\``,
					},
				],
			};
		} catch (err) {
			return {
				content: [{ type: "text", text: `Error reading file: ${err}` }],
				isError: true,
			};
		}
	},

	predict_change_impact: async (args, absDir): Promise<McpHandlerResponse> => {
		const loopWarning = trackCall("predict_change_impact", args);
		const result = await analyze(absDir, { silent: true });
		const filePath = args.file;
		const symbolName = args.symbol;
		const relPath = path.isAbsolute(filePath) ? path.relative(absDir, filePath) : filePath;
		const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(absDir, filePath);

		const fileNode = result.files.find((f) => f.path === absPath || f.relativePath === relPath);
		if (!fileNode) {
			return { content: [{ type: "text", text: `File not found: ${relPath}` }], isError: true };
		}

		const dependents = new Set<string>(result.edges.filter((e) => e.to === fileNode.path).map((e) => path.relative(absDir, e.from)));
		const sections: string[] = [];
		if (loopWarning) sections.push(loopWarning);
		sections.push(`# Impact Prediction for changing \`${symbolName}\` in \`${relPath}\``, "");
		
		addRiskIndicators(sections, fileNode, result);
		addDependentsSection(sections, dependents);

		return { content: [{ type: "text", text: sections.join("\n") }] };
	},

	request_architecture_review: async (_args, absDir): Promise<McpHandlerResponse> => {
		const result = await analyze(absDir, { silent: true });
		
		const violations = result.issues.filter(i => 
			i.type === "architecture-violation" || 
			i.type === "circular-dependency" || 
			i.type === "god-file"
		);

		const sections: string[] = [];
		sections.push("# 🏛️ Architecture Review Report");
		sections.push("");

		if (violations.length === 0) {
			sections.push("✅ No architectural violations found. The codebase remains healthy.");
		} else {
			sections.push(`❌ Found ${violations.length} architectural issues that need attention:`);
			sections.push("");
			for (const v of violations) {
				sections.push(`### [${v.severity.toUpperCase()}] ${v.type}`);
				sections.push(`- **File:** ${v.file}`);
				sections.push(`- **Message:** ${v.message}`);
				if (v.suggestion) sections.push(`- **Suggestion:** ${v.suggestion}`);
				sections.push("");
			}
		}

		const hotspots = result.hotspots.slice(0, 3);
		if (hotspots.length > 0) {
			sections.push("## 🔥 Top Risk Areas (Hotspots)");
			sections.push("These files are complex and change often. They are good candidates for refactoring to improve maintainability.");
			for (const h of hotspots) {
				sections.push(`- **${h.file}**: Risk ${h.score.toFixed(2)} (Complexity: ${h.complexity}, Churn: ${h.churn})`);
			}
		}

		return {
			content: [{ type: "text", text: sections.join("\n") }],
		};
	},

	store_memory: async (args, absDir): Promise<McpHandlerResponse> => {
		const memory = args.memory;
		const cacheDir = path.join(absDir, ".codepulse-cache");
		if (!fs.existsSync(cacheDir)) {
			fs.mkdirSync(cacheDir, { recursive: true });
		}
		const memoryPath = path.join(cacheDir, "agent-memory.json");
		
		let memories: string[] = [];
		if (fs.existsSync(memoryPath)) {
			try {
				memories = JSON.parse(fs.readFileSync(memoryPath, "utf-8"));
			} catch {
				memories = [];
			}
		}

		if (!memories.includes(memory)) {
			memories.push(memory);
			fs.writeFileSync(memoryPath, JSON.stringify(memories, null, 2));
		}

		return {
			content: [{ type: "text", text: "✅ Memory stored successfully. I will remember this in future sessions for this project." }],
		};
	},

	get_memories: async (_args, absDir): Promise<McpHandlerResponse> => {
		const memoryPath = path.join(absDir, ".codepulse-cache", "agent-memory.json");
		
		if (!fs.existsSync(memoryPath)) {
			return {
				content: [{ type: "text", text: "No memories stored for this project yet." }],
			};
		}

		try {
			const memories: string[] = JSON.parse(fs.readFileSync(memoryPath, "utf-8"));
			if (memories.length === 0) {
				return { content: [{ type: "text", text: "No memories stored for this project yet." }] };
			}

			const sections: string[] = [];
			sections.push("# 🧠 Project Memories");
			sections.push("The following contextual/architectural facts were recorded previously:");
			sections.push("");
			for (const m of memories) {
				sections.push(`- ${m}`);
			}

			return {
				content: [{ type: "text", text: sections.join("\n") }],
			};
		} catch {
			return {
				content: [{ type: "text", text: "Error reading project memories." }],
				isError: true,
			};
		}
	},

	simulate_edit: async (args, absDir): Promise<McpHandlerResponse> => {
		const filePath = args.file;
		const newContent = args.new_content;
		const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(absDir, filePath);
		
		// 1. AST Validation
		const fileNode = analyzeFile(absPath, absDir, newContent);
		if (!fileNode) {
			return {
				content: [{ type: "text", text: "❌ Simulation failed: Could not parse the proposed code. Please check for syntax errors." }],
				isError: true,
			};
		}

		const sections: string[] = [];
		sections.push("# 🧪 Pre-Flight Simulation Report");
		sections.push("");
		sections.push("✅ Proposed code is syntactically valid and successfully parsed.");
		sections.push(`- **New Complexity:** ${fileNode.complexity}`);
		sections.push(`- **Total Lines:** ${fileNode.lines}`);

		if (fileNode.isGodFile) {
			sections.push("⚠️ **Warning:** This change would make the file a 'God File' (too complex). Consider splitting the logic.");
		}

		// 2. Quick architecture check
		// (In a real implementation, we would re-run the full 'analyze' with this file overridden)
		// For now, let's just report the AST metrics.

		return {
			content: [{ type: "text", text: sections.join("\n") }],
		};
	},
};
