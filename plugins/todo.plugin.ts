import { Rule } from '../src/rules/rule';
import { AnalysisContext, Issue } from '../src/types';

export default class TodoRule implements Rule {
  name = 'todo-finder';
  description = 'Finds and reports TODO comments in your codebase';
  version = '1.0.0';
  author = 'CodePulse Team';
  category = 'code-quality';
  enabled = true;

  run(context: AnalysisContext): Issue[] {
    const issues: Issue[] = [];
    for (const file of context.files) {
      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('TODO')) {
          issues.push({
            type: 'custom',
            severity: 'info',
            message: 'Found a TODO in this file',
            file: file.relativePath,
            line: i + 1,
            suggestion: 'Review and address this TODO comment'
          });
        }
      }
    }
    return issues;
  }
}
