import { Issue, AnalysisContext } from '../types';
import { Rule } from './rule';

export class DeadExportRule implements Rule {
  name = 'dead-export';

  run(context: AnalysisContext): Issue[] {
    const issues: Issue[] = [];
    const importedFiles = new Set(context.edges.map(e => e.to));

    for (const file of context.files) {
      if (importedFiles.has(file.path)) continue;
      for (const exp of file.exports) {
        if (exp === 'default' || exp === 'module.exports') continue;
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
