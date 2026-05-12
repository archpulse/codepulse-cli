import type { SamplingStrategy } from "../../types/index";

interface CommitInfo {
	sha: string;
	date: string;
	author: string;
	message: string;
}

/**
 * Selects a subset of commits based on the given sampling strategy.
 * Returns the indices of the selected commits from the full list.
 */
export function sampleCommits(
	commits: CommitInfo[],
	strategy: SamplingStrategy,
): CommitInfo[] {
	if (commits.length === 0) return [];

	switch (strategy.type) {
		case "every-nth":
			return sampleEveryNth(commits, strategy.n);
		case "date-interval":
			return sampleByDateInterval(commits, strategy.interval);
		case "max-points":
			return sampleMaxPoints(commits, strategy.count);
		case "tag-only":
			// Tag-only is handled externally via getTagList; return empty
			return [];
	}
}

function sampleEveryNth(commits: CommitInfo[], n: number): CommitInfo[] {
	const result: CommitInfo[] = [];
	for (let i = 0; i < commits.length; i += Math.max(1, n)) {
		result.push(commits[i]);
	}
	// Always include the last commit
	if (result[result.length - 1] !== commits[commits.length - 1]) {
		result.push(commits[commits.length - 1]);
	}
	return result;
}

function sampleByDateInterval(
	commits: CommitInfo[],
	interval: "daily" | "weekly" | "monthly",
): CommitInfo[] {
	const bucketKey = (dateStr: string): string => {
		const d = new Date(dateStr);
		const year = d.getFullYear();
		const month = d.getMonth();
		const day = d.getDate();

		switch (interval) {
			case "daily":
				return `${year}-${month}-${day}`;
			case "weekly": {
				// ISO week number approximation
				const jan1 = new Date(year, 0, 1);
				const week = Math.ceil(
					((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7,
				);
				return `${year}-W${week}`;
			}
			case "monthly":
				return `${year}-${month}`;
		}
	};

	const seen = new Set<string>();
	const result: CommitInfo[] = [];

	// Walk from oldest to newest; take the LAST commit in each bucket
	for (let i = commits.length - 1; i >= 0; i--) {
		const key = bucketKey(commits[i].date);
		if (!seen.has(key)) {
			seen.add(key);
			result.push(commits[i]);
		}
	}

	// Reverse to maintain chronological order
	result.reverse();

	// Always include first and last
	if (result[0]?.sha !== commits[0]?.sha) {
		result.unshift(commits[0]);
	}
	if (result[result.length - 1]?.sha !== commits[commits.length - 1]?.sha) {
		result.push(commits[commits.length - 1]);
	}

	return result;
}

function sampleMaxPoints(commits: CommitInfo[], count: number): CommitInfo[] {
	if (commits.length <= count) return [...commits];

	const result: CommitInfo[] = [commits[0]];
	const step = (commits.length - 1) / (count - 1);

	for (let i = 1; i < count - 1; i++) {
		const idx = Math.round(i * step);
		result.push(commits[idx]);
	}

	result.push(commits[commits.length - 1]);
	return result;
}
