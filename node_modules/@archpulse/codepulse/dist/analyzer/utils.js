"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GOD_FILE_IMPORTS = exports.GOD_FILE_LINES = void 0;
exports.createFileNode = createFileNode;
exports.GOD_FILE_LINES = 500;
exports.GOD_FILE_IMPORTS = 15;
function createFileNode(filePath, relativePath, lines, imports, exports, functions) {
    let fileComplexity = 1;
    if (functions.length > 0) {
        const sum = functions.reduce((acc, fn) => acc + fn.complexity, 0);
        fileComplexity = Math.max(1, Math.round((sum / functions.length) * 10) / 10);
    }
    const isGodFile = lines >= exports.GOD_FILE_LINES || imports.length >= exports.GOD_FILE_IMPORTS;
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
//# sourceMappingURL=utils.js.map