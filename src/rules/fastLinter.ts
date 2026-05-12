import { execSync } from "node:child_process";
import type { AnalysisContext, Issue, Rule } from "../types/index";

export class FastLinterRule implements Rule {
	name = "fast-linter";
	description =
		"Runs ultra-fast external linters for multiple languages (Ruff, Biome, Cppcheck, Luacheck, ShellCheck, GolangCI)";

	run(context: AnalysisContext): Issue[] {
		const issues: Issue[] = [];
		const rootDir = context.config.rootDir || process.cwd();

		if (this.isCommandAvailable("ruff")) this.runRuff(rootDir, issues);
		if (this.isCommandAvailable("biome")) this.runBiome(rootDir, issues);
		if (this.isCommandAvailable("shellcheck"))
			this.runShellCheck(rootDir, context, issues);
		if (this.isCommandAvailable("cppcheck")) this.runCppcheck(rootDir, issues);
		if (this.isCommandAvailable("golangci-lint"))
			this.runGoLint(rootDir, issues);
		if (this.isCommandAvailable("luacheck")) this.runLuacheck(rootDir, issues);

		return issues;
	}

	private isCommandAvailable(cmd: string): boolean {
		try {
			execSync(`${cmd} --version`, { stdio: "ignore" });
			return true;
		} catch {
			return false;
		}
	}

	private runRuff(rootDir: string, issues: Issue[]) {
		let output = "";
		try {
			output = execSync(`ruff check . --format json --quiet`, {
				cwd: rootDir,
				encoding: "utf-8",
				stdio: ["ignore", "pipe", "ignore"],
			});
		} catch (e: any) {
			output = e.stdout || "";
		}
		if (output) {
			try {
				const data = JSON.parse(output);
				for (const ri of data) {
					issues.push({
						type: "linter",
						file: ri.filename,
						line: ri.location.row,
						message: `[Ruff] ${ri.code}: ${ri.message}`,
						severity: "warning",
						suggestion: ri.fix
							? 'Run "ruff check --fix" to fix this issue.'
							: undefined,
					});
				}
			} catch (_err) {}
		}
	}

	private runBiome(rootDir: string, issues: Issue[]) {
		let output = "";
		try {
			output = execSync(
				`biome check . --reporter json --diagnostic-level=warn`,
				{
					cwd: rootDir,
					encoding: "utf-8",
					stdio: ["ignore", "pipe", "ignore"],
				},
			);
		} catch (e: any) {
			output = e.stdout || "";
		}
		if (output) {
			try {
				const data = JSON.parse(output);
				if (data.diagnostics) {
					for (const d of data.diagnostics) {
						// Skip generic formatting messages that don't provide value in the list
						if (
							d.message.includes(
								"Formatter would have printed the following content",
							)
						) {
							continue;
						}

						let message = d.message;
						// If message is too generic, try to append description or better context
						if (d.description && d.description.length > message.length) {
							message = d.description;
						}

						issues.push({
							type: "linter",
							file: d.location?.path?.file || "unknown",
							line: d.location?.span?.[0] || 0,
							message: `[Biome] ${d.category}: ${message}`,
							severity: d.severity === "error" ? "error" : "warning",
						});
					}
				}
			} catch (_err) {}
		}
	}

	private runShellCheck(
		rootDir: string,
		context: AnalysisContext,
		issues: Issue[],
	) {
		const shFiles = context.files
			.filter((f) => f.relativePath.endsWith(".sh"))
			.map((f) => `"${f.relativePath}"`);

		if (shFiles.length > 0) {
			let output = "";
			try {
				output = execSync(`shellcheck -f json ${shFiles.join(" ")}`, {
					cwd: rootDir,
					encoding: "utf-8",
					stdio: ["ignore", "pipe", "ignore"],
				});
			} catch (e: any) {
				output = e.stdout || "";
			}
			if (output) {
				try {
					const data = JSON.parse(output);
					for (const si of data) {
						issues.push({
							type: "linter",
							file: si.file,
							line: si.line,
							message: `[ShellCheck] SC${si.code}: ${si.message}`,
							severity: si.level === "error" ? "error" : "warning",
						});
					}
				} catch (_err) {}
			}
		}
	}

	private runCppcheck(rootDir: string, issues: Issue[]) {
		let output = "";
		try {
			const template =
				'{"file":"{file}","line":{line},"severity":"{severity}","message":"{message}","id":"{id}"}';
			output = execSync(
				`cppcheck --template='${template}' --enable=warning --quiet .`,
				{
					cwd: rootDir,
					encoding: "utf-8",
					stdio: ["ignore", "pipe", "pipe"],
				},
			);
		} catch (e: any) {
			output = e.stderr || e.stdout || "";
		}
		if (output) {
			try {
				const lines = output
					.split("\n")
					.filter((l: string) => l.trim().startsWith("{"));
				for (const line of lines) {
					const ci = JSON.parse(line);
					issues.push({
						type: "linter",
						file: ci.file,
						line: ci.line,
						message: `[Cppcheck] ${ci.id}: ${ci.message}`,
						severity: ci.severity === "error" ? "error" : "warning",
					});
				}
			} catch (_err) {}
		}
	}

	private runGoLint(rootDir: string, issues: Issue[]) {
		let output = "";
		try {
			output = execSync(`golangci-lint run --out-format json`, {
				cwd: rootDir,
				encoding: "utf-8",
				stdio: ["ignore", "pipe", "ignore"],
			});
		} catch (e: any) {
			output = e.stdout || "";
		}
		if (output) {
			try {
				const data = JSON.parse(output);
				if (data.Issues) {
					for (const gi of data.Issues) {
						issues.push({
							type: "linter",
							file: gi.Pos.Filename,
							line: gi.Pos.Line,
							message: `[GoLint] ${gi.FromLinter}: ${gi.Text}`,
							severity: "warning",
						});
					}
				}
			} catch (_err) {}
		}
	}

	private runLuacheck(rootDir: string, issues: Issue[]) {
		let output = "";
		try {
			output = execSync(`luacheck . --formatter json`, {
				cwd: rootDir,
				encoding: "utf-8",
				stdio: ["ignore", "pipe", "ignore"],
			});
		} catch (e: any) {
			output = e.stdout || "";
		}
		if (output) {
			try {
				const data = JSON.parse(output);
				if (Array.isArray(data)) {
					for (const fileResult of data) {
						for (const ev of fileResult.events) {
							issues.push({
								type: "linter",
								file: fileResult.file,
								line: ev.line,
								message: `[Luacheck] ${ev.code}: ${ev.message}`,
								severity: ev.type === "error" ? "error" : "warning",
							});
						}
					}
				}
			} catch (_err) {
				// Ignore
			}
		}
	}
}
