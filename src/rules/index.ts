import { AnalysisContext, Issue, IssueSeverity } from '../types';
import { DeadExportRule } from './deadExport.rule';
import { ComplexityRule } from './complexity.rule';
import { GodFileRule } from './godFile.rule';
import { CriticalNodeRule } from './criticalNode.rule';

export interface RunOptions {
  strict?: boolean;
}

export function runRules(context: AnalysisContext, opts: RunOptions = {}): Issue[] {
  const rules = [
    new DeadExportRule(),
    new ComplexityRule(opts.strict ? 15 : 20),
    new GodFileRule(),
    new CriticalNodeRule(),
  ];

  let issues = rules.flatMap(rule => rule.run(context));

  // Strict mode: escalate warnings to errors
  if (opts.strict) {
    issues = issues.map(i =>
      i.severity === 'warning' ? { ...i, severity: 'error' as IssueSeverity } : i
    );
  }

  return issues;
}
