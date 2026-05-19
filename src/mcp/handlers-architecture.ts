import { execSync } from "node:child_process";
import * as path from "node:path";
import { analyze } from "../analyzer";


import { McpHandler, McpHandlerResponse } from "./types";

function buildFingerprintMap(files: any[]): Map<string, Array<{ file: string; func: any }>> {
	const fingerprintMap = new Map<string, Array<{ file: string; func: any }>>();
	for (const file of files) {
		for (const func of file.functions) {
			if (func.fingerprint) {
				if (!fingerprintMap.has(func.fingerprint)) {
					fingerprintMap.set(func.fingerprint, []);
				}
				fingerprintMap.get(func.fingerprint)!.push({
					file: file.relativePath,
					func,
				});
			}
		}
	}
	return fingerprintMap;
}

function addFunctionMatches(sections: string[], func: any, fingerprintMap: Map<string, any[]>, relPath: string): number {
	const matches = fingerprintMap.get(func.fingerprint)!
		.filter((m) => m.file !== relPath || m.func.name !== func.name);

	if (matches.length > 0) {
		sections.push(`## Function: \`${func.name}\` (lines ${func.startLine}-${func.endLine})`);
		sections.push(`Found ${matches.length} structurally similar functions:`);
		for (const m of matches) {
			sections.push(`- **${m.file}**: \`${m.func.name}\` (lines ${m.func.startLine}-${m.func.endLine})`);
		}
		sections.push("");
		return 1;
	}
	return 0;
}

export const ARCHITECTURE_HANDLERS: Record<string, McpHandler> = {
	find_similar_functions: async (args, absDir): Promise<McpHandlerResponse> => {
		const result = await analyze(absDir, { silent: true });
		const filePath = args.file;
		const relPath = path.isAbsolute(filePath) ? path.relative(absDir, filePath) : filePath;

		const sourceFile = result.files.find((f) => f.path === filePath || f.relativePath === relPath);
		if (!sourceFile) {
			return { content: [{ type: "text", text: `File not found: ${relPath}` }], isError: true };
		}

		const fingerprintMap = buildFingerprintMap(result.files);
		const sections: string[] = [`# Structural Similarities found from ${relPath}`, ""];

		let count = 0;
		for (const func of sourceFile.functions) {
			if (func.fingerprint) {
				count += addFunctionMatches(sections, func, fingerprintMap, relPath);
			}
		}

		if (count === 0) {
			sections.push("No structurally similar functions found in other files.");
		}

		return { content: [{ type: "text", text: sections.join("\n") }] };
	},

	get_blast_radius: async (args, absDir) => {
		const result = await analyze(absDir, { silent: true });
		const filePath = args.file;
		const relPath = path.isAbsolute(filePath)
			? path.relative(absDir, filePath)
			: filePath;

		const fileNode = result.files.find(
			(f) => f.path === filePath || f.relativePath === relPath,
		);

		if (!fileNode) {
			return {
				content: [{ type: "text", text: `File not found: ${relPath}` }],
				isError: true,
			};
		}

		const dependents = new Set<string>();
		const queue = [fileNode.path];

		while (queue.length > 0) {
			const current = queue.shift()!;
			const incoming = result.edges.filter((e) => e.to === current);
			for (const edge of incoming) {
				if (!dependents.has(edge.from)) {
					dependents.add(edge.from);
					queue.push(edge.from);
				}
			}
		}

		const sections: string[] = [];
		sections.push(`# Transitive Blast Radius: ${relPath}`);
		sections.push(`Total dependent files: ${dependents.size}`);
		sections.push("");
		if (dependents.size > 0) {
			sections.push(
				Array.from(dependents)
					.map((d) => `- ${path.relative(absDir, d)}`)
					.join("\n"),
			);
		} else {
			sections.push("_No other files depend on this file directly or indirectly._");
		}

		return {
			content: [{ type: "text", text: sections.join("\n") }],
		};
	},

	identify_orphans: async (_args, absDir) => {
		const result = await analyze(absDir, { silent: true });
		const importedFiles = new Set(result.edges.map((e) => e.to));
		const orphans = result.files.filter((f) => !importedFiles.has(f.path));

		const sections: string[] = [];
		sections.push(`# Orphan Modules (No Incoming Dependencies)`);
		sections.push(`Found ${orphans.length} potential orphan files.`);
		sections.push("");
		sections.push(
			orphans.map((f) => `- **${f.relativePath}** (${f.lines} lines)`).join("\n"),
		);

		return {
			content: [{ type: "text", text: sections.join("\n") }],
		};
	},

	get_directory_context: async (args, absDir) => {
		const result = await analyze(absDir, { silent: true });
		const dirPath = args.path;
		const absPath = path.isAbsolute(dirPath)
			? dirPath
			: path.resolve(absDir, dirPath);
		const relDir = path.relative(absDir, absPath);

		const dirFiles = result.files.filter((f) => f.path.startsWith(absPath));

		if (dirFiles.length === 0) {
			return {
				content: [{ type: "text", text: `No analyzed files found in ${relDir}` }],
				isError: true,
			};
		}

		const totalLines = dirFiles.reduce((sum, f) => sum + f.lines, 0);
		const totalComplexity = dirFiles.reduce((sum, f) => sum + f.complexity, 0);
		const avgComplexity = totalComplexity / dirFiles.length;
		const totalChurn = dirFiles.reduce((sum, f) => sum + (f.churn || 0), 0);

		const dirCritical = result.criticalFiles
			.filter((cf) => cf.id.startsWith(absPath))
			.slice(0, 5);

		const sections: string[] = [];
		sections.push(`# Directory Overview: ${relDir}`);
		sections.push("");
		sections.push(`- **Total Files:** ${dirFiles.length}`);
		sections.push(`- **Total Lines:** ${totalLines}`);
		sections.push(`- **Average Complexity:** ${avgComplexity.toFixed(1)}`);
		sections.push(`- **Total Churn (6m):** ${totalChurn} commits`);

		if (dirCritical.length > 0) {
			sections.push("");
			sections.push(`## ⚡ Critical Nodes in this Directory`);
			for (const cf of dirCritical) {
				sections.push(
					`- **${path.basename(cf.id)}**: dependents ${cf.inDegree}, centrality ${cf.centrality}`,
				);
			}
		}

		return {
			content: [{ type: "text", text: sections.join("\n") }],
		};
	},

	suggest_split_strategy: async (args, absDir) => {
		const result = await analyze(absDir, { silent: true });
		const filePath = args.file;
		const relPath = path.isAbsolute(filePath)
			? path.relative(absDir, filePath)
			: filePath;

		const fileNode = result.files.find(
			(f) => f.path === filePath || f.relativePath === relPath,
		);

		if (!fileNode) {
			return {
				content: [{ type: "text", text: `File not found: ${relPath}` }],
				isError: true,
			};
		}

		const sections: string[] = [];
		sections.push(`# Refactoring Strategy for God File: ${relPath}`);
		sections.push("");

		if (!fileNode.isGodFile && fileNode.complexity < 20) {
			sections.push(
				"**Note:** This file is not strictly a God File, but here is a suggested decomposition anyway.",
			);
			sections.push("");
		}

		// 1. Identify Logic Clusters
		sections.push(`## 🎯 Logic Decomposition`);
		const highComplexityFuncs = fileNode.functions.filter((f) => f.complexity > 5);
		if (highComplexityFuncs.length > 0) {
			sections.push("### 1. Extract Complex Logic");
			sections.push(
				"The following functions are complex and should be moved to separate utility modules:",
			);
			for (const f of highComplexityFuncs) {
				sections.push(`- \`${f.name}\` (Complexity: ${f.complexity})`);
			}
		}

		// 2. Export Analysis
		if (fileNode.exports.length > 3) {
			sections.push("");
			sections.push("### 2. Group Exports");
			sections.push(
				`This file has ${fileNode.exports.length} exports. Consider grouping them by domain:`,
			);
			const baseName = path.basename(relPath, path.extname(relPath));
			sections.push(`- Create \`${baseName}.types.ts\` for type definitions.`);
			sections.push(`- Create \`${baseName}.utils.ts\` for internal helper functions.`);
			sections.push(`- Create \`${baseName}.core.ts\` for the primary business logic.`);
		}

		// 3. Import Pressure
		if (fileNode.imports.length > 10) {
			sections.push("");
			sections.push("### 3. Dependency Injection");
			sections.push(
				`High import pressure (${fileNode.imports.length} imports).`,
			);
			sections.push(
				"Consider passing dependencies as arguments to functions instead of importing them directly to reduce coupling.",
			);
		}

		return {
			content: [{ type: "text", text: sections.join("\n") }],
		};
	},

	visualize_subgraph: async (args, absDir) => {
		const result = await analyze(absDir, { silent: true });
		const filePath = args.file;
		const relPath = path.isAbsolute(filePath)
			? path.relative(absDir, filePath)
			: filePath;

		const fileNode = result.files.find(
			(f) => f.path === filePath || f.relativePath === relPath,
		);

		if (!fileNode) {
			return {
				content: [{ type: "text", text: `File not found: ${relPath}` }],
				isError: true,
			};
		}

		const incoming = result.edges.filter((e) => e.to === fileNode.path);
		const outgoing = result.edges.filter((e) => e.from === fileNode.path);

		const lines: string[] = ["graph TD"];
		const center = path.basename(relPath);

		lines.push(`  Center["${center} (Target)"]`);
		lines.push("  style Center fill:#f9f,stroke:#333,stroke-width:4px");

		for (const edge of incoming) {
			const name = path.basename(edge.from);
			lines.push(`  "${name}" --> Center`);
		}

		for (const edge of outgoing) {
			const name = path.basename(edge.to);
			lines.push(`  Center --> "${name}"`);
		}

		return {
			content: [
				{
					type: "text",
					text: `Mermaid Diagram for ${relPath}:\n\n\`\`\`mermaid\n${lines.join("\n")}\n\`\`\``,
				},
			],
		};
	},

	find_cycles_for_file: async (args, absDir) => {
		const result = await analyze(absDir, { silent: true });
		const filePath = args.file;
		const relPath = path.isAbsolute(filePath)
			? path.relative(absDir, filePath)
			: filePath;

		const cycles = result.circularDependencies.filter((cycle) =>
			cycle.some((p) => p === filePath || path.relative(absDir, p) === relPath),
		);

		if (cycles.length === 0) {
			return {
				content: [{ type: "text", text: `No circular dependency cycles found involving ${relPath}. ✅` }],
			};
		}

		const sections: string[] = [];
		sections.push(`# Circular Dependencies for ${relPath}`);
		sections.push(`Found ${cycles.length} cycle(s).`);
		sections.push("");
		for (const cycle of cycles) {
			const relCycle = cycle.map((p) => path.relative(absDir, p));
			sections.push(`- ${relCycle.join(" → ")}`);
		}

		return {
			content: [{ type: "text", text: sections.join("\n") }],
		};
	},

	get_authorship_metadata: async (args, absDir) => {
		const filePath = args.file;
		const relPath = path.isAbsolute(filePath)
			? path.relative(absDir, filePath)
			: filePath;

		try {
			const output = execSync(
				`git log --format="%an" -- "${relPath}"`,
				{ cwd: absDir, encoding: "utf-8" }
			);

			const authors = new Map<string, number>();
			const lines = output.split("\n").filter((l) => l.trim().length > 0);
			for (const author of lines) {
				authors.set(author, (authors.get(author) || 0) + 1);
			}

			const sorted = Array.from(authors.entries()).sort((a, b) => b[1] - a[1]);
			const total = lines.length;

			const sections: string[] = [];
			sections.push(`# Authorship: ${relPath}`);
			sections.push(`Total modifications recorded: ${total}`);
			sections.push("");
			sections.push("| Author | Contributions (%) | Commit Count |");
			sections.push("|--------|-------------------|--------------|");
			for (const [author, count] of sorted) {
				const pct = ((count / total) * 100).toFixed(1);
				sections.push(`| ${author} | ${pct}% | ${count} |`);
			}

			return {
				content: [{ type: "text", text: sections.join("\n") }],
			};
		} catch {
			return {
				content: [{ type: "text", text: "Failed to retrieve Git history." }],
				isError: true,
			};
		}
	},

	get_evolutionary_risk: async (args, absDir) => {
		const result = await analyze(absDir, { silent: true });
		const filePath = args.file;
		const relPath = path.isAbsolute(filePath)
			? path.relative(absDir, filePath)
			: filePath;

		const fileNode = result.files.find(
			(f) => f.path === filePath || f.relativePath === relPath,
		);

		if (!fileNode) {
			return {
				content: [{ type: "text", text: `File not found: ${relPath}` }],
				isError: true,
			};
		}

		const churn = fileNode.churn || 0;
		const complexity = fileNode.complexity;
		const riskScore = (complexity * Math.log2(churn + 1)).toFixed(2);

		const sections: string[] = [];
		sections.push(`# Evolutionary Risk: ${relPath}`);
		sections.push("");
		sections.push(`- **Risk Score:** ${riskScore}`);
		sections.push(`- **Churn (6m):** ${churn} changes`);
		sections.push(`- **Complexity:** ${complexity}`);
		sections.push("");

		if (Number.parseFloat(riskScore) > 50) {
			sections.push("⚠️ **HIGH RISK**: This file is highly complex and changing frequently. It is a major candidate for technical debt and bugs.");
		} else if (Number.parseFloat(riskScore) > 20) {
			sections.push("ℹ️ **MODERATE RISK**: Keep an eye on this file; its complexity is starting to clash with its change rate.");
		} else {
			sections.push("✅ **STABLE**: Low complexity relative to its evolution.");
		}

		return {
			content: [{ type: "text", text: sections.join("\n") }],
		};
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
