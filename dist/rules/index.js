"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRules = runRules;
const deadExport_rule_1 = require("./deadExport.rule");
const complexity_rule_1 = require("./complexity.rule");
const godFile_rule_1 = require("./godFile.rule");
const criticalNode_rule_1 = require("./criticalNode.rule");
function runRules(context, opts = {}) {
    const rules = [
        new deadExport_rule_1.DeadExportRule(),
        new complexity_rule_1.ComplexityRule(opts.strict ? 15 : 20),
        new godFile_rule_1.GodFileRule(),
        new criticalNode_rule_1.CriticalNodeRule(),
    ];
    let issues = rules.flatMap(rule => rule.run(context));
    // Strict mode: escalate warnings to errors
    if (opts.strict) {
        issues = issues.map(i => i.severity === 'warning' ? { ...i, severity: 'error' } : i);
    }
    return issues;
}
//# sourceMappingURL=index.js.map