import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import {
	MAX_ANALYSIS_FILE_SIZE_BYTES,
	countLines,
	readFileForAnalysis,
	scanFiles,
} from "./scanner";
import { detectDeadExports } from "./graph";

describe("Scanner Utils", () => {
	it("should count lines correctly", () => {
		expect(countLines("one\ntwo\nthree")).toBe(3);
		expect(countLines("")).toBe(1);
	});

	it("should skip mandatory blacklisted directories during scan", () => {
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "codepulse-scan-"));
		try {
			fs.mkdirSync(path.join(tmpDir, "node_modules", "pkg"), {
				recursive: true,
			});
			fs.mkdirSync(path.join(tmpDir, ".git"), { recursive: true });
			fs.mkdirSync(path.join(tmpDir, "dist"), { recursive: true });
			fs.mkdirSync(path.join(tmpDir, "build"), { recursive: true });
			fs.mkdirSync(path.join(tmpDir, ".venv"), { recursive: true });
			fs.writeFileSync(path.join(tmpDir, "src.ts"), "export const ok = 1;\n");
			fs.writeFileSync(
				path.join(tmpDir, "node_modules", "pkg", "ignored.ts"),
				"export const bad = 1;\n",
			);

			const files = scanFiles({
				dir: tmpDir,
				exclude: [],
				extensions: [".ts"],
			});

			expect(files).toEqual([path.join(tmpDir, "src.ts")]);
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("should skip files larger than the configured analysis limit", async () => {
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "codepulse-size-"));
		try {
			const bigFile = path.join(tmpDir, "big.ts");
			fs.writeFileSync(
				bigFile,
				"a".repeat(MAX_ANALYSIS_FILE_SIZE_BYTES + 1),
				"utf8",
			);

			const result = await readFileForAnalysis(bigFile);

			expect(result.skipped).toBe(true);
			expect(result.skipReason).toBe("too-large");
			expect(result.content).toBeNull();
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("should skip minified files with long average lines", async () => {
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "codepulse-mini-"));
		try {
			const minifiedFile = path.join(tmpDir, "bundle.js");
			const longLine = "x".repeat(600);
			fs.writeFileSync(
				minifiedFile,
				Array.from({ length: 20 }, () => longLine).join("\n"),
				"utf8",
			);

			const result = await readFileForAnalysis(minifiedFile);

			expect(result.skipped).toBe(true);
			expect(result.skipReason).toBe("minified");
			expect(result.averageLineLength).toBeGreaterThan(500);
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("should stream-read normal files and preserve content", async () => {
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "codepulse-stream-"));
		try {
			const filePath = path.join(tmpDir, "normal.ts");
			fs.writeFileSync(filePath, "first line\nsecond line\nthird line\n", "utf8");

			const result = await readFileForAnalysis(filePath);

			expect(result.skipped).toBe(false);
			expect(result.content).toContain("second line");
			expect(result.lineCount).toBe(3);
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("should not treat Python exports as JS-style dead exports", () => {
		const files = [
			{
				path: "/tmp/project/pkg/module.py",
				relativePath: "pkg/module.py",
				content: "",
				imports: [],
				exports: ["Foo", "Bar"],
				functions: [],
				lines: 10,
				complexity: 1,
				isGodFile: false,
			},
		];

		const deadExports = detectDeadExports(files, []);
		expect(deadExports).toEqual([]);
	});
});
