import type {
	DebtCategory,
	DebtScore,
	MatchConfidence,
	MatchResult,
	ProfileCorrelationResult,
	ProfileEntry,
} from "../../types/profiler";
import type { FileNode } from "../../types/analysis";
import { matchProfileToAST } from "./matcher";

const CONFIDENCE_WEIGHTS: Record<MatchConfidence, number> = {
	exact: 1.0,
	filename: 0.9,
	"line-range": 0.85,
	"name-only": 0.7,
	fuzzy: 0.5,
};

/**
 * Correlates profiler data with AST analysis to produce
 * Performance-Heavy Technical Debt scores.
 */
export function computeProfileCorrelation(
	entries: ProfileEntry[],
	files: FileNode[],
): ProfileCorrelationResult {
	const { matched, unmatched } = matchProfileToAST(entries, files);

	const debtScores: DebtScore[] = matched.map((m) => {
		const score = computeDebtScore(m);
		const category = categorize(m);

		return {
			file: m.file,
			functionName: m.functionNode.name,
			complexity: m.functionNode.complexity,
			selfTimeMs: m.entry.selfTime,
			totalTimeMs: m.entry.totalTime,
			matchConfidence: m.confidence,
			debtScore: score,
			category,
		};
	});

	// Sort by debt score descending
	debtScores.sort((a, b) => b.debtScore - a.debtScore);

	return {
		matched: debtScores,
		unmatchedEntries: unmatched,
		totalProfileEntries: entries.length,
		matchRate:
			entries.length > 0
				? Math.round((matched.length / entries.length) * 1000) / 10
				: 0,
	};
}

/**
 * Computes the combined debt score for a matched function.
 *
 * Formula: log2(complexity + 1) × log10(selfTimeMs + 1) × confidenceWeight
 *
 * This weights both static complexity and actual runtime cost, with
 * a penalty for lower-confidence matches.
 */
function computeDebtScore(m: MatchResult): number {
	const complexityFactor = Math.log2(m.functionNode.complexity + 1);
	const timeFactor = Math.log10(m.entry.selfTime + 1);
	const weight = CONFIDENCE_WEIGHTS[m.confidence];

	return Math.round(complexityFactor * timeFactor * weight * 100) / 100;
}

/**
 * Categorizes a match into one of three debt categories:
 *
 * - active-hotspot: High complexity AND high self-time (real problem)
 * - dormant-debt:   High complexity but low self-time (latent risk)
 * - io-bound:       Low complexity but high self-time (I/O, not code quality)
 */
function categorize(m: MatchResult): DebtCategory {
	const highComplexity = m.functionNode.complexity >= 8;
	const highTime = m.entry.selfTime >= 50; // 50ms threshold

	if (highComplexity && highTime) return "active-hotspot";
	if (highComplexity && !highTime) return "dormant-debt";
	return "io-bound";
}
