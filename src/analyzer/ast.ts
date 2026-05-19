import * as path from "node:path";
import * as parser from "@babel/parser";
import traverse, { type NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import type { FileNode, FunctionNode } from "../types/analysis";
import { analyzeGenericFile } from "./generic";
import { analyzePythonFile } from "./python";
import { analyzeRustFile } from "./rust";
import { createFileNode, initializeFileAnalysis } from "./utils";

import { generateFunctionFingerprint } from "./ast-fingerprint";

const JS_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const PYTHON_EXTENSIONS = new Set([".py"]);
const RUST_EXTENSIONS = new Set([".rs"]);
const GENERIC_EXTENSIONS = new Set([
	".java",
	".cpp",
	".c",
	".cs",
	".lua",
	".go",
	".css",
	".scss",
	".html",
]);

export function analyzeFile(
	filePath: string,
	baseDir: string,
	contentOverride?: string,
): FileNode | null {
	const ext = path.extname(filePath).toLowerCase();

	if (PYTHON_EXTENSIONS.has(ext))
		return analyzePythonFile(filePath, baseDir, contentOverride);
	if (RUST_EXTENSIONS.has(ext))
		return analyzeRustFile(filePath, baseDir, contentOverride);
	if (GENERIC_EXTENSIONS.has(ext))
		return analyzeGenericFile(filePath, baseDir, contentOverride);
	if (!JS_EXTENSIONS.has(ext)) return null;

	const init = initializeFileAnalysis(filePath, baseDir, contentOverride);
	if (!init) return null;

	const { content, relativePath, lines, imports, exports, functions } = init;

	const ast = parseContent(content);
	if (!ast) return null;

	try {
		traverse(ast, {
			ImportDeclaration(p) {
				imports.push(p.node.source.value);
			},
			CallExpression(p) {
				handleRequire(p, imports);
			},
			ExportNamedDeclaration(p) {
				handleNamedExport(p, exports, imports);
			},
			ExportAllDeclaration(p) {
				imports.push(p.node.source.value);
			},
			ExportDefaultDeclaration(p) {
				handleDefaultExport(p, exports);
			},
			AssignmentExpression(p) {
				handleModuleExport(p, exports);
			},
			ClassDeclaration(p) {
				handleClass(p, functions, exports);
			},
			"FunctionDeclaration|FunctionExpression|ArrowFunctionExpression"(p: NodePath<t.Node>) {
				handleFunction(p, functions, exports);
			},
		});
	} catch {
		// Ignore traversal errors
	}

	return createFileNode(
		filePath,
		relativePath,
		content,
		lines,
		imports,
		exports,
		functions,
	);
}

function handleClass(
	p: NodePath<t.ClassDeclaration>,
	functions: FunctionNode[],
	exports: string[],
) {
	const { node } = p;
	const name = node.id?.name ?? "anonymous_class";

	const startLine = node.loc?.start.line ?? 0;
	const endLine = node.loc?.end.line ?? 0;
	
	let complexity = 1;
	t.traverseFast(node, (n) => {
		if (isComplexityNode(n)) complexity++;
	});

	const isExported = exports.some((e) => e === name);

	functions.push({
		name,
		startLine,
		endLine,
		complexity,
		isExported,
		// classes don't need fingerprints for now as they are handled by methods usually
	});
}

function parseContent(content: string): t.File | null {
	try {
		return parser.parse(content, {
			sourceType: "unambiguous",
			plugins: [
				"typescript",
				"jsx",
				"decorators-legacy",
				"classProperties",
				"optionalChaining",
				"nullishCoalescingOperator",
				"dynamicImport",
			],
		});
	} catch {
		return null;
	}
}

function handleRequire(p: NodePath<t.CallExpression>, imports: string[]) {
	const { node } = p;
	if (
		t.isIdentifier(node.callee) &&
		node.callee.name === "require" &&
		node.arguments.length > 0 &&
		t.isStringLiteral(node.arguments[0])
	) {
		imports.push(node.arguments[0].value);
	}
}

function handleNamedExport(
	p: NodePath<t.ExportNamedDeclaration>,
	exports: string[],
	imports: string[],
) {
	const { node } = p;
	if (node.declaration) {
		if (t.isVariableDeclaration(node.declaration)) {
			for (const decl of node.declaration.declarations) {
				if (t.isIdentifier(decl.id)) exports.push(decl.id.name);
			}
		} else if (
			t.isFunctionDeclaration(node.declaration) ||
			t.isClassDeclaration(node.declaration)
		) {
			if (node.declaration.id) exports.push(node.declaration.id.name);
		}
	}
	if (node.source) {
		imports.push(node.source.value);
	}
	for (const spec of node.specifiers) {
		if (t.isExportSpecifier(spec) && t.isIdentifier(spec.exported)) {
			exports.push(spec.exported.name);
		}
	}
}

function handleDefaultExport(
	p: NodePath<t.ExportDefaultDeclaration>,
	exports: string[],
) {
	exports.push("default");
}

function handleModuleExport(
	p: NodePath<t.AssignmentExpression>,
	exports: string[],
) {
	const { left } = p.node;
	if (
		t.isMemberExpression(left) &&
		t.isIdentifier(left.object) &&
		left.object.name === "module" &&
		t.isIdentifier(left.property) &&
		left.property.name === "exports"
	) {
		exports.push("module.exports");
	}
}

function resolveFunctionName(node: t.Node, parent: t.Node | null): string {
	if (t.isFunctionDeclaration(node) && node.id) {
		return node.id.name;
	}
	if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
		return parent.id.name;
	}
	if (t.isAssignmentExpression(parent) && t.isIdentifier(parent.left)) {
		return parent.left.name;
	}
	if (t.isObjectProperty(parent) && t.isIdentifier(parent.key)) {
		return parent.key.name;
	}
	if (t.isClassMethod(parent) && t.isIdentifier(parent.key)) {
		return parent.key.name;
	}
	return "anonymous";
}

function handleFunction(
	p: NodePath<t.Node>,
	functions: FunctionNode[],
	exports: string[],
) {
	const { node, parent } = p;
	const name = resolveFunctionName(node, parent);

	const startLine = node.loc?.start.line ?? 0;
	const endLine = node.loc?.end.line ?? 0;
	
	let complexity = 1;
	
	t.traverseFast(node, (n) => {
		if (isComplexityNode(n)) complexity++;
	});

	const fingerprint = generateFunctionFingerprint(node);
	const isExported = exports.some((e) => e === name);

	functions.push({
		name,
		startLine,
		endLine,
		complexity,
		isExported,
		fingerprint,
	});
}

function isLoopNode(n: t.Node): boolean {
	return (
		t.isWhileStatement(n) ||
		t.isDoWhileStatement(n) ||
		t.isForStatement(n) ||
		t.isForInStatement(n) ||
		t.isForOfStatement(n)
	);
}

function isConditionNode(n: t.Node): boolean {
	return (
		t.isIfStatement(n) ||
		t.isConditionalExpression(n) ||
		t.isLogicalExpression(n) ||
		t.isCatchClause(n) ||
		(t.isSwitchCase(n) && n.test !== null)
	);
}

function isComplexityNode(n: t.Node): boolean {
	return isLoopNode(n) || isConditionNode(n);
}
