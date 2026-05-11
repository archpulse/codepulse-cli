import * as path from "node:path";
import type { AnalysisContext } from "../types/analysis";
import type { Issue } from "../types/issues";
import type { Rule } from "./rule";

export class CriticalNodeRule implements Rule {
	name = "critical-node";

	run(context: AnalysisContext): Issue[] {
		const issues: Issue[] = [];

		for (const [filePath, node] of context.graph) {
			if (!node.isCritical) continue;

			const file = context.files.find((f) => f.path === filePath);
			const rel = file?.relativePath ?? path.basename(filePath);

			issues.push({
				type: "critical-node",
				severity: "error",
				file: rel,
				message: `Critical module — imported by ${node.inDegree} files, centrality score ${node.centrality}.`,
				suggestion:
					"Removing or breaking this file will cascade failures. Add tests and document it.",
			});
		}

		return issues;
	}
}
