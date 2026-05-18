import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import type { AnalysisContext, Issue } from "../types/analysis";

const SECURITY_MAX_CONCURRENCY = Math.max(
	2,
	Math.min(8, os.availableParallelism?.() ?? os.cpus().length ?? 4),
);

const REGEX_PATTERNS = [
	{
		regex: /password\s*=\s*['"][^'"]+['"]/i,
		message: "Hardcoded password detected.",
		suggestion: "Use environment variables or secure secret management.",
	},
	{
		regex: /secret\s*=\s*['"][^'"]+['"]/i,
		message: "Hardcoded secret detected.",
		suggestion: "Use environment variables or secure secret management.",
	},
	{
		regex: /(api_key|apiKey)\s*=\s*['"][a-zA-Z0-9_-]+['"]/i,
		message: "Hardcoded API key detected.",
		suggestion: "Move API keys to environment variables (.env).",
	},
];

const SCA_DB: Record<string, { version: string; message: string }> = {
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

export async function runSecurityChecks(
	context: AnalysisContext,
): Promise<Issue[]> {
	const rootDir = context.config.rootDir || process.cwd();
	const [scaIssues, vulnerabilityIssues] = await Promise.all([
		runSCAChecks(rootDir),
		runVulnerabilityChecks(context),
	]);

	return [...scaIssues, ...vulnerabilityIssues].sort(compareIssues);
}

async function runSCAChecks(rootDir: string): Promise<Issue[]> {
	const issues: Issue[] = [];
	
	// Node.js SCA
	const pkgPath = path.join(rootDir, "package.json");
	if (fs.existsSync(pkgPath)) {
		try {
			const content = await fs.promises.readFile(pkgPath, "utf-8");
			const pkg = JSON.parse(content);
			const deps = { ...pkg.dependencies, ...pkg.devDependencies };

			for (const [name, version] of Object.entries(deps)) {
				const vuln = SCA_DB[name];
				if (vuln && isVulnerable(String(version), vuln.version)) {
					issues.push({
						type: "dependency-vulnerability",
						severity: "error",
						file: "package.json",
						message: `${name}@${version}: ${vuln.message}`,
						suggestion: `Run 'npm install ${name}@latest' to fix.`,
					});
				}
			}
		} catch {}
	}

	// Rust SCA (very basic example, could be expanded)
	const cargoPath = path.join(rootDir, "Cargo.lock");
	if (fs.existsSync(cargoPath)) {
		try {
			const content = await fs.promises.readFile(cargoPath, "utf-8");
			// Simplified check for some known vulnerable crates
			if (content.includes('name = "openssl"') && content.includes('version = "0.10.30"')) {
				issues.push({
					type: "dependency-vulnerability",
					severity: "error",
					file: "Cargo.lock",
					message: "openssl@0.10.30: Multiple vulnerabilities. Upgrade to 0.10.48+",
					suggestion: "Run 'cargo update openssl' to fix.",
				});
			}
		} catch {}
	}

	return issues;
}

async function runVulnerabilityChecks(
	context: AnalysisContext,
): Promise<Issue[]> {
	const issues: Issue[] = [];
	const files = context.files.filter((file) => !shouldSkipFile(file.relativePath));

	await runConcurrent(files, SECURITY_MAX_CONCURRENCY, async (file) => {
		try {
			const content = await fs.promises.readFile(file.path, "utf-8");

			if (/\.(ts|tsx|js|jsx)$/i.test(file.path)) {
				checkAST(content, file.relativePath, issues);
			}

			const isRust = /\.rs$/i.test(file.path);
			const lines = content.split(/\r?\n/);
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i].trim();
				if (
					line.startsWith("//") ||
					line.startsWith("*") ||
					line.startsWith("/*")
				) {
					continue;
				}

				if (isRust && /\bunsafe\s*\{/.test(line)) {
					issues.push({
						type: "vulnerability",
						severity: "warning",
						file: file.relativePath,
						line: i + 1,
						message: "Unsafe block detected.",
						suggestion: "Ensure this block is properly audited and necessary.",
					});
				}

				for (const pattern of REGEX_PATTERNS) {
					if (pattern.regex.test(line)) {
						issues.push({
							type: "vulnerability",
							severity: "error",
							file: file.relativePath,
							line: i + 1,
							message: pattern.message,
							suggestion: pattern.suggestion,
						});
					}
				}
			}
		} catch {
			// Ignore unreadable files and move on.
		}
	});

	return issues;
}

function shouldSkipFile(relativePath: string): boolean {
	return (
		relativePath.includes("rules/") ||
		relativePath.includes("explain.ts") ||
		relativePath.includes("reporter/")
	);
}

function compareIssues(a: Issue, b: Issue): number {
	const fileCompare = a.file.localeCompare(b.file);
	if (fileCompare !== 0) return fileCompare;

	const lineCompare = (a.line ?? 0) - (b.line ?? 0);
	if (lineCompare !== 0) return lineCompare;

	const typeCompare = a.type.localeCompare(b.type);
	if (typeCompare !== 0) return typeCompare;

	return a.message.localeCompare(b.message);
}

async function runConcurrent<T>(
	items: T[],
	limit: number,
	worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
	if (items.length === 0) return;

	let cursor = 0;
	const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (true) {
			const index = cursor++;
			if (index >= items.length) break;
			await worker(items[index], index);
		}
	});

	await Promise.all(workers);
}

function checkAST(content: string, relativePath: string, issues: Issue[]): void {
	try {
		const ast = parser.parse(content, {
			sourceType: "unambiguous",
			plugins: ["typescript", "jsx", "decorators-legacy"],
			errorRecovery: true,
		});

		traverse(ast, {
			CallExpression(path) {
				if (t.isIdentifier(path.node.callee, { name: "eval" })) {
					issues.push({
						type: "vulnerability",
						severity: "error",
						file: relativePath,
						line: path.node.loc?.start.line || 0,
						message: "Use of eval() detected (AST-confirmed).",
						suggestion:
							"Replace with JSON.parse() or other safer alternatives.",
					});
				}
			},
			TemplateLiteral(path) {
				const quasi = path.node.quasis.map((q) => q.value.raw).join("");
				if (
					/SELECT\s+.*?\s+FROM\s+.*?\s+WHERE\s+.*?\s*=/i.test(quasi) &&
					path.node.expressions.length > 0
				) {
					issues.push({
						type: "vulnerability",
						severity: "warning",
						file: relativePath,
						line: path.node.loc?.start.line || 0,
						message: "Possible SQL injection in template literal.",
						suggestion: "Use parameterized queries or a query builder.",
					});
				}
			},
		});
	} catch {
		// Ignore malformed ASTs.
	}
}

function isVulnerable(current: string, fixed: string): boolean {
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
