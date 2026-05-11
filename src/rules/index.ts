import { AnalysisContext, Issue, IssueSeverity } from '../types';
import { Rule } from './rule';
import { DeadExportRule } from './deadExport.rule';
import { ComplexityRule } from './complexity.rule';
import { GodFileRule } from './godFile.rule';
import { CriticalNodeRule } from './criticalNode.rule';
import { VulnerabilityRule } from './vulnerability.rule';
import { SCARule } from './sca.rule';
import { DuplicationRule } from './duplication.rule';

export interface RunOptions {
  strict?: boolean;
}

export function runRules(context: AnalysisContext, opts: RunOptions = {}, externalRules: Rule[] = []): Issue[] {
  const rules: Rule[] = [
    new DeadExportRule(),
    new ComplexityRule(context.config.maxComplexity || (opts.strict ? 10 : 20)),
    new GodFileRule(),
    new CriticalNodeRule(),
    new VulnerabilityRule(),
    new SCARule(),
    new DuplicationRule(),
    ...externalRules
  ];

  let issues = rules.flatMap(rule => rule.run(context));


  if (opts.strict) {
    issues = issues.map(i =>
      i.severity === 'warning' ? { ...i, severity: 'error' as IssueSeverity } : i
    );
  }

  return issues;
}
