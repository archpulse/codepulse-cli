import type { AnalysisContext } from "../types/analysis";
import type { Issue } from "../types/issues";
import type { Rule } from "./rule";

export class GodFileRule implements Rule {
	name = "god-file";

	run(context: AnalysisContext): Issue[] {
		const issues: Issue[] = [];

		for (const file of context.files) {
			if (!file.isGodFile) continue;

			const reasons: string[] = [];
			if (file.lines >= 500) reasons.push(`${file.lines} lines`);
			if (file.imports.length >= 15)
				reasons.push(`${file.imports.length} imports`);

			issues.push({
				type: "god-file",
				severity: "warning",
				file: file.relativePath,
				message: `File is a god file (${reasons.join(", ")}).`,
				suggestion: "Split into smaller modules with single responsibilities.",
			});
		}

		return issues;
	}
}
