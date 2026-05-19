import { execSync } from "node:child_process";
import type { FileNode } from "../types/analysis";
import type { Hotspot } from "../types/git";

export function getGitChurn(dir: string): Map<string, number> {
	const churnMap = new Map<string, number>();
	try {
		const output = execSync(
			'git log --format=format: --name-only --since="6 months ago"',
			{ cwd: dir, encoding: "utf-8" },
		);

		const files = output.split("\n");
		for (const file of files) {
			const trimmed = file.trim();
			if (trimmed) {
				churnMap.set(trimmed, (churnMap.get(trimmed) || 0) + 1);
			}
		}
	} catch {
		// Ignore git errors
	}
	return churnMap;
}

export function calculateHotspots(files: FileNode[]): Hotspot[] {
	return files
		.map((f) => {
			const churn = f.churn || 0;

			const score = f.complexity * Math.log2(churn + 1);
			return {
				file: f.relativePath,
				score: Math.round(score * 10) / 10,
				complexity: f.complexity,
				churn,
			};
		})
		.filter((h) => h.score > 20 && h.churn >= 2)
		.sort((a, b) => b.score - a.score)
		.slice(0, 10);
}

export interface TemporalCoupling {
	fileA: string;
	fileB: string;
	coChanges: number;
	totalA: number;
	totalB: number;
	couplingDegree: number;
}

export function getTemporalCoupling(
	dir: string,
	since = "6 months ago",
	threshold = 0.5,
): TemporalCoupling[] {
	const couplings: TemporalCoupling[] = [];
	try {
		// 1. Get list of commits
		const commitHashes = execSync(`git log --format=%H --since="${since}"`, {
			cwd: dir,
			encoding: "utf-8",
		})
			.split("\n")
			.filter((h) => h.length > 0);

		const fileOccurrence = new Map<string, Set<string>>(); // file -> commitHashes
		const fileTotalChanges = new Map<string, number>();

		// 2. Map files to commits
		for (const sha of commitHashes) {
			const filesInCommit = execSync(
				`git diff-tree --no-commit-id --name-only -r ${sha}`,
				{ cwd: dir, encoding: "utf-8" },
			)
				.split("\n")
				.filter((f) => f.length > 0);

			for (const file of filesInCommit) {
				if (!fileOccurrence.has(file)) fileOccurrence.set(file, new Set());
				fileOccurrence.get(file)!.add(sha);
				fileTotalChanges.set(file, (fileTotalChanges.get(file) || 0) + 1);
			}
		}

		const files = Array.from(fileTotalChanges.keys());

		// 3. Compare pairs
		for (let i = 0; i < files.length; i++) {
			for (let j = i + 1; j < files.length; j++) {
				const fileA = files[i];
				const fileB = files[j];

				const setA = fileOccurrence.get(fileA)!;
				const setB = fileOccurrence.get(fileB)!;

				// Intersection: commits where both changed
				let common = 0;
				for (const sha of setA) {
					if (setB.has(sha)) common++;
				}

				if (common < 2) continue; // Skip rare coincidences

				// Degree: Jaccard index (A ∩ B) / (A ∪ B)
				const unionSize = setA.size + setB.size - common;
				const degree = common / unionSize;

				if (degree >= threshold) {
					couplings.push({
						fileA,
						fileB,
						coChanges: common,
						totalA: setA.size,
						totalB: setB.size,
						couplingDegree: Math.round(degree * 100) / 100,
					});
				}
			}
		}
	} catch {
		// Ignore git errors
	}

	return couplings.sort((a, b) => b.couplingDegree - a.couplingDegree);
}
