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
const utils_1 = require("./utils");
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
    // Improved import regex
    const importRe = /^(?:from\s+([\w.]+)\s+import|import\s+([\w.,\s]+))/;
    const defRe = /^(def|async def|class)\s+(\w+)\s*[(:]/;
    for (let i = 0; i < lineArr.length; i++) {
        const line = lineArr[i];
        const trimmed = line.trim();
        // Skip comments and empty lines
        if (trimmed.startsWith('#') || !trimmed)
            continue;
        // Imports
        const mImport = line.match(importRe);
        if (mImport) {
            const imp = mImport[1] ?? mImport[2].split(',')[0].trim();
            if (imp)
                imports.push(imp);
        }
        // Functions/Classes
        const mDef = line.match(defRe);
        if (mDef) {
            const name = mDef[2];
            const isTopLevel = !line.startsWith(' ') && !line.startsWith('\t');
            if (isTopLevel)
                exports.push(name);
            const blockLines = extractBlock(lineArr, i);
            const complexity = calcPythonComplexity(blockLines);
            functions.push({
                name,
                startLine: i + 1,
                endLine: i + blockLines.length,
                complexity,
                isExported: isTopLevel,
            });
            // Skip the rest of the block to avoid double counting nested functions for file complexity
            // but we still want to detect them if they are top-level. 
            // Actually, for simple line-by-line, we just continue.
        }
    }
    return (0, utils_1.createFileNode)(filePath, relativePath, lines, imports, exports, functions);
}
function extractBlock(lines, startIdx) {
    const block = [lines[startIdx]];
    const baseIndent = getIndent(lines[startIdx]);
    for (let i = startIdx + 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === '')
            continue; // Ignore empty lines in block detection
        if (getIndent(line) <= baseIndent)
            break;
        block.push(line);
    }
    return block;
}
function getIndent(line) {
    const m = line.match(/^(\s*)/);
    return m ? m[1].replace(/\t/g, '    ').length : 0;
}
function calcPythonComplexity(lines) {
    let complexity = 1;
    // Keywords that increase cyclomatic complexity
    const keywords = /\b(if|elif|for|while|except|with|and|or)\b/g;
    for (const line of lines) {
        const stripped = line.split('#')[0].trim(); // Remove comments
        if (!stripped)
            continue;
        const matches = stripped.match(keywords);
        if (matches)
            complexity += matches.length;
    }
    return complexity;
}
//# sourceMappingURL=python.js.map