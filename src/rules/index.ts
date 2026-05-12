import * as fs from "node:fs";
import * as path from "node:path";
import { getFileLayer, isDependencyAllowed } from "../analyzer/architecture";
import type { AnalysisContext, Issue, Rule } from "../types/index";

import { FastLinterRule } from "./fastLinter";
import { VulnerabilityRule } from "./vulnerability";

export class ArchitectureRule implements Rule {
	name = "architecture-violation";
	description =
		"Detects violations of defined architectural layers and boundaries.";

	run(context: AnalysisContext): Issue[] {
		const issues: Issue[] = [];
		const { edges, config } = context;

		if (!config.architecture) return [];

		for (const edge of edges) {
			const fromFile = edge.from;
			const toFile = edge.to;

			const fromLayer = getFileLayer(fromFile, config);
			const toLayer = getFileLayer(toFile, config);

			if (fromLayer && toLayer && fromLayer !== toLayer) {
				if (!isDependencyAllowed(fromLayer, toLayer, config)) {
					issues.push({
						type: "architecture-violation",
						severity: "error",
						file: fromFile,
						message: `Architectural violation: Layer "${fromLayer}" is not allowed to depend on Layer "${toLayer}".`,
						suggestion: `Refactor the dependency from ${fromFile} to ${toFile} to respect architectural boundaries.`,
					});
				}
			}
		}

		return issues;
	}
}

const WARN_THRESHOLD = 10;

export class ComplexityRule implements Rule {
	name = "high-complexity";

	constructor(private errorThreshold: number = 20) {}

	run(context: AnalysisContext): Issue[] {
		const issues: Issue[] = [];

		for (const file of context.files) {
			for (const fn of file.functions) {
				if (fn.complexity <= WARN_THRESHOLD) continue;

				const severity =
					fn.complexity > this.errorThreshold ? "error" : "warning";
				issues.push({
					type: "high-complexity",
					severity,
					file: file.relativePath,
					line: fn.startLine,
					symbol: fn.name,
					message: `Function "${fn.name}" has cyclomatic complexity of ${fn.complexity}.`,
					suggestion:
						fn.complexity > this.errorThreshold
							? "Refactor urgently — split into smaller focused functions."
							: "Consider simplifying branching logic.",
				});
			}
		}

		return issues;
	}
}

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

export class DeadExportRule implements Rule {
	name = "dead-export";

	run(context: AnalysisContext): Issue[] {
		const issues: Issue[] = [];
		const importedFiles = new Set(context.edges.map((e) => e.to));

		for (const file of context.files) {
			if (importedFiles.has(file.path)) continue;
			for (const exp of file.exports) {
				if (exp === "default" || exp === "module.exports") continue;
				issues.push({
					type: "dead-export",
					severity: "warning",
					file: file.relativePath,
					symbol: exp,
					message: `Export "${exp}" is never imported by any other file.`,
					suggestion: "Remove the export or verify it is used dynamically.",
				});
			}
		}

		return issues;
	}
}

export class DuplicationRule implements Rule {
	name = "code-duplication";

	run(context: AnalysisContext): Issue[] {
		const issues: Issue[] = [];
		const fingerprints = new Map<
			string,
			{ file: string; func: string; line: number }
		>();

		for (const file of context.files) {
			for (const func of file.functions) {
				if (!func.fingerprint || func.endLine - func.startLine < 5) continue;

				const hash = func.fingerprint;

				if (fingerprints.has(hash)) {
					const original = fingerprints.get(hash)!;
					if (original.file !== file.relativePath) {
						issues.push({
							type: "duplication",
							severity: "warning",
							file: file.relativePath,
							line: func.startLine,
							symbol: func.name,
							message: `Semantic duplication detected: function "${func.name}" is structurally identical to "${original.func}" in ${original.file}.`,
							suggestion: `Consider refactoring these identical functions into a shared utility or base class.`,
						});
					}
				} else {
					fingerprints.set(hash, {
						file: file.relativePath,
						func: func.name,
						line: func.startLine,
					});
				}
			}
		}

		return issues;
	}
}

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

export class SCARule implements Rule {
	name = "software-composition-analysis";

	private readonly db: Record<string, { version: string; message: string }> = {
		lodash: {
			version: "4.17.21",
			message: "Vulnerable to ReDoS. Upgrade to 4.17.21+",
		},
		express: {
			version: "4.17.3",
			message: "Vulnerable to Open Redirect. Upgrade to 4.17.3+",
		},
		axios: {
			version: "0.21.1",
			message: "Vulnerable to SSRF. Upgrade to 0.21.1+",
		},
		moment: {
			version: "2.29.4",
			message: "Vulnerable to ReDoS. Upgrade to 2.29.4+ or use date-fns",
		},
		shelljs: {
			version: "0.8.5",
			message: "Vulnerable to Command Injection. Upgrade to 0.8.5+",
		},
		qs: {
			version: "6.7.3",
			message: "Vulnerable to Prototype Pollution. Upgrade to 6.7.3+",
		},
		trim: {
			version: "0.0.3",
			message: "Vulnerable to ReDoS. Upgrade to 0.0.3+",
		},
		"node-fetch": {
			version: "2.6.7",
			message: "Vulnerable to Information Exposure. Upgrade to 2.6.7+",
		},
	};

	run(_context: AnalysisContext): Issue[] {
		const issues: Issue[] = [];
		const pkgPath = path.join(process.cwd(), "package.json");

		if (fs.existsSync(pkgPath)) {
			try {
				const content = fs.readFileSync(pkgPath, "utf-8");
				const pkg = JSON.parse(content);
				const deps = { ...pkg.dependencies, ...pkg.devDependencies };

				for (const [name, version] of Object.entries(deps)) {
					const v = this.db[name];
					if (v && this.isVulnerable(String(version), v.version)) {
						issues.push({
							type: "dependency-vulnerability",
							severity: "error",
							file: "package.json",
							message: `${name}@${version}: ${v.message}`,
							suggestion: `Run 'npm install ${name}@latest' to fix.`,
						});
					}
				}
			} catch (_err) {}
		}

		return issues;
	}

	private isVulnerable(current: string, fixed: string): boolean {
		const clean = (v: string) =>
			v
				.replace(/[^0-9.]/g, "")
				.split(".")
				.map(Number);
		const currParts = clean(current);
		const fixedParts = clean(fixed);

		for (let i = 0; i < Math.max(currParts.length, fixedParts.length); i++) {
			const c = currParts[i] || 0;
			const f = fixedParts[i] || 0;
			if (c < f) return true;
			if (c > f) return false;
		}
		return false;
	}
}

export function runRules(
	context: AnalysisContext,
	opts: { strict?: boolean } = {},
	externalRules: Rule[] = [],
): Issue[] {
	const rules: Rule[] = [
		new ArchitectureRule(),
		new ComplexityRule(opts.strict ? 15 : 20),
		new CriticalNodeRule(),
		new DeadExportRule(),
		new DuplicationRule(),
		new FastLinterRule(),
		new GodFileRule(),
		new SCARule(),
		new VulnerabilityRule(),
		...externalRules,
	];

	let issues: Issue[] = [];
	for (const rule of rules) {
		try {
			issues = issues.concat(rule.run(context));
		} catch (_err) {}
	}

	return issues;
}
