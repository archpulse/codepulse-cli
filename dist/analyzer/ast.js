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
const utils_1 = require("./utils");
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
    const ast = parseContent(content);
    if (!ast)
        return null;
    try {
        (0, traverse_1.default)(ast, {
            ImportDeclaration(p) { imports.push(p.node.source.value); },
            CallExpression(p) { handleRequire(p, imports); },
            ExportNamedDeclaration(p) { handleNamedExport(p, exports); },
            ExportDefaultDeclaration(p) { handleDefaultExport(p, exports); },
            AssignmentExpression(p) { handleModuleExport(p, exports); },
            'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression'(p) {
                handleFunction(p, functions, exports);
            },
        });
    }
    catch {
        // Ignore traversal errors
    }
    return (0, utils_1.createFileNode)(filePath, relativePath, lines, imports, exports, functions);
}
function parseContent(content) {
    try {
        return parser.parse(content, {
            sourceType: 'unambiguous',
            plugins: [
                'typescript', 'jsx', 'decorators-legacy', 'classProperties',
                'optionalChaining', 'nullishCoalescingOperator', 'dynamicImport',
            ],
            errorRecovery: true,
        });
    }
    catch {
        return null;
    }
}
function handleRequire(p, imports) {
    const { node } = p;
    if (t.isIdentifier(node.callee, { name: 'require' }) && node.arguments.length === 1) {
        const arg = node.arguments[0];
        if (t.isStringLiteral(arg))
            imports.push(arg.value);
    }
}
function handleNamedExportDeclaration(declaration, exports) {
    if (t.isFunctionDeclaration(declaration) && declaration.id) {
        exports.push(declaration.id.name);
    }
    else if (t.isVariableDeclaration(declaration)) {
        declaration.declarations.forEach((decl) => {
            if (t.isIdentifier(decl.id))
                exports.push(decl.id.name);
        });
    }
    else if (t.isClassDeclaration(declaration) && declaration.id) {
        exports.push(declaration.id.name);
    }
}
function handleNamedExportSpecifiers(specifiers, exports) {
    specifiers.forEach((spec) => {
        if (t.isExportSpecifier(spec)) {
            exports.push(t.isIdentifier(spec.exported) ? spec.exported.name : spec.exported.value);
        }
    });
}
function handleNamedExport(p, exports) {
    const { node } = p;
    if (node.declaration) {
        handleNamedExportDeclaration(node.declaration, exports);
    }
    if (node.specifiers) {
        handleNamedExportSpecifiers(node.specifiers, exports);
    }
}
function handleDefaultExport(p, exports) {
    const { node } = p;
    if (t.isFunctionDeclaration(node.declaration) && node.declaration.id) {
        exports.push(node.declaration.id.name);
    }
    else {
        exports.push('default');
    }
}
function handleModuleExport(p, exports) {
    const { node } = p;
    if (t.isMemberExpression(node.left) &&
        t.isIdentifier(node.left.object, { name: 'module' }) &&
        t.isIdentifier(node.left.property, { name: 'exports' })) {
        exports.push('module.exports');
    }
}
function resolveFunctionName(node, parent) {
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
    return 'anonymous';
}
function handleFunction(p, functions, exports) {
    const { node, parent } = p;
    const name = resolveFunctionName(node, parent);
    const startLine = node.loc?.start.line ?? 0;
    const endLine = node.loc?.end.line ?? 0;
    const complexity = calculateComplexity(node);
    const isExported = exports.some(e => e === name);
    functions.push({ name, startLine, endLine, complexity, isExported });
}
function calculateComplexity(node) {
    let complexity = 1;
    (0, traverse_1.default)(node, {
        noScope: true,
        enter(p) {
            if (isComplexityNode(p.node))
                complexity++;
        }
    });
    return complexity;
}
function isLoopNode(n) {
    return t.isWhileStatement(n) || t.isDoWhileStatement(n) ||
        t.isForStatement(n) || t.isForInStatement(n) || t.isForOfStatement(n);
}
function isConditionNode(n) {
    return t.isIfStatement(n) || t.isConditionalExpression(n) ||
        t.isLogicalExpression(n) || t.isCatchClause(n) ||
        (t.isSwitchCase(n) && n.test !== null);
}
function isComplexityNode(n) {
    return isLoopNode(n) || isConditionNode(n);
}
//# sourceMappingURL=ast.js.map