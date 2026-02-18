"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplexityRule = void 0;
const WARN_THRESHOLD = 10;
class ComplexityRule {
    constructor(errorThreshold = 20) {
        this.errorThreshold = errorThreshold;
        this.name = 'high-complexity';
    }
    run(context) {
        const issues = [];
        for (const file of context.files) {
            for (const fn of file.functions) {
                if (fn.complexity <= WARN_THRESHOLD)
                    continue;
                const severity = fn.complexity > this.errorThreshold ? 'error' : 'warning';
                issues.push({
                    type: 'high-complexity',
                    severity,
                    file: file.relativePath,
                    line: fn.startLine,
                    symbol: fn.name,
                    message: `Function "${fn.name}" has cyclomatic complexity of ${fn.complexity}.`,
                    suggestion: fn.complexity > this.errorThreshold
                        ? 'Refactor urgently — split into smaller focused functions.'
                        : 'Consider simplifying branching logic.',
                });
            }
        }
        return issues;
    }
}
exports.ComplexityRule = ComplexityRule;
//# sourceMappingURL=complexity.rule.js.map