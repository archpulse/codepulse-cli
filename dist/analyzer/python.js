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
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzePythonFile = analyzePythonFile;
const path = __importStar(require("path"));
const scanner_1 = require("./scanner");
const GOD_FILE_LINES = 500;
const GOD_FILE_IMPORTS = 15;
function analyzePythonFile(filePath, baseDir) {
    const content = (0, scanner_1.readFile)(filePath);
    if (!content)
        return null;
    const relativePath = path.relative(baseDir, filePath);
    const lines = (0, scanner_1.countLines)(content);
    const imports = [];
    const exports = [];
    const functions = [];
    const lineArr = content.split('\n');
    // Collect imports: "import x", "from x import y"
    const importRe = /^(?:from\s+([\w.]+)\s+import|import\s+([\w.,\s]+))/;
    for (const line of lineArr) {
        const m = line.trim().match(importRe);
        if (m)
            imports.push(m[1] ?? m[2].split(',')[0].trim());
    }
    // Collect functions and classes (top-level = exported in Python sense)
    const defRe = /^(def|async def|class)\s+(\w+)\s*[(:]/;
    for (let i = 0; i < lineArr.length; i++) {
        const line = lineArr[i];
        const m = line.match(defRe);
        if (m) {
            const name = m[2];
            const isTopLevel = !line.startsWith(' ') && !line.startsWith('\t');
            if (isTopLevel)
                exports.push(name);
            // Calculate complexity for this block
            const blockLines = extractBlock(lineArr, i);
            const complexity = calcPythonComplexity(blockLines);
            functions.push({
                name,
                startLine: i + 1,
                endLine: i + blockLines.length,
                complexity,
                isExported: isTopLevel,
            });
        }
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
function extractBlock(lines, startIdx) {
    const block = [lines[startIdx]];
    const baseIndent = getIndent(lines[startIdx]);
    for (let i = startIdx + 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === '') {
            block.push(line);
            continue;
        }
        if (getIndent(line) <= baseIndent && line.trim() !== '')
            break;
        block.push(line);
    }
    return block;
}
function getIndent(line) {
    const m = line.match(/^(\s*)/);
    return m ? m[1].length : 0;
}
function calcPythonComplexity(lines) {
    let complexity = 1;
    const keywords = /\b(if|elif|else|for|while|except|with|and|or)\b/g;
    for (const line of lines) {
        const stripped = line.trim();
        if (stripped.startsWith('#'))
            continue;
        const matches = stripped.match(keywords);
        if (matches)
            complexity += matches.length;
    }
    return complexity;
}
//# sourceMappingURL=python.js.map