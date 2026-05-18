import { describe, expect, it } from "vitest";
import { analyzeGenericFile } from "./generic";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

describe("Generic Analyzer (Lua)", () => {
	it("should analyze Lua files correctly", () => {
		const content = `
local function my_local_fn(x)
    if x > 0 then
        return true
    elseif x == 0 then
        return nil
    else
        return false
    end
end

function global_fn()
    for i=1,10 do
        print(i)
    end
end
`;
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "codepulse-lua-test-"));
		const filePath = path.join(tmpDir, "test.lua");
		fs.writeFileSync(filePath, content);

		try {
			const result = analyzeGenericFile(filePath, tmpDir);
			expect(result).not.toBeNull();
			if (result) {
				expect(result.functions.length).toBe(2);
				expect(result.functions.map(f => f.name)).toContain("my_local_fn");
				expect(result.functions.map(f => f.name)).toContain("global_fn");
				
				// current generic analyzer for lua:
				// complexityKeywords: /\b(if|elseif|for|while|repeat|and|or)\b/g
				// file complexity = 1 + matches
				// in content: if, elseif, for -> 3 matches
				// file complexity = 4
				expect(result.complexity).toBe(4);
			}
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("should analyze Go files correctly", () => {
		const content = `
package main
import (
    "fmt"
    "os"
)
import "math"

func PublicFn(x int) bool {
    if x > 0 && true {
        return true
    }
    return false
}

func (r *Receiver) privateFn() {
    for i := 0; i < 10; i++ {
        go fmt.Println(i)
    }
}

type MyType struct {}
`;
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "codepulse-go-test-"));
		const filePath = path.join(tmpDir, "main.go");
		fs.writeFileSync(filePath, content);

		try {
			const result = analyzeGenericFile(filePath, tmpDir);
			expect(result).not.toBeNull();
			if (result) {
				expect(result.functions.length).toBe(2);
				expect(result.functions.map(f => f.name)).toContain("PublicFn");
				expect(result.functions.map(f => f.name)).toContain("privateFn");
				expect(result.exports).toContain("PublicFn");
				expect(result.exports).toContain("MyType");
				
				// complexity: 1 base + 1 (if) + 1 (&&) + 1 (for) + 1 (go) = 5
				expect(result.complexity).toBe(5);
			}
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});
});
