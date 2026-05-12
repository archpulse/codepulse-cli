import { execSync } from "node:child_process";
import type { DiffEntry } from "../../types/index";

/**
 * Returns a list of commit SHAs with dates, from oldest to newest.
 */
export function getCommitList(
	dir: string,
	since?: string,
): { sha: string; date: string; author: string; message: string }[] {
	try {
		const sinceArg = since ? ` --since="${since}"` : "";
		const output = execSync(
			`git log --format="%H|%aI|%an|%s" --reverse${sinceArg}`,
			{ cwd: dir, encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 },
		);

		return output
			.trim()
			.split("\n")
			.filter((l) => l.length > 0)
			.map((line) => {
				const [sha, date, author, ...rest] = line.split("|");
				return { sha, date, author, message: rest.join("|") };
			});
	} catch {
		return [];
	}
}

/**
 * Returns all tags in the repo with their commit SHAs.
 */
export function getTagList(
	dir: string,
): { tag: string; sha: string; date: string }[] {
	try {
		const output = execSync(
			'git tag -l --format="%(refname:short)|%(objectname:short)|%(*objectname:short)|%(creatordate:iso-strict)"',
			{ cwd: dir, encoding: "utf-8" },
		);

		return output
			.trim()
			.split("\n")
			.filter((l) => l.length > 0)
			.map((line) => {
				const parts = line.split("|");
				const tag = parts[0];
				// For annotated tags, use the dereferenced commit; for lightweight, use objectname
				const sha = parts[2] || parts[1];
				const date = parts[3];
				return { tag, sha, date };
			});
	} catch {
		return [];
	}
}

/**
 * Parses `git diff --name-status -M` output between two commits.
 * -M90 enables rename detection with 90% similarity threshold.
 */
export function getCommitDiff(
	dir: string,
	fromSha: string,
	toSha: string,
): DiffEntry[] {
	try {
		const output = execSync(`git diff --name-status -M90 ${fromSha} ${toSha}`, {
			cwd: dir,
			encoding: "utf-8",
			maxBuffer: 10 * 1024 * 1024,
		});

		return output
			.trim()
			.split("\n")
			.filter((l) => l.length > 0)
			.map(parseDiffLine)
			.filter((e): e is DiffEntry => e !== null);
	} catch {
		return [];
	}
}

/**
 * Lists all tracked files at a specific commit.
 */
export function getFilesAtCommit(dir: string, sha: string): string[] {
	try {
		const output = execSync(`git ls-tree -r --name-only ${sha}`, {
			cwd: dir,
			encoding: "utf-8",
			maxBuffer: 10 * 1024 * 1024,
		});
		return output
			.trim()
			.split("\n")
			.filter((l) => l.length > 0);
	} catch {
		return [];
	}
}

/**
 * Retrieves the content of a file at a specific commit via `git show`.
 */
export function getFileAtCommit(
	dir: string,
	sha: string,
	filePath: string,
): string | null {
	try {
		return execSync(`git show ${sha}:${filePath}`, {
			cwd: dir,
			encoding: "utf-8",
			maxBuffer: 5 * 1024 * 1024,
		});
	} catch {
		return null;
	}
}

function parseDiffLine(line: string): DiffEntry | null {
	const parts = line.split("\t");
	if (parts.length < 2) return null;

	const statusRaw = parts[0];

	if (statusRaw === "A") {
		return { status: "A", newPath: parts[1] };
	}
	if (statusRaw === "M") {
		return { status: "M", newPath: parts[1] };
	}
	if (statusRaw === "D") {
		return { status: "D", newPath: parts[1] };
	}
	// Renames: R090\told/path\tnew/path
	if (statusRaw.startsWith("R")) {
		const similarity = Number.parseInt(statusRaw.slice(1), 10) || 100;
		return {
			status: "R",
			oldPath: parts[1],
			newPath: parts[2],
			similarity,
		};
	}

	return null;
}
