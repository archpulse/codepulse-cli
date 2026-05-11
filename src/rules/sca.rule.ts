import * as fs from "node:fs";
import * as path from "node:path";
import type { AnalysisContext, Issue } from "../types/index";
import type { Rule } from "./rule";

export class SCARule implements Rule {
	name = "software-composition-analysis";

	// Local-first vulnerability database (subset of common issues)
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
			} catch (_err) {
				// Log error silently
			}
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
