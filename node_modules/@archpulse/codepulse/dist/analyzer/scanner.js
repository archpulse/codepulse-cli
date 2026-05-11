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
exports.scanFiles = scanFiles;
exports.readFile = readFile;
exports.countLines = countLines;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function getCustomExcludes(dir, baseExclude) {
    const customExclude = [...baseExclude];
    const ignoreFilePath = path.join(dir, '.codepulseignore');
    if (fs.existsSync(ignoreFilePath)) {
        const ignoreContent = fs.readFileSync(ignoreFilePath, 'utf-8');
        const ignoreLines = ignoreContent.split('\n')
            .map(l => l.trim())
            .filter(l => l && !l.startsWith('#'));
        customExclude.push(...ignoreLines);
    }
    return customExclude;
}
function shouldExcludeFile(entryName, relPath, customExclude) {
    return customExclude.some(ex => {
        if (ex.startsWith('*'))
            return entryName.includes(ex.slice(1));
        return relPath === ex || relPath.startsWith(ex + path.sep) || entryName === ex;
    });
}
function processDirectoryEntry(entry, currentDir, baseDir, customExclude, extensions, files, walkFn) {
    const fullPath = path.join(currentDir, entry.name);
    const relPath = path.relative(baseDir, fullPath);
    if (shouldExcludeFile(entry.name, relPath, customExclude))
        return;
    if (entry.isDirectory()) {
        walkFn(fullPath);
    }
    else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
            files.push(fullPath);
        }
    }
}
function scanFiles(options) {
    const { dir, extensions, exclude } = options;
    const files = [];
    const customExclude = getCustomExcludes(dir, exclude);
    function walk(currentDir) {
        let entries;
        try {
            entries = fs.readdirSync(currentDir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            processDirectoryEntry(entry, currentDir, dir, customExclude, extensions, files, walk);
        }
    }
    walk(dir);
    return files;
}
function readFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    }
    catch {
        return '';
    }
}
function countLines(content) {
    return content.split('\n').length;
}
//# sourceMappingURL=scanner.js.map