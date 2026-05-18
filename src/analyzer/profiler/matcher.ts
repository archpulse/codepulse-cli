import * as path from "node:path";
import type { FileNode, FunctionNode } from "../../types/analysis";
import type {
	MatchConfidence,
	MatchResult,
	ProfileEntry,
} from "../../types/profiler";

interface IndexedFunction extends FunctionNode {
	_filePath: string;
	_relativePath: string;
}

/**
 * Multi-pass matching pipeline that maps profiler entries to AST function nodes.
 *
 * Pass 1: Exact relative path + function name
 * Pass 2: Filename (basename) + function name
 * Pass 3: Function name + line range overlap
 * Pass 4: Unique function name (single candidate)
 * Pass 5: Fuzzy name match (Levenshtein distance ≤ 2)
 */
export function matchProfileToAST(
	entries: ProfileEntry[],
	files: FileNode[],
): { matched: MatchResult[]; unmatched: ProfileEntry[] } {
	// Build lookup indices
	const byExactPath = new Map<string, IndexedFunction[]>();
	const byFileName = new Map<string, IndexedFunction[]>();
	const byName = new Map<string, IndexedFunction[]>();

	for (const file of files) {
		for (const fn of file.functions) {
			const indexed: IndexedFunction = {
				...fn,
				_filePath: file.path,
				_relativePath: file.relativePath,
			};

			// Index by exact relative path + name
			const key1 = `${file.relativePath}::${fn.name}`;
			pushToMap(byExactPath, key1, indexed);

			// Index by filename + name
			const key2 = `${path.basename(file.relativePath)}::${fn.name}`;
			pushToMap(byFileName, key2, indexed);

			// Index by name only
			pushToMap(byName, fn.name, indexed);
		}
	}

	const matched: MatchResult[] = [];
	const unmatched: ProfileEntry[] = [];

	for (const entry of entries) {
		const result = matchSingleEntry(entry, byExactPath, byFileName, byName);

		if (result) {
			matched.push(result);
		} else {
			unmatched.push(entry);
		}
	}

	return { matched, unmatched };
}

function matchSingleEntry(
	entry: ProfileEntry,
	byExactPath: Map<string, IndexedFunction[]>,
	byFileName: Map<string, IndexedFunction[]>,
	byName: Map<string, IndexedFunction[]>,
): MatchResult | null {
	return (
		matchPassExact(entry, byExactPath) ||
		matchPassFilename(entry, byFileName) ||
		matchPassLineRange(entry, byName) ||
		matchPassUniqueName(entry, byName) ||
		matchPassFuzzy(entry, byName)
	);
}

function matchPassExact(
	entry: ProfileEntry,
	byExactPath: Map<string, IndexedFunction[]>,
): MatchResult | null {
	if (!entry.filePath) return null;

	const key = `${entry.filePath}::${entry.functionName}`;
	const candidates = byExactPath.get(key);

	if (candidates?.length === 1) {
		return createMatch(entry, candidates[0], "exact");
	}

	if (candidates && candidates.length > 1 && entry.lineNumber) {
		const lineMatch = findByLineRange(candidates, entry.lineNumber);
		if (lineMatch) return createMatch(entry, lineMatch, "exact");
	}

	return null;
}

function matchPassFilename(
	entry: ProfileEntry,
	byFileName: Map<string, IndexedFunction[]>,
): MatchResult | null {
	if (!entry.fileName) return null;

	const key = `${entry.fileName}::${entry.functionName}`;
	const candidates = byFileName.get(key);

	if (candidates?.length === 1) {
		return createMatch(entry, candidates[0], "filename");
	}

	if (candidates && candidates.length > 1 && entry.lineNumber) {
		const lineMatch = findByLineRange(candidates, entry.lineNumber);
		if (lineMatch) return createMatch(entry, lineMatch, "filename");
	}

	return null;
}

function matchPassLineRange(
	entry: ProfileEntry,
	byName: Map<string, IndexedFunction[]>,
): MatchResult | null {
	const nameCandidates = byName.get(entry.functionName);
	if (nameCandidates && entry.lineNumber) {
		const lineMatch = findByLineRange(nameCandidates, entry.lineNumber);
		if (lineMatch) return createMatch(entry, lineMatch, "line-range");
	}
	return null;
}

function matchPassUniqueName(
	entry: ProfileEntry,
	byName: Map<string, IndexedFunction[]>,
): MatchResult | null {
	const nameCandidates = byName.get(entry.functionName);
	if (nameCandidates?.length === 1) {
		return createMatch(entry, nameCandidates[0], "name-only");
	}
	return null;
}

function matchPassFuzzy(
	entry: ProfileEntry,
	byName: Map<string, IndexedFunction[]>,
): MatchResult | null {
	const fuzzyMatch = findFuzzyMatch(entry.functionName, byName, 2);
	if (fuzzyMatch) {
		return createMatch(entry, fuzzyMatch, "fuzzy");
	}
	return null;
}

function findByLineRange(
	candidates: IndexedFunction[],
	lineNumber: number,
): IndexedFunction | null {
	// First try exact range containment
	for (const fn of candidates) {
		if (lineNumber >= fn.startLine && lineNumber <= fn.endLine) {
			return fn;
		}
	}
	// Then try proximity (within 5 lines of start)
	let closest: IndexedFunction | null = null;
	let closestDist = Infinity;
	for (const fn of candidates) {
		const dist = Math.abs(lineNumber - fn.startLine);
		if (dist <= 5 && dist < closestDist) {
			closest = fn;
			closestDist = dist;
		}
	}
	return closest;
}

function findFuzzyMatch(
	name: string,
	byName: Map<string, IndexedFunction[]>,
	maxDistance: number,
): IndexedFunction | null {
	let bestMatch: IndexedFunction | null = null;
	let bestDist = maxDistance + 1;

	for (const [candidateName, functions] of byName) {
		// Quick length check to avoid expensive computation
		if (Math.abs(candidateName.length - name.length) > maxDistance) continue;

		const dist = levenshtein(name.toLowerCase(), candidateName.toLowerCase());
		if (dist <= maxDistance && dist < bestDist) {
			// Only match if there's exactly one function with this name
			if (functions.length === 1) {
				bestDist = dist;
				bestMatch = functions[0];
			}
		}
	}

	return bestMatch;
}

/**
 * Levenshtein distance with early termination.
 */
function levenshtein(a: string, b: string): number {
	if (a === b) return 0;
	if (a.length === 0) return b.length;
	if (b.length === 0) return a.length;

	// Use two-row optimization
	let prev = Array.from({ length: b.length + 1 }) as number[];
	let curr = Array.from({ length: b.length + 1 }) as number[];

	for (let j = 0; j <= b.length; j++) prev[j] = j;

	for (let i = 1; i <= a.length; i++) {
		curr[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			curr[j] = Math.min(
				prev[j] + 1, // deletion
				curr[j - 1] + 1, // insertion
				prev[j - 1] + cost, // substitution
			);
		}
		[prev, curr] = [curr, prev];
	}

	return prev[b.length];
}

function createMatch(
	entry: ProfileEntry,
	fn: IndexedFunction,
	confidence: MatchConfidence,
): MatchResult {
	return {
		entry,
		functionNode: {
			name: fn.name,
			startLine: fn.startLine,
			endLine: fn.endLine,
			complexity: fn.complexity,
			isExported: fn.isExported,
			fingerprint: fn.fingerprint,
		},
		file: fn._relativePath,
		confidence,
	};
}

function pushToMap<T>(map: Map<string, T[]>, key: string, value: T): void {
	const arr = map.get(key);
	if (arr) {
		arr.push(value);
	} else {
		map.set(key, [value]);
	}
}
