import { createHash } from "node:crypto";
import traverse from "@babel/traverse";
import * as t from "@babel/types";

/**
 * Normalizes an AST by replacing identifiers and literals with generic tokens.
 * This ensures that structurally identical functions produce the same fingerprint.
 */
export function generateFunctionFingerprint(node: t.Node): string {
	const normalized = t.cloneNode(node);

	const identifierMap = new Map<string, string>();
	let idCounter = 0;

	traverse(normalized, {
		noScope: true,
		enter(path) {
			const { node } = path;

			// Replace identifiers with generic tokens (var0, var1, etc.)
			if (t.isIdentifier(node)) {
				if (!identifierMap.has(node.name)) {
					identifierMap.set(node.name, `id${idCounter++}`);
				}
				node.name = identifierMap.get(node.name)!;
			}

			// Normalize literals (replace values with generic placeholders)
			if (t.isStringLiteral(node)) {
				node.value = "__string__";
			} else if (t.isNumericLiteral(node)) {
				node.value = 0;
			} else if (t.isBooleanLiteral(node)) {
				node.value = true;
			} else if (t.isTemplateLiteral(node)) {
				for (const q of node.quasis) {
					q.value.raw = "__tpl__";
				}
			}
		},
	});

	// Generate a stable string representation of the normalized AST
	const json = JSON.stringify(normalized, (key, value) => {
		// Filter out metadata that varies between files but doesn't change semantics
		if (
			["loc", "start", "end", "range", "tokens", "comments", "extra"].includes(
				key,
			)
		) {
			return undefined;
		}
		return value;
	});

	return createHash("md5").update(json).digest("hex");
}
