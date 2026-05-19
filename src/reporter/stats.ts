import type { AnalysisResult } from "../types/analysis";

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

	const confidenceScore = calculateConfidenceScore(result);

	return {
		totalFiles: result.totalFiles,
		totalLines: result.totalLines,
		avgComplexity: Math.round(result.avgComplexity * 10) / 10,
		deadExports: result.deadExports.length,
		godFiles: result.godFiles.length,
		criticalFiles: result.criticalFiles.length,
		vulnerabilities: vulnerabilities.length,
		hotspots: result.hotspots,
		confidenceScore,
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

export function calculateConfidenceScore(result: AnalysisResult): number {
	const totalLines = result.totalLines || 0;
	const totalFiles = result.totalFiles || 0;
	const unparsedCount = result.unparsedFiles?.length || 0;
	const avgComplexity = result.avgComplexity || 1;
	
	// ASYMPTOTIC CEILING: 100% confidence is an engineering lie. 
	// We start at 98% to account for inherent static analysis blind spots.
	let confidence = 98;

	// 1. Data Sufficiency (Small Project Penalty)
	if (totalLines < 1000) confidence -= 25;
	else if (totalLines < 3000) confidence -= 10;

	// 2. Assessment Difficulty (Large Project Decay)
	if (totalLines > 50000) {
		const overage = (totalLines - 50000) / 10000; 
		confidence -= Math.min(30, overage * 2);
	}

	// 3. Unknowns (Unparsed Files)
	if (totalFiles > 0) {
		const unparsedRatio = unparsedCount / totalFiles;
		confidence -= (unparsedRatio * 100); // Massive penalty for files we can't read
	}

	// 4. Complexity Uncertainty
	// High complexity makes static analysis less reliable (branch explosion, dynamic patterns)
	if (avgComplexity > 4.0) {
		confidence -= Math.min(15, (avgComplexity - 4.0) * 5);
	}
	
	// 5. Tooling Limitations (Dynamic Patterns)
	// If we detect many dynamic imports or complex patterns (placeholder logic)
	// we would penalize here.

	return Math.max(5, Math.min(98, Math.round(confidence)));
}

export function calculateHealthScore(
	stats: any,
	result: AnalysisResult,
): number {
	const totalLines = result.totalLines || 1;
	const totalFiles = result.totalFiles || 1;
	const kloc = totalLines / 1000;
	
	let score = 100;
	const caps: number[] = [100]; 
	
	const countIssues = (type: string, severity?: string) => 
		result.issues.filter(i => i.type === type && (!severity || i.severity === severity)).length;
	
	// 1. SECURITY & DEPENDENCY HEALTH (Severity Weighted)
	const vError = countIssues("vulnerability", "error");
	const vWarn = countIssues("vulnerability", "warning");
	const dvError = countIssues("dependency-vulnerability", "error");
	const dvWarn = countIssues("dependency-vulnerability", "warning");

	score -= vError * 25;
	score -= vWarn * 10;
	score -= dvError * 15;
	score -= dvWarn * 5;
	
	if (vError > 0) caps.push(59); 
	if (vError > 2) caps.push(39); 
	if (dvError > 1) caps.push(79); 

	// 2. ARCHITECTURE & TOPOLOGY
	const circularCycles = result.circularDependencies?.length || 0;
	const archViolations = countIssues("architecture-violation");
	const godFiles = stats.godFiles || 0;
	const criticalFiles = stats.criticalFiles || 0;

	score -= circularCycles * 10;
	score -= archViolations * 8;
	score -= godFiles * 12; // God files are severe architectural debt
	score -= criticalFiles * 3;
	
	if (circularCycles > 0) caps.push(79);
	if (circularCycles > 3) caps.push(59);
	
	const godFileRatio = godFiles / totalFiles;
	if (godFileRatio > 0.05) caps.push(69);

	// 3. CODE QUALITY & COMPLEXITY (Non-linear Tiered Normalization)
	const highCompError = countIssues("high-complexity", "error");
	const highCompWarn = countIssues("high-complexity", "warning");
	const duplication = countIssues("duplication");
	const avgComplexity = result.avgComplexity || 1;

	// Total "Quality Debt" points
	const qualityDebtPoints = (highCompError * 10) + (highCompWarn * 3) + (duplication * 4);
	
	// Hybrid Penalty: We normalize by sqrt(KLOC) instead of linear KLOC.
	// This ensures that as a project grows, we are more "fair", but we never 
	// let the issues disappear into the noise. 
	// Linear KLOC for a 12K project is 12. sqrt(12) is ~3.4.
	// This keeps the "pressure" on the developer to clean up.
	const normalizedQualityPenalty = qualityDebtPoints / Math.sqrt(kloc || 1);
	score -= normalizedQualityPenalty;
	
	// Average Complexity: Absolute metric. 
	// If avg > 3.0, it's a structural warning regardless of project size.
	if (avgComplexity > 3.0) {
		const avgCompPenalty = Math.pow(avgComplexity - 3.0, 1.5) * 10;
		score -= avgCompPenalty;
	}

	// Harmonized Complexity Caps
	if (avgComplexity > 4.5 || highCompError > 5) caps.push(79); 
	if (avgComplexity > 6.0 || highCompError > 15) caps.push(59); 
	
	// 4. MAINTAINABILITY & DEBT
	const deadExports = stats.deadExports || 0;
	const hotspots = result.hotspots?.length || 0;
	const linterIssues = countIssues("linter");

	// Dead exports are absolute waste. 
	// No normalization for garbage.
	score -= deadExports * 1.5; 
	
	// Hotspots are absolute architectural risks.
	score -= hotspots * 10; 
	
	const linterDensity = linterIssues / (kloc || 1);
	score -= Math.min(linterDensity * 3, 15); 
	
	if (hotspots > 2) caps.push(79); // Even stricter: 3 hotspots is a "concern"
	if (hotspots > 6) caps.push(59); // 7+ hotspots is "unhealthy"
	
	if (deadExports > 20) caps.push(85); // Too much dead code ruins any chance of 90+
	
	// 5. NO SCALE TAX (Moved to Confidence Metric)
	
	const maxAllowedScore = Math.min(...caps);
	
	return Math.max(0, Math.min(maxAllowedScore, Math.round(score)));
}
