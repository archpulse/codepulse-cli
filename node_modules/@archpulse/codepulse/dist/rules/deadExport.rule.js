"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeadExportRule = void 0;
class DeadExportRule {
    constructor() {
        this.name = 'dead-export';
    }
    run(context) {
        const issues = [];
        const importedFiles = new Set(context.edges.map(e => e.to));
        for (const file of context.files) {
            if (importedFiles.has(file.path))
                continue;
            for (const exp of file.exports) {
                if (exp === 'default' || exp === 'module.exports')
                    continue;
                issues.push({
                    type: 'dead-export',
                    severity: 'warning',
                    file: file.relativePath,
                    symbol: exp,
                    message: `Export "${exp}" is never imported by any other file.`,
                    suggestion: 'Remove the export or verify it is used dynamically.',
                });
            }
        }
        return issues;
    }
}
exports.DeadExportRule = DeadExportRule;
//# sourceMappingURL=deadExport.rule.js.map