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
exports.analyzeGenericFile = analyzeGenericFile;
const path = __importStar(require("path"));
const scanner_1 = require("./scanner");
const GOD_FILE_LINES = 500;
const GOD_FILE_IMPORTS = 15;
const LANG_CONFIGS = {
    '.java': {
        importPatterns: [/^import\s+([\w.]+);/m],
        exportPatterns: [/^public\s+(?:class|interface|enum|record)\s+(\w+)/m],
        funcPatterns: [/(?:public|private|protected|static|final|\s)+[\w<>\[\]]+\s+(\w+)\s*\(/g],
        complexityKeywords: /\b(if|else if|for|while|do|case|catch|&&|\|\|)\b/g,
    },
    '.cpp': {
        importPatterns: [/#include\s+["<]([\w./]+)[">]/g],
        exportPatterns: [/^(?:[\w:]+\s+)+(\w+)\s*\(/mg],
        funcPatterns: [/^(?:[\w:*&<>]+\s+)+(\w+)\s*\([^)]*\)\s*(?:const)?\s*\{/mg],
        complexityKeywords: /\b(if|else if|for|while|do|case|catch|&&|\|\|)\b/g,
    },
    '.c': {
        importPatterns: [/#include\s+["<]([\w./]+)[">]/g],
        exportPatterns: [/^[\w\s*]+\s+(\w+)\s*\([^)]*\)\s*\{/mg],
        funcPatterns: [/^[\w\s*]+\s+(\w+)\s*\([^)]*\)\s*\{/mg],
        complexityKeywords: /\b(if|else if|for|while|do|case|&&|\|\|)\b/g,
    },
    '.cs': {
        importPatterns: [/^using\s+([\w.]+);/mg],
        exportPatterns: [/(?:public|internal)\s+(?:class|interface|struct|enum|record)\s+(\w+)/g],
        funcPatterns: [/(?:public|private|protected|internal|static|override|virtual|\s)+[\w<>\[\]?]+\s+(\w+)\s*\(/g],
        complexityKeywords: /\b(if|else if|for|foreach|while|do|case|catch|&&|\|\|)\b/g,
    },
    '.lua': {
        importPatterns: [/require\s*\(?\s*['"]([^'"]+)['"]\s*\)?/g],
        exportPatterns: [/^function\s+(\w[\w.]*)\s*\(/mg],
        funcPatterns: [/(?:local\s+)?function\s+(\w[\w.]*)\s*\(/g],
        complexityKeywords: /\b(if|elseif|for|while|repeat|and|or)\b/g,
    },
    '.css': {
        importPatterns: [/@import\s+['"]([^'"]+)['"]/g],
        exportPatterns: [],
        funcPatterns: [],
        complexityKeywords: /@media|@supports|@layer/g,
    },
    '.scss': {
        importPatterns: [/@(?:import|use|forward)\s+['"]([^'"]+)['"]/g],
        exportPatterns: [],
        funcPatterns: [/@mixin\s+(\w[\w-]*)/g],
        complexityKeywords: /@if|@each|@for|@while/g,
    },
    '.html': {
        importPatterns: [/(?:src|href)=["']([^'"]+\.(?:js|css|ts))['"]/g],
        exportPatterns: [],
        funcPatterns: [],
        complexityKeywords: /\b(if|for|while|switch)\b/g,
    },
};
function analyzeGenericFile(filePath, baseDir) {
    const ext = path.extname(filePath).toLowerCase();
    const config = LANG_CONFIGS[ext];
    if (!config)
        return null;
    const content = (0, scanner_1.readFile)(filePath);
    if (!content)
        return null;
    const relativePath = path.relative(baseDir, filePath);
    const lines = (0, scanner_1.countLines)(content);
    const imports = [];
    const exports = [];
    const functions = [];
    // Extract imports
    for (const pattern of config.importPatterns) {
        const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
        let m;
        while ((m = re.exec(content)) !== null) {
            if (m[1])
                imports.push(m[1]);
        }
    }
    // Extract exports
    for (const pattern of config.exportPatterns) {
        const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
        let m;
        while ((m = re.exec(content)) !== null) {
            if (m[1])
                exports.push(m[1]);
        }
    }
    // Extract functions with line numbers
    const lineOffsets = buildLineOffsets(content);
    for (const pattern of config.funcPatterns) {
        const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
        let m;
        while ((m = re.exec(content)) !== null) {
            const name = m[1];
            if (!name || name.length < 2)
                continue;
            const startLine = getLineNumber(m.index, lineOffsets);
            functions.push({
                name,
                startLine,
                endLine: startLine,
                complexity: 1,
                isExported: exports.includes(name),
            });
        }
    }
    // File-level complexity
    const complexityMatches = content.match(config.complexityKeywords);
    const fileComplexity = 1 + (complexityMatches?.length ?? 0);
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
function buildLineOffsets(content) {
    const offsets = [0];
    for (let i = 0; i < content.length; i++) {
        if (content[i] === '\n')
            offsets.push(i + 1);
    }
    return offsets;
}
function getLineNumber(offset, lineOffsets) {
    let lo = 0, hi = lineOffsets.length - 1;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (lineOffsets[mid] <= offset)
            lo = mid;
        else
            hi = mid - 1;
    }
    return lo + 1;
}
//# sourceMappingURL=generic.js.map