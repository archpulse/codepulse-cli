import * as path from "node:path";
import { analyze } from "../analyzer";
import { EXPLANATIONS, type ExplainKey } from "../explain";
import { calculateHealthScore } from "../reporter/stats";

export const TOOL_HANDLERS: Record<
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
			circularDependencies: result.circularDependencies.length,
		};
		const healthScore = calculateHealthScore(healthStats, result);

		const errors = result.issues.filter((i) => i.severity === "error");
		const warnings = result.issues.filter((i) => i.severity === "warning");

		const sections: string[] = [];
		sections.push(`# CodePulse — Project Health Check`);
		sections.push(
			`**Health Score: ${healthScore}/100** ${healthScore >= 80 ? "✅" : healthScore >= 50 ? "⚠️" : "🔴"}`,
		);
		sections.push("");
		sections.push(`| Metric | Value |`);
		sections.push(`|--------|-------|`);
		sections.push(`| Files | ${result.totalFiles} |`);
		sections.push(`| Lines | ${result.totalLines} |`);
		sections.push(`| Avg Complexity | ${result.avgComplexity.toFixed(1)} |`);
		sections.push(`| Errors | ${errors.length} |`);
		sections.push(`| Warnings | ${warnings.length} |`);

		if (result.circularDependencies.length > 0) {
			sections.push("");
			sections.push(
				`## 🔄 Circular Dependencies (${result.circularDependencies.length}) — FIX URGENTLY`,
			);
			for (const cycle of result.circularDependencies.slice(0, 5)) {
				const relCycle = cycle.map((p) => path.basename(p));
				sections.push(`- ${relCycle.join(" → ")}`);
			}
		}

		if (result.godFiles.length > 0) {
			sections.push("");
			sections.push(
				`## 🚨 God Files (${result.godFiles.length}) — SPLIT THESE`,
			);
			for (const gf of result.godFiles.slice(0, 5)) {
				sections.push(
					`- **${gf.relativePath}**: ${gf.lines} lines, ${gf.imports.length} imports, complexity ${gf.complexity}`,
				);
			}
		}

		if (result.criticalFiles.length > 0) {
			sections.push("");
			sections.push(
				`## ⚡ Critical Nodes (${result.criticalFiles.length}) — HIGH-RISK DEPENDENCIES`,
			);
			for (const cf of result.criticalFiles.slice(0, 5)) {
				sections.push(
					`- **${path.basename(cf.id)}**: ${cf.inDegree} dependents (inDegree), centrality ${cf.centrality}`,
				);
			}
		}

		if (result.hotspots.length > 0) {
			sections.push("");
			sections.push(
				`## 🔥 Hotspots (${result.hotspots.length}) — REFACTOR PRIORITY`,
			);
			for (const h of result.hotspots.slice(0, 5)) {
				sections.push(
					`- **${h.file}**: complexity ${h.complexity}, churn ${h.churn}, score ${h.score}`,
				);
			}
		}

		if (result.deadExports.length > 0) {
			sections.push("");
			sections.push(
				`## 🗑️ Dead Exports: ${result.deadExports.length} unused exports found`,
			);
		}

		if (vulnerabilities > 0) {
			sections.push("");
			sections.push(
				`## 🛡️ Security: ${vulnerabilities} vulnerability patterns detected`,
			);
		}

		sections.push("");
		sections.push("---");
		sections.push("**Available CodePulse tools you should use:**");
		sections.push(
			"- `analyze_project` — Get full issue list filtered by severity/type",
		);
		sections.push(
			"- `get_hotspots` — Find files that need refactoring most urgently",
		);
		sections.push("- `find_dead_code` — List all unused exports to clean up");
		sections.push(
			"- `explain_concept` — Understand what any detected issue means",
		);
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

	get_file_context: async (args, absDir) => {
		const result = await analyze(absDir, { silent: true, pro: true });
		const filePath = args.file;
		const relPath = path.isAbsolute(filePath)
			? path.relative(absDir, filePath)
			: filePath;

		const fileNode = result.files.find(
			(f) => f.path === filePath || f.relativePath === relPath,
		);
		const graphNode = result.graph.get(fileNode?.path || "");

		if (!fileNode) {
			return {
				content: [
					{ type: "text", text: `File not found in analysis: ${relPath}` },
				],
				isError: true,
			};
		}

		const sections: string[] = [];
		sections.push(`# Architectural Context: ${relPath}`);
		sections.push("");
		sections.push(`- **Complexity:** ${fileNode.complexity}`);
		sections.push(`- **Lines:** ${fileNode.lines}`);
		sections.push(`- **Churn:** ${fileNode.churn || 0} changes in 6 months`);
		sections.push(
			`- **Centrality:** ${graphNode?.centrality || 0} (how much others depend on this)`,
		);
		sections.push(
			`- **Critical Node:** ${graphNode?.isCritical ? "YES 🔴" : "No"}`,
		);
		sections.push(`- **God File:** ${fileNode.isGodFile ? "YES 🔴" : "No"}`);

		const couplings = result.temporalCouplings?.filter(
			(c) => c.fileA === relPath || c.fileB === relPath,
		);
		if (couplings && couplings.length > 0) {
			sections.push("");
			sections.push(`## 🔗 Temporal Couplings (Changes together with)`);
			for (const c of couplings.slice(0, 5)) {
				const other = c.fileA === relPath ? c.fileB : c.fileA;
				sections.push(
					`- **${other}**: ${Math.round(c.couplingDegree * 100)}% co-change rate`,
				);
			}
		}

		const incoming = result.edges.filter((e) => e.to === fileNode.path);
		const outgoing = result.edges.filter((e) => e.from === fileNode.path);

		sections.push("");
		sections.push(`## 🏗️ Structural Dependencies`);
		sections.push(`- **Imported by:** ${incoming.length} files`);
		sections.push(`- **Imports:** ${outgoing.length} files`);

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
