"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyze = analyze;
const scanner_1 = require("./scanner");
const ast_1 = require("./ast");
const graph_1 = require("./graph");
const rules_1 = require("../rules");
const FREE_FILE_LIMIT = 200;
async function analyze(dir, options = {}) {
    const maxFiles = options.pro ? undefined : FREE_FILE_LIMIT;
    const scanOptions = {
        dir,
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.c', '.cs', '.lua', '.css', '.scss', '.html'],
        exclude: ['node_modules', '.git', 'dist', 'build', 'coverage', '__pycache__', '*.min.js', '*.test.ts', '*.spec.ts'],
        maxFiles,
    };
    const filePaths = (0, scanner_1.scanFiles)(scanOptions);
    const files = [];
    for (const filePath of filePaths) {
        const result = (0, ast_1.analyzeFile)(filePath, dir);
        if (result)
            files.push(result);
    }
    const { edges, graph } = (0, graph_1.buildGraph)(files, dir);
    const deadExports = (0, graph_1.detectDeadExports)(files, edges);
    const godFiles = files.filter(f => f.isGodFile);
    const criticalFiles = [...graph.values()].filter(n => n.isCritical)
        .sort((a, b) => b.centrality - a.centrality);
    const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
    const avgComplexity = files.length
        ? files.reduce((sum, f) => sum + f.complexity, 0) / files.length
        : 0;
    const context = { files, graph, edges };
    const issues = (0, rules_1.runRules)(context, { strict: options.strict });
    return {
        files, edges, graph,
        deadExports, godFiles, criticalFiles,
        totalFiles: files.length,
        totalLines, avgComplexity,
        issues,
    };
}
//# sourceMappingURL=index.js.map