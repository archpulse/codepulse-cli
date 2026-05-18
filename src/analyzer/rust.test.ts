import { describe, expect, it } from "vitest";
import { analyzeRustFile } from "./rust";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

describe("Rust Analyzer", () => {
	it("should extract imports and functions from Rust code", () => {
		const content = `
use std::collections::HashMap;
use crate::utils::{self, helper};

pub fn public_fn(x: i32) -> i32 {
    if x > 0 {
        x + 1
    } else {
        0
    }
}

fn private_fn() {
    for i in 0..10 {
        println!("{}", i);
    }
}

pub struct MyStruct {
    pub field: String,
}

pub enum MyEnum {
    Variant,
}
`;
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "codepulse-rust-test-"));
		const filePath = path.join(tmpDir, "main.rs");
		fs.writeFileSync(filePath, content);

		try {
			const result = analyzeRustFile(filePath, tmpDir);
			expect(result).not.toBeNull();
			if (result) {
				expect(result.imports).toContain("std::collections::HashMap");
				expect(result.imports).toContain("crate::utils::{self, helper}");
				expect(result.exports).toContain("public_fn");
				expect(result.exports).toContain("MyStruct");
				expect(result.exports).toContain("MyEnum");
				expect(result.exports).not.toContain("private_fn");

				const pubFn = result.functions.find(f => f.name === "public_fn");
				expect(pubFn).toBeDefined();
				expect(pubFn?.complexity).toBe(2); // 1 + 1 for 'if'

				const privFn = result.functions.find(f => f.name === "private_fn");
				expect(privFn).toBeDefined();
				expect(privFn?.complexity).toBe(2); // 1 + 1 for 'for'
			}
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("should calculate complexity for match statements", () => {
		const content = `
fn complex_fn(x: Option<i32>) {
    match x {
        Some(v) if v > 10 => println!("big"),
        Some(_) => println!("small"),
        None => println!("none"),
    }
}
`;
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "codepulse-rust-complexity-"));
		const filePath = path.join(tmpDir, "lib.rs");
		fs.writeFileSync(filePath, content);

		try {
			const result = analyzeRustFile(filePath, tmpDir);
			if (result) {
				const fnNode = result.functions[0];
				// complexity: 1 (base) + 1 (match) + 3 (match arms =>) + 1 (if in arm) = 6
				// In our implementation: 1 + 1 (match) + 3 (=>) + 1 (if) = 6
				expect(fnNode.complexity).toBe(6);
			}
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});
});
