import * as crypto from "node:crypto";
import * as fs from "node:fs";
import type { AnalysisContext } from "../types/analysis";
import type { Issue } from "../types/issues";
import type { Rule } from "./rule";

export class DuplicationRule implements Rule {
	name = "code-duplication";

	run(context: AnalysisContext): Issue[] {
		const issues: Issue[] = [];
		const threshold = context.config.duplicationThreshold || 15;
		const fingerprints = new Map<string, { file: string; line: number }>();

		for (const file of context.files) {
			try {
				const content = fs.readFileSync(file.path, "utf-8");
				const lines = content.split("\n");

				for (let i = 0; i <= lines.length - threshold; i++) {
					const block = lines
						.slice(i, i + threshold)
						.map((l) => l.trim())
						.filter((l) => l.length > 0)
						.join("\n");

					if (block.length < 50) continue;

					const hash = crypto.createHash("md5").update(block).digest("hex");

					if (fingerprints.has(hash)) {
						const original = fingerprints.get(hash)!;
						if (original.file !== file.relativePath) {
							issues.push({
								type: "duplication",
								severity: "warning",
								file: file.relativePath,
								line: i + 1,
								message: `Identical code block (${threshold} lines) found.`,
								suggestion: `Consider refactoring shared logic with ${original.file}.`,
							});

							i += threshold;
						}
					} else {
						fingerprints.set(hash, { file: file.relativePath, line: i + 1 });
					}
				}
			} catch {}
		}

		return issues;
	}
}
