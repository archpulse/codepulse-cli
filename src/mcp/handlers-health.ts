import * as path from "node:path";
import { analyze } from "../analyzer";
import { loadConfig } from "../analyzer/context";
import { EXPLANATIONS, type ExplainKey } from "../explain";
import { calculateHealthScore, calculateConfidenceScore } from "../reporter/stats";


import { McpHandler, McpHandlerResponse } from "./types";

function addCircularDepsSection(sections: string[], circularDependencies: string[][]) {
	if (circularDependencies.length > 0) {
		sections.push("");
		sections.push(
			`## 🔄 Circular Dependencies (${circularDependencies.length}) — FIX URGENTLY`,
		);
		for (const cycle of circularDependencies.slice(0, 5)) {
			const relCycle = cycle.map((p) => path.basename(p));
			sections.push(`- ${relCycle.join(" → ")}`);
		}
	}
}

function addGodFilesSection(sections: string[], godFiles: any[]) {
	if (godFiles.length > 0) {
		sections.push("");
		sections.push(`## 🚨 God Files (${godFiles.length}) — SPLIT THESE`);
		for (const gf of godFiles.slice(0, 5)) {
			sections.push(
				`- **${gf.relativePath}**: ${gf.lines} lines, ${gf.imports.length} imports, complexity ${gf.complexity}`,
			);
		}
	}
}

function addCriticalNodesSection(sections: string[], criticalFiles: any[]) {
	if (criticalFiles.length > 0) {
		sections.push("");
		sections.push(`## ⚡ Critical Nodes (${criticalFiles.length}) — HIGH-RISK DEPENDENCIES`);
		for (const cf of criticalFiles.slice(0, 5)) {
			sections.push(
				`- **${path.basename(cf.id)}**: ${cf.inDegree} dependents (inDegree), centrality ${cf.centrality}`,
			);
		}
	}
}

function addHotspotsSection(sections: string[], hotspots: any[]) {
	if (hotspots.length > 0) {
		sections.push("");
		sections.push(`## 🔥 Hotspots (${hotspots.length}) — REFACTOR PRIORITY`);
		for (const h of hotspots.slice(0, 5)) {
			sections.push(
				`- **${h.file}**: complexity ${h.complexity}, churn ${h.churn}, score ${h.score}`,
			);
		}
	}
}

function addTemporalCouplings(sections: string[], relPath: string, couplings: any[]) {
	if (couplings && couplings.length > 0) {
		sections.push("");
		sections.push(`## 🔗 Temporal Couplings (Changes together with)`);
		for (const c of couplings.slice(0, 5)) {
			const other = c.fileA === relPath ? c.fileB : c.fileA;
			sections.push(`- **${other}**: ${Math.round(c.couplingDegree * 100)}% co-change rate`);
		}
	}
}

function addStructuralDeps(sections: string[], incoming: any[], outgoing: any[]) {
	sections.push("");
	sections.push(`## 🏗️ Structural Dependencies`);
	sections.push(`- **Imported by:** ${incoming.length} files`);
	sections.push(`- **Imports:** ${outgoing.length} files`);
}

export const HEALTH_HANDLERS: Record<string, McpHandler> = {
	codepulse_identity: async (_args, absDir): Promise<McpHandlerResponse> => {
		const result = await analyze(absDir, { silent: true });

		const vulnerabilities = result.issues.filter((i) => i.type === "vulnerability").length;
		const archViolationCount = result.issues.filter((i) => i.type === "architecture-violation").length;
		
		const healthStats = {
			vulnerabilities,
			deadExports: result.deadExports.length,
			godFiles: result.godFiles.length,
			criticalFiles: result.criticalFiles.length,
			hotspots: result.hotspots,
			avgComplexity: result.avgComplexity,
			circularDependencies: result.circularDependencies.length,
			architectureViolations: archViolationCount,
		};
		const healthScore = calculateHealthScore(healthStats, result);
		const confidenceScore = calculateConfidenceScore(result);

		const errors = result.issues.filter((i) => i.severity === "error");
		const warnings = result.issues.filter((i) => i.severity === "warning");

		const sections: string[] = [
			`# CodePulse — Project Health Check`,
			`**Health Score: ${healthScore}/100** ${healthScore >= 80 ? "✅" : healthScore >= 50 ? "⚠️" : "🔴"}`,
			`**Confidence: ${confidenceScore}%** ${confidenceScore >= 90 ? "🛡️" : "⚠️"}`,
			"",
			`| Metric | Value |`,
			`|--------|-------|`,
			`| Files | ${result.totalFiles} |`,
			`| Lines | ${result.totalLines} |`,
			`| Avg Complexity | ${result.avgComplexity.toFixed(1)} |`,
			`| Errors | ${errors.length} |`,
			`| Warnings | ${warnings.length} |`,
		];

		addCircularDepsSection(sections, result.circularDependencies);
		addGodFilesSection(sections, result.godFiles);
		addCriticalNodesSection(sections, result.criticalFiles);
		addHotspotsSection(sections, result.hotspots);

		if (result.deadExports.length > 0) {
			sections.push(`\n## 🗑️ Dead Exports: ${result.deadExports.length} unused exports found`);
		}
		if (vulnerabilities > 0) {
			sections.push(`\n## 🛡️ Security: ${vulnerabilities} vulnerability patterns detected`);
		}
		if (archViolationCount > 0) {
			sections.push(`\n## 🏗️ Architecture: ${archViolationCount} boundary violations detected`);
		}

		sections.push("", "---", "**Available CodePulse tools when you need a broader check:**",
			"- `analyze_project` — Get a filtered issue list after manual inspection",
			"- `get_hotspots` — Find files that are good refactor candidates",
			"- `find_dead_code` — List unused exports when cleaning up",
			"- `explain_concept` — Understand what any detected issue means",
			"- `get_project_stats` — Quick numeric overview");

		return { content: [{ type: "text", text: sections.join("\n") }] };
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

	get_file_context: async (args, absDir) => {
		const result = await analyze(absDir, { silent: true, pro: true });
		const filePath = args.file;
		const relPath = path.isAbsolute(filePath) ? path.relative(absDir, filePath) : filePath;

		const fileNode = result.files.find((f) => f.path === filePath || f.relativePath === relPath);
		if (!fileNode) {
			return { content: [{ type: "text", text: `File not found in analysis: ${relPath}` }], isError: true };
		}

		const graphNode = result.graph.get(fileNode.path);
		const sections: string[] = [
			`# Architectural Context: ${relPath}`,
			"",
			`- **Complexity:** ${fileNode.complexity}`,
			`- **Lines:** ${fileNode.lines}`,
			`- **Churn:** ${fileNode.churn || 0} changes in 6 months`,
			`- **Centrality:** ${graphNode?.centrality || 0} (how much others depend on this)`,
			`- **Critical Node:** ${graphNode?.isCritical ? "YES 🔴" : "No"}`,
			`- **God File:** ${fileNode.isGodFile ? "YES 🔴" : "No"}`,
		];

		const couplings = result.temporalCouplings?.filter((c) => c.fileA === relPath || c.fileB === relPath);
		addTemporalCouplings(sections, relPath, couplings || []);

		const incoming = result.edges.filter((e) => e.to === fileNode.path);
		const outgoing = result.edges.filter((e) => e.from === fileNode.path);
		addStructuralDeps(sections, incoming, outgoing);

		return { content: [{ type: "text", text: sections.join("\n") }] };
	},

	get_layers: async (_args, absDir) => {
		const config = loadConfig(absDir, {});
		if (!config.architecture || !config.architecture.layers) {
			return {
				content: [
					{
						type: "text",
						text: "No architectural layers defined in .codepulse.json",
					},
				],
			};
		}

		const sections: string[] = [];
		sections.push(`# Architectural Layers`);
		sections.push("");
		for (const layer of config.architecture.layers) {
			sections.push(`## Layer: ${layer.name}`);
			sections.push(`- **Pattern:** \`${layer.pattern}\``);
			sections.push(
				`- **Allowed Dependencies From:** ${layer.allowDependenciesFrom?.join(", ") || "None"}`,
			);
			sections.push("");
		}

		return {
			content: [{ type: "text", text: sections.join("\n") }],
		};
	},

	get_architecture_violations: async (_args, absDir) => {
		const result = await analyze(absDir, { silent: true });
		const violations = result.issues.filter(
			(i) => i.type === "architecture-violation",
		);

		if (violations.length === 0) {
			return {
				content: [{ type: "text", text: "No architectural violations found. ✅" }],
			};
		}

		const summary = `
Architectural Boundary Violations
---------------------------------
Found ${violations.length} violations.

${violations.map((v) => `- [${v.severity.toUpperCase()}] ${v.file}: ${v.message}\n  Suggestion: ${v.suggestion || "N/A"}`).join("\n\n")}
        `.trim();

		return { content: [{ type: "text", text: summary }] };
	},

	get_file_dependencies: async (args, absDir) => {
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
				content: [
					{ type: "text", text: `File not found in analysis: ${relPath}` },
				],
				isError: true,
			};
		}

		const incoming = result.edges
			.filter((e) => e.to === fileNode.path)
			.map((e) => path.relative(absDir, e.from));
		const outgoing = result.edges
			.filter((e) => e.from === fileNode.path)
			.map((e) => path.relative(absDir, e.to));

		const sections: string[] = [];
		sections.push(`# Dependencies for ${relPath}`);
		sections.push("");
		sections.push(`## 📥 Imported by (${incoming.length} files)`);
		if (incoming.length > 0) {
			sections.push(incoming.map((f) => `- ${f}`).join("\n"));
		} else {
			sections.push("_None_");
		}

		sections.push("");
		sections.push(`## 📤 Imports (${outgoing.length} files)`);
		if (outgoing.length > 0) {
			sections.push(outgoing.map((f) => `- ${f}`).join("\n"));
		} else {
			sections.push("_None_");
		}

		return {
			content: [{ type: "text", text: sections.join("\n") }],
		};
	},

};
