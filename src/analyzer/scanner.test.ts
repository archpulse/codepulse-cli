import { describe, expect, it } from "vitest";
import { countLines } from "./scanner";

describe("Scanner Utils", () => {
	it("should count lines correctly", () => {
		expect(countLines("one\ntwo\nthree")).toBe(3);
		expect(countLines("")).toBe(1);
	});
});
