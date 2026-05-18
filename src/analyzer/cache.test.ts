import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { loadAnalysisCache, pruneAnalysisCache, saveAnalysisCache } from "./cache";
import type { AnalysisCache, FileNode } from "../types/analysis";

function makeFileNode(overrides: Partial<FileNode> = {}): FileNode {
	return {
		path: "/tmp/project/src/app.ts",
		relativePath: "src/app.ts",
		content: "export const x = 1;",
		imports: ["./dep"],
		exports: ["x"],
		functions: [],
		lines: 1,
		complexity: 1,
		isGodFile: false,
		mtime: 123,
		size: 19,
		...overrides,
	};
}

describe("analysis cache", () => {
	it("should persist and restore cached file nodes", async () => {
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "codepulse-cache-"));
		try {
			const cache: AnalysisCache = {
				fileNodes: new Map([[makeFileNode().path, makeFileNode()]]),
				gitChurn: new Map([["src/app.ts", 4]]),
				lastScanTime: 123456,
			};

			await saveAnalysisCache(tmpDir, cache);
			const loaded = await loadAnalysisCache(tmpDir);

			expect(loaded.fileNodes.size).toBe(1);
			const restored = loaded.fileNodes.get("/tmp/project/src/app.ts");
			expect(restored).toMatchObject({
				relativePath: "src/app.ts",
				imports: ["./dep"],
				exports: ["x"],
				lines: 1,
				complexity: 1,
				isGodFile: false,
				mtime: 123,
				size: 19,
				content: "",
			});
			expect(loaded.gitChurn?.get("src/app.ts")).toBe(4);
			expect(loaded.lastScanTime).toBe(123456);
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("should prune stale file nodes before saving", () => {
		const cache: AnalysisCache = {
			fileNodes: new Map([
				["/tmp/project/src/keep.ts", makeFileNode({ path: "/tmp/project/src/keep.ts" })],
				["/tmp/project/src/remove.ts", makeFileNode({ path: "/tmp/project/src/remove.ts" })],
			]),
		};

		pruneAnalysisCache(cache, ["/tmp/project/src/keep.ts"]);

		expect(Array.from(cache.fileNodes.keys())).toEqual([
			"/tmp/project/src/keep.ts",
		]);
	});
});
