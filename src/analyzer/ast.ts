import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import * as path from 'path';
import { FileNode, FunctionNode } from '../types';
import { readFile, countLines } from './scanner';
import { analyzePythonFile } from './python';
import { analyzeGenericFile } from './generic';

const GOD_FILE_LINES = 500;
const GOD_FILE_IMPORTS = 15;

const JS_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const PYTHON_EXTENSIONS = new Set(['.py']);
const GENERIC_EXTENSIONS = new Set(['.java', '.cpp', '.c', '.cs', '.lua', '.css', '.scss', '.html']);

export function analyzeFile(filePath: string, baseDir: string): FileNode | null {
  const ext = path.extname(filePath).toLowerCase();

  if (PYTHON_EXTENSIONS.has(ext)) return analyzePythonFile(filePath, baseDir);
  if (GENERIC_EXTENSIONS.has(ext)) return analyzeGenericFile(filePath, baseDir);
  if (!JS_EXTENSIONS.has(ext)) return null;

  const content = readFile(filePath);
  if (!content) return null;

  const relativePath = path.relative(baseDir, filePath);
  const lines = countLines(content);
  const imports: string[] = [];
  const exports: string[] = [];
  const functions: FunctionNode[] = [];

  let ast: t.File;
  try {
    ast = parser.parse(content, {
      sourceType: 'unambiguous',
      plugins: [
        'typescript',
        'jsx',
        'decorators-legacy',
        'classProperties',
        'optionalChaining',
        'nullishCoalescingOperator',
        'dynamicImport',
      ],
      errorRecovery: true,
    });
  } catch {
    return null;
  }

  try {
    traverse(ast, {
      ImportDeclaration(nodePath) {
        imports.push(nodePath.node.source.value);
      },

      CallExpression(nodePath) {
        const { node } = nodePath;
        if (
          t.isIdentifier(node.callee, { name: 'require' }) &&
          node.arguments.length === 1 &&
          t.isStringLiteral(node.arguments[0])
        ) {
          imports.push(node.arguments[0].value);
        }
      },

      ExportNamedDeclaration(nodePath) {
        const { node } = nodePath;
        if (node.declaration) {
          if (t.isFunctionDeclaration(node.declaration) && node.declaration.id) {
            exports.push(node.declaration.id.name);
          } else if (t.isVariableDeclaration(node.declaration)) {
            node.declaration.declarations.forEach((decl: any) => {
              if (t.isIdentifier(decl.id)) exports.push(decl.id.name);
            });
          } else if (t.isClassDeclaration(node.declaration) && node.declaration.id) {
            exports.push(node.declaration.id.name);
          }
        }
        if (node.specifiers) {
          node.specifiers.forEach((spec: any) => {
            if (t.isExportSpecifier(spec)) {
              exports.push(t.isIdentifier(spec.exported) ? spec.exported.name : spec.exported.value);
            }
          });
        }
      },

      ExportDefaultDeclaration(nodePath) {
        const { node } = nodePath;
        if (t.isFunctionDeclaration(node.declaration) && node.declaration.id) {
          exports.push(node.declaration.id.name);
        } else {
          exports.push('default');
        }
      },

      AssignmentExpression(nodePath) {
        const { node } = nodePath;
        if (
          t.isMemberExpression(node.left) &&
          t.isIdentifier(node.left.object, { name: 'module' }) &&
          t.isIdentifier(node.left.property, { name: 'exports' })
        ) {
          exports.push('module.exports');
        }
      },

      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression'(nodePath: any) {
        const { node } = nodePath;
        let name = 'anonymous';
        const parent = nodePath.parent;

        if (t.isFunctionDeclaration(node) && node.id) {
          name = node.id.name;
        } else if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
          name = parent.id.name;
        } else if (t.isObjectProperty(parent) && t.isIdentifier(parent.key)) {
          name = parent.key.name;
        } else if (t.isClassMethod(parent) && t.isIdentifier(parent.key)) {
          name = parent.key.name;
        }

        const startLine = node.loc?.start.line ?? 0;
        const endLine = node.loc?.end.line ?? 0;
        const complexity = calculateComplexity(node);
        const isExported = exports.some(e => e === name);

        functions.push({ name, startLine, endLine, complexity, isExported });
      },
    });
  } catch {
    // traverse error - return partial result
  }

  const fileComplexity = functions.reduce((sum, fn) => sum + fn.complexity, 1);
  const isGodFile = lines >= GOD_FILE_LINES || imports.length >= GOD_FILE_IMPORTS;

  return {
    path: filePath,
    relativePath,
    lines,
    imports,
    exports,
    functions,
    complexity: fileComplexity,
    isGodFile,
  };
}

function calculateComplexity(node: t.Node): number {
  let complexity = 1;

  function visit(n: t.Node): void {
    if (!n || typeof n !== 'object') return;

    if (
      t.isIfStatement(n) ||
      t.isConditionalExpression(n) ||
      t.isLogicalExpression(n) ||
      t.isWhileStatement(n) ||
      t.isDoWhileStatement(n) ||
      t.isForStatement(n) ||
      t.isForInStatement(n) ||
      t.isForOfStatement(n) ||
      t.isCatchClause(n)
    ) {
      complexity++;
    }

    if (t.isSwitchCase(n) && n.test !== null) complexity++;

    for (const key of Object.keys(n) as (keyof typeof n)[]) {
      const child = (n as unknown as Record<string, unknown>)[key as string];
      if (Array.isArray(child)) {
        child.forEach(c => { if (c && typeof c === 'object' && 'type' in c) visit(c as t.Node); });
      } else if (child && typeof child === 'object' && 'type' in (child as object)) {
        visit(child as t.Node);
      }
    }
  }

  visit(node);
  return complexity;
}
