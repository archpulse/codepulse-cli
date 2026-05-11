import type { AnalysisResult } from "../types/index";

export function buildStats(result: AnalysisResult) {
	const top10Complex = [...result.files]
		.sort((a, b) => b.complexity - a.complexity)
		.slice(0, 10)
		.map((f) => ({
			path: f.relativePath,
			complexity: f.complexity,
			lines: f.lines,
		}));

	const vulnerabilities = result.issues.filter(
		(i) => i.type === "vulnerability",
	);

	const treemapData = result.files.map((f) => ({
		name: f.relativePath,
		value: f.lines,
		complexity: f.complexity,
		churn: f.churn || 0,
		isGod: f.isGodFile,
	}));

	return {
		totalFiles: result.totalFiles,
		totalLines: result.totalLines,
		avgComplexity: Math.round(result.avgComplexity * 10) / 10,
		deadExports: result.deadExports.length,
		godFiles: result.godFiles.length,
		criticalFiles: result.criticalFiles.length,
		vulnerabilities: vulnerabilities.length,
		hotspots: result.hotspots,
		treemapData,
		top10Complex,
		deadExportsList: result.deadExports,
		godFilesList: result.godFiles.map((f) => ({
			path: f.relativePath,
			lines: f.lines,
			imports: f.imports.length,
			complexity: f.complexity,
		})),
		vulnerabilitiesList: vulnerabilities.map((v) => ({
			file: v.file,
			line: v.line,
			message: v.message,
			suggestion: v.suggestion,
		})),
		graphData: {
			nodes: result.files.map((f) => ({
				id: f.path,
				name: f.relativePath.split("/").pop(),
				fullPath: f.relativePath,
				complexity: f.complexity,
				isCritical: result.graph.get(f.path)?.isCritical || false,
				isGod: f.isGodFile,
			})),
			links: result.edges.map((e) => ({ source: e.from, target: e.to })),
		},
	};
}

export function calculateHealthScore(
	stats: any,
	result: AnalysisResult,
): number {
	let score = 100;

	const scaIssues = result.issues.filter(
		(i) => i.type === "dependency-vulnerability",
	).length;
	const duplicationIssues = result.issues.filter(
		(i) => i.type === "duplication",
	).length;
	const linterIssues = result.issues.filter((i) => i.type === "linter").length;

	// Severe issues
	score -= Math.min(40, stats.vulnerabilities * 15);
	score -= Math.min(30, scaIssues * 15);

	// Design/Quality issues
	score -= Math.min(25, duplicationIssues * 4);
	score -= Math.min(20, stats.hotspots.length * 5);
	score -= Math.min(15, stats.deadExports * 2);
	score -= Math.min(15, stats.godFiles * 8);
	score -= Math.min(10, stats.criticalFiles * 2);

	// Complexity impact
	score -= Math.min(25, Math.max(0, stats.avgComplexity - 4) * 3);

	// Linter impact (scaling with issue density)
	if (linterIssues > 0) {
		const linterPenalty = Math.min(25, Math.sqrt(linterIssues) * 1.2);
		score -= linterPenalty;
	}

	return Math.max(0, Math.round(score));
}
