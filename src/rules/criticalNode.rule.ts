import { Issue, AnalysisContext } from '../types';
import { Rule } from './rule';
import * as path from 'path';

export class CriticalNodeRule implements Rule {
  name = 'critical-node';

  run(context: AnalysisContext): Issue[] {
    const issues: Issue[] = [];

    for (const [filePath, node] of context.graph) {
      if (!node.isCritical) continue;

      const file = context.files.find(f => f.path === filePath);
      const rel = file?.relativePath ?? path.basename(filePath);

      issues.push({
        type: 'critical-node',
        severity: 'error',
        file: rel,
        message: `Critical module — imported by ${node.inDegree} files, centrality score ${node.centrality}.`,
        suggestion: 'Removing or breaking this file will cascade failures. Add tests and document it.',
      });
    }

    return issues;
  }
}
