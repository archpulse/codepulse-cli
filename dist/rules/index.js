"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRules = runRules;
const deadExport_rule_1 = require("./deadExport.rule");
const complexity_rule_1 = require("./complexity.rule");
const godFile_rule_1 = require("./godFile.rule");
const criticalNode_rule_1 = require("./criticalNode.rule");
const vulnerability_rule_1 = require("./vulnerability.rule");
const sca_rule_1 = require("./sca.rule");
const duplication_rule_1 = require("./duplication.rule");
function runRules(context, opts = {}) {
    const rules = [
        new deadExport_rule_1.DeadExportRule(),
        new complexity_rule_1.ComplexityRule(context.config.maxComplexity || (opts.strict ? 10 : 20)),
        new godFile_rule_1.GodFileRule(),
        new criticalNode_rule_1.CriticalNodeRule(),
        new vulnerability_rule_1.VulnerabilityRule(),
        new sca_rule_1.SCARule(),
        new duplication_rule_1.DuplicationRule(),
    ];
    let issues = rules.flatMap(rule => rule.run(context));
    if (opts.strict) {
        issues = issues.map(i => i.severity === 'warning' ? { ...i, severity: 'error' } : i);
    }
    return issues;
}
//# sourceMappingURL=index.js.map