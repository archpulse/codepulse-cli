"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GodFileRule = void 0;
class GodFileRule {
    constructor() {
        this.name = 'god-file';
    }
    run(context) {
        const issues = [];
        for (const file of context.files) {
            if (!file.isGodFile)
                continue;
            const reasons = [];
            if (file.lines >= 500)
                reasons.push(`${file.lines} lines`);
            if (file.imports.length >= 15)
                reasons.push(`${file.imports.length} imports`);
            issues.push({
                type: 'god-file',
                severity: 'warning',
                file: file.relativePath,
                message: `File is a god file (${reasons.join(', ')}).`,
                suggestion: 'Split into smaller modules with single responsibilities.',
            });
        }
        return issues;
    }
}
exports.GodFileRule = GodFileRule;
//# sourceMappingURL=godFile.rule.js.map