import { describe, expect, it } from "vitest";
import { parseLinterJson } from "./fastLinter";

describe("fast linter parsing", () => {
	it("should extract oxlint json even if stdout contains a text preamble", () => {
		const output = [
			"No files found to lint. Please check your paths and ignore patterns.",
			'{ "diagnostics": [{"message":"A","code":"eslint(no-unused-vars)","severity":"warning","filename":"src/a.ts","labels":[{"span":{"line":3,"column":1}}]}],"number_of_files":1 }',
		].join("\n");

		const parsed = parseLinterJson<{ diagnostics: Array<{ code: string }> }>(
			output,
		);

		expect(parsed?.diagnostics).toHaveLength(1);
		expect(parsed?.diagnostics[0].code).toBe("eslint(no-unused-vars)");
	});

	it("should parse plain json output", () => {
		const parsed = parseLinterJson<{ diagnostics: unknown[] }>(
			'{ "diagnostics": [], "number_of_files": 0 }',
		);

		expect(parsed?.diagnostics).toEqual([]);
	});
});
