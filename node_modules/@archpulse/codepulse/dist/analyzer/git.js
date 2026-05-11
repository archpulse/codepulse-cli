"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGitChurn = getGitChurn;
exports.calculateHotspots = calculateHotspots;
const child_process_1 = require("child_process");
function getGitChurn(dir) {
    const churnMap = new Map();
    try {
        const output = (0, child_process_1.execSync)('git log --format=format: --name-only --since="6 months ago"', { cwd: dir, encoding: 'utf-8' });
        const files = output.split('\n').filter(f => f.trim().length > 0);
        for (const file of files) {
            churnMap.set(file, (churnMap.get(file) || 0) + 1);
        }
    }
    catch (err) {
    }
    return churnMap;
}
function calculateHotspots(files) {
    return files
        .map(f => {
        const churn = f.churn || 0;
        const score = f.complexity * Math.log2(churn + 1);
        return {
            file: f.relativePath,
            score: Math.round(score * 10) / 10,
            complexity: f.complexity,
            churn,
        };
    })
        .filter(h => h.score > 20 && h.churn >= 2)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
}
//# sourceMappingURL=git.js.map