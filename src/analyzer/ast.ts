import * as path from "node:path";
import * as parser from "@babel/parser";
import traverse, { type NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import type { FileNode, FunctionNode } from "../types/analysis";
import { generateFunctionFingerprint } from "./ast-fingerprint";
import { analyzeGenericFile } from "./generic";
import { analyzePythonFile } from "./python";
import { analyzeRustFile } from "./rust";
import { createFileNode, initializeFileAnalysis } from "./utils";

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
			"FunctionDeclaration|FunctionExpression|ArrowFunctionExpression"(p: any) {
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
			errorRecovery: true,
		});
	} catch {
		return null;
	}
}

function handleRequire(p: NodePath<t.CallExpression>, imports: string[]) {
	const { node } = p;
	if (
		t.isIdentifier(node.callee, { name: "require" }) &&
		node.arguments.length === 1
	) {
		const arg = node.arguments[0];
		if (t.isStringLiteral(arg)) imports.push(arg.value);
	}
}

function handleNamedExportDeclaration(declaration: any, exports: string[]) {
	if (t.isFunctionDeclaration(declaration) && declaration.id) {
		exports.push(declaration.id.name);
	} else if (t.isVariableDeclaration(declaration)) {
		declaration.declarations.forEach((decl: any) => {
			if (t.isIdentifier(decl.id)) exports.push(decl.id.name);
		});
	} else if (t.isClassDeclaration(declaration) && declaration.id) {
		exports.push(declaration.id.name);
	}
}

function handleNamedExportSpecifiers(specifiers: any[], exports: string[]) {
	specifiers.forEach((spec: any) => {
		if (t.isExportSpecifier(spec)) {
			exports.push(
				t.isIdentifier(spec.exported)
					? spec.exported.name
					: (spec.exported as any).value,
			);
		}
	});
}

function handleNamedExport(
	p: NodePath<t.ExportNamedDeclaration>,
	exports: string[],
	imports: string[],
) {
	const { node } = p;
	if (node.source) {
		imports.push(node.source.value);
	}
	if (node.declaration) {
		handleNamedExportDeclaration(node.declaration, exports);
	}
	if (node.specifiers) {
		handleNamedExportSpecifiers(node.specifiers, exports);
	}
}

function handleDefaultExport(
	p: NodePath<t.ExportDefaultDeclaration>,
	exports: string[],
) {
	const { node } = p;
	if (t.isFunctionDeclaration(node.declaration) && node.declaration.id) {
		exports.push(node.declaration.id.name);
	} else {
		exports.push("default");
	}
}

function handleModuleExport(
	p: NodePath<t.AssignmentExpression>,
	exports: string[],
) {
	const { node } = p;
	if (
		t.isMemberExpression(node.left) &&
		t.isIdentifier(node.left.object, { name: "module" }) &&
		t.isIdentifier(node.left.property, { name: "exports" })
	) {
		exports.push("module.exports");
	}
}

function resolveFunctionName(node: t.Node, parent: t.Node): string {
	if (t.isFunctionDeclaration(node) && node.id) {
		return node.id.name;
	}
	if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
		return parent.id.name;
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
	p: NodePath<any>,
	functions: FunctionNode[],
	exports: string[],
) {
	const { node, parent } = p;
	const name = resolveFunctionName(node, parent);

	const startLine = node.loc?.start.line ?? 0;
	const endLine = node.loc?.end.line ?? 0;
	const complexity = calculateComplexity(node);
	const isExported = exports.some((e) => e === name);

	let fingerprint: string | undefined;
	try {
		fingerprint = generateFunctionFingerprint(node);
	} catch {
		// Fallback for complex trees
	}

	functions.push({
		name,
		startLine,
		endLine,
		complexity,
		isExported,
		fingerprint,
	});
}

function calculateComplexity(node: t.Node): number {
	let complexity = 1;
	// Use a simple walker instead of full traverse for performance
	t.traverseFast(node, (n) => {
		if (isComplexityNode(n)) complexity++;
	});
	return complexity;
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
