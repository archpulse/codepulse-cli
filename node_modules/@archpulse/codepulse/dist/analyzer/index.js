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
exports.analyze = analyze;
const scanner_1 = require("./scanner");
const ast_1 = require("./ast");
const graph_1 = require("./graph");
const rules_1 = require("../rules");
const git_1 = require("./git");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
function loadConfig(dir, options) {
    let config = {
        maxComplexity: options.strict ? 10 : 20,
        godFileLines: 500,
        godFileImports: 15,
        criticalNodeThreshold: 10,
        duplicationThreshold: 15,
        exclude: [],
    };
    const configPath = path.join(dir, '.codepulse.json');
    if (fs.existsSync(configPath)) {
        try {
            const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            config = { ...config, ...userConfig };
        }
        catch (err) {
            console.warn('Failed to parse .codepulse.json, using defaults.');
        }
    }
    return config;
}
function processFiles(filePaths, dir, churnMap, config) {
    const files = [];
    for (const filePath of filePaths) {
        try {
            const result = (0, ast_1.analyzeFile)(filePath, dir);
            if (result) {
                const rel = result.relativePath;
                result.churn = churnMap.get(rel) || 0;
                result.isGodFile = result.lines > (config.godFileLines || 500) ||
                    result.imports.length > (config.godFileImports || 15);
                files.push(result);
            }
        }
        catch (err) {
            // Skip problematic files
        }
    }
    return files;
}
async function analyze(dir, options = {}) {
    const config = loadConfig(dir, options);
    const scanOptions = {
        dir,
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.c', '.cs', '.lua', '.css', '.scss', '.html'],
        exclude: ['node_modules', '.git', 'dist', 'build', 'coverage', '__pycache__', '.codepulse-report', '*.min.js', '*.test.ts', '*.spec.ts', ...(config.exclude || [])],
    };
    const filePaths = (0, scanner_1.scanFiles)(scanOptions);
    const churnMap = (0, git_1.getGitChurn)(dir);
    const files = processFiles(filePaths, dir, churnMap, config);
    const { edges, graph } = (0, graph_1.buildGraph)(files, dir);
    const deadExports = (0, graph_1.detectDeadExports)(files, edges);
    const godFiles = files.filter(f => f.isGodFile);
    const hotspots = (0, git_1.calculateHotspots)(files);
    for (const node of graph.values()) {
        node.isCritical = node.inDegree >= (config.criticalNodeThreshold || 10);
    }
    const criticalFiles = [...graph.values()].filter(n => n.isCritical)
        .sort((a, b) => b.centrality - a.centrality);
    const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
    const avgComplexity = files.length
        ? files.reduce((sum, f) => sum + f.complexity, 0) / files.length
        : 0;
    const context = { files, graph, edges, config };
    const issues = (0, rules_1.runRules)(context, { strict: options.strict });
    return {
        files, edges, graph,
        deadExports, godFiles, criticalFiles,
        hotspots,
        totalFiles: files.length,
        totalLines, avgComplexity,
        issues,
    };
}
//# sourceMappingURL=index.js.map