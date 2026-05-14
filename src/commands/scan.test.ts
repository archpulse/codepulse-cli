import { describe, expect, it } from "vitest";
import { normalizeScanArgs } from "./scan";

describe("scan argv normalization", () => {
	it("should normalize compact debug flags for scan", () => {
		const argv = [
			"node",
			"codepulse",
			"scan",
			".",
			"-ldiw",
			"--json",
		];

		expect(normalizeScanArgs(argv)).toEqual([
			"node",
			"codepulse",
			"scan",
			".",
			"--ld",
			"--ignore-warnings",
			"--json",
		]);
	});

	it("should normalize program debug ignore-warnings shorthand", () => {
		const argv = ["node", "codepulse", "scan", ".", "-diw"];

		expect(normalizeScanArgs(argv)).toEqual([
			"node",
			"codepulse",
			"scan",
			".",
			"--debug",
			"--ignore-warnings",
		]);
	});

	it("should leave unrelated commands untouched", () => {
		const argv = ["node", "codepulse", "stats", ".", "-d"];

		expect(normalizeScanArgs(argv)).toEqual(argv);
	});
});
