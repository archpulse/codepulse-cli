"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeFile = analyzeFile;
const parser = __importStar(require("@babel/parser"));
const traverse_1 = __importDefault(require("@babel/traverse"));
const t = __importStar(require("@babel/types"));
const path = __importStar(require("path"));
const scanner_1 = require("./scanner");
const python_1 = require("./python");
const generic_1 = require("./generic");
const GOD_FILE_LINES = 500;
const GOD_FILE_IMPORTS = 15;
const JS_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const PYTHON_EXTENSIONS = new Set(['.py']);
const GENERIC_EXTENSIONS = new Set(['.java', '.cpp', '.c', '.cs', '.lua', '.css', '.scss', '.html']);
function analyzeFile(filePath, baseDir) {
    const ext = path.extname(filePath).toLowerCase();
    if (PYTHON_EXTENSIONS.has(ext))
        return (0, python_1.analyzePythonFile)(filePath, baseDir);
    if (GENERIC_EXTENSIONS.has(ext))
        return (0, generic_1.analyzeGenericFile)(filePath, baseDir);
    if (!JS_EXTENSIONS.has(ext))
        return null;
    const content = (0, scanner_1.readFile)(filePath);
    if (!content)
        return null;
    const relativePath = path.relative(baseDir, filePath);
    const lines = (0, scanner_1.countLines)(content);
    const imports = [];
    const exports = [];
    const functions = [];
    let ast;
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
    }
    catch {
        return null;
    }
    try {
        (0, traverse_1.default)(ast, {
            ImportDeclaration(nodePath) {
                imports.push(nodePath.node.source.value);
            },
            CallExpression(nodePath) {
                const { node } = nodePath;
                if (t.isIdentifier(node.callee, { name: 'require' }) &&
                    node.arguments.length === 1 &&
                    t.isStringLiteral(node.arguments[0])) {
                    imports.push(node.arguments[0].value);
                }
            },
            ExportNamedDeclaration(nodePath) {
                const { node } = nodePath;
                if (node.declaration) {
                    if (t.isFunctionDeclaration(node.declaration) && node.declaration.id) {
                        exports.push(node.declaration.id.name);
                    }
                    else if (t.isVariableDeclaration(node.declaration)) {
                        node.declaration.declarations.forEach((decl) => {
                            if (t.isIdentifier(decl.id))
                                exports.push(decl.id.name);
                        });
                    }
                    else if (t.isClassDeclaration(node.declaration) && node.declaration.id) {
                        exports.push(node.declaration.id.name);
                    }
                }
                if (node.specifiers) {
                    node.specifiers.forEach((spec) => {
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
                }
                else {
                    exports.push('default');
                }
            },
            AssignmentExpression(nodePath) {
                const { node } = nodePath;
                if (t.isMemberExpression(node.left) &&
                    t.isIdentifier(node.left.object, { name: 'module' }) &&
                    t.isIdentifier(node.left.property, { name: 'exports' })) {
                    exports.push('module.exports');
                }
            },
            'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression'(nodePath) {
                const { node } = nodePath;
                let name = 'anonymous';
                const parent = nodePath.parent;
                if (t.isFunctionDeclaration(node) && node.id) {
                    name = node.id.name;
                }
                else if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
                    name = parent.id.name;
                }
                else if (t.isObjectProperty(parent) && t.isIdentifier(parent.key)) {
                    name = parent.key.name;
                }
                else if (t.isClassMethod(parent) && t.isIdentifier(parent.key)) {
                    name = parent.key.name;
                }
                const startLine = node.loc?.start.line ?? 0;
                const endLine = node.loc?.end.line ?? 0;
                const complexity = calculateComplexity(node);
                const isExported = exports.some(e => e === name);
                functions.push({ name, startLine, endLine, complexity, isExported });
            },
        });
    }
    catch {
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
function calculateComplexity(node) {
    let complexity = 1;
    function visit(n) {
        if (!n || typeof n !== 'object')
            return;
        if (t.isIfStatement(n) ||
            t.isConditionalExpression(n) ||
            t.isLogicalExpression(n) ||
            t.isWhileStatement(n) ||
            t.isDoWhileStatement(n) ||
            t.isForStatement(n) ||
            t.isForInStatement(n) ||
            t.isForOfStatement(n) ||
            t.isCatchClause(n)) {
            complexity++;
        }
        if (t.isSwitchCase(n) && n.test !== null)
            complexity++;
        for (const key of Object.keys(n)) {
            const child = n[key];
            if (Array.isArray(child)) {
                child.forEach(c => { if (c && typeof c === 'object' && 'type' in c)
                    visit(c); });
            }
            else if (child && typeof child === 'object' && 'type' in child) {
                visit(child);
            }
        }
    }
    visit(node);
    return complexity;
}
//# sourceMappingURL=ast.js.map