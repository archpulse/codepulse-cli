import { Issue, AnalysisContext } from '../types';
import { Rule } from './rule';

const WARN_THRESHOLD = 10;

export class ComplexityRule implements Rule {
  name = 'high-complexity';

  constructor(private errorThreshold: number = 20) {}

  run(context: AnalysisContext): Issue[] {
    const issues: Issue[] = [];

    for (const file of context.files) {
      for (const fn of file.functions) {
        if (fn.complexity <= WARN_THRESHOLD) continue;

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
