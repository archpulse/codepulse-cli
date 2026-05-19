import { createHash } from "node:crypto";
import * as t from "@babel/types";

/**
 * Normalizes an AST by replacing identifiers and literals with generic tokens.
 * This ensures that structurally identical functions produce the same fingerprint.
 */
export function generateFunctionFingerprint(node: t.Node): string {
	// Use a faster way to generate a structural hash without cloning and traversing the entire tree
	let hashString = "";
	
	t.traverseFast(node, (n) => {
		hashString += n.type;
		if (t.isIdentifier(n)) {
			// Don't use actual names to allow structural matching
			hashString += "id";
		} else if (t.isLiteral(n)) {
			hashString += "lit";
		}
	});

	return createHash("md5").update(hashString).digest("hex");
}
