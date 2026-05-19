import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { detectProjectTools } from "./install-deps";

describe("install deps tool detection", () => {
	it("should detect only linters needed by the current project tree", () => {
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "codepulse-tools-"));
		try {
			fs.writeFileSync(path.join(tmpDir, "app.ts"), "export const x = 1;\n");
			fs.writeFileSync(path.join(tmpDir, "server.py"), "print('hi')\n");
			fs.writeFileSync(path.join(tmpDir, "main.go"), "package main\n");
			fs.writeFileSync(path.join(tmpDir, "script.sh"), "#!/bin/sh\necho hi\n");
			fs.writeFileSync(path.join(tmpDir, "module.cpp"), "int main() {}\n");
			fs.writeFileSync(path.join(tmpDir, "script.lua"), "print('hi')\n");
			fs.mkdirSync(path.join(tmpDir, "node_modules"), { recursive: true });
			fs.writeFileSync(
				path.join(tmpDir, "node_modules", "ignored.js"),
				"const x = 1;\n",
			);

			const tools = detectProjectTools(tmpDir).map((tool) => tool.key).sort();

			expect(tools).toEqual([
				"cppcheck",
				"golangci-lint",
				"luacheck",
				"oxlint",
				"revive",
				"ruff",
				"selene",
				"shellcheck",
			]);
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});
});
