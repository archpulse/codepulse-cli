# CodePulse Plugin System

CodePulse supports custom plugins to extend its analysis capabilities. Plugins are TypeScript or JavaScript files that implement the `Rule` interface.

## Quick Start

1. Create a `plugins` directory in your project root.
2. Create a `.ts` file (e.g., `my-rule.ts`) implementing the `Rule` interface.
3. **Compile it to JavaScript** before using: `tsc plugins/my-rule.ts --lib es2015 --module commonjs --target es2015`
4. Run analysis with `codepulse scan .` — plugins will be automatically loaded from the `plugins/` directory.

## Plugin Metadata

Plugins can include optional metadata to describe themselves:

```typescript
export default class MyPlugin implements Rule {
  name = 'my-plugin';              // Required: unique identifier
  description = '...';             // Optional: what the plugin does
  version = '1.0.0';               // Optional: plugin version
  author = 'John Doe';             // Optional: plugin author
  category = 'security';           // Optional: plugin category (security, code-quality, performance, etc.)
  enabled = true;                  // Optional: whether plugin runs by default (default: true)
  
  run(context: AnalysisContext): Issue[] {
    // Your analysis logic
  }
}
```

## Example: TODO Finder

```typescript
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
```

## Using Plugins

### Loading Plugins

Plugins are automatically loaded from the `plugins/` directory when you run:
```bash
codepulse scan .
```

**Important:** Only `.js` files are loaded. TypeScript plugins must be compiled to JavaScript first:
```bash
tsc plugins/*.ts --lib es2015 --module commonjs --target es2015
```

### List Available Plugins

View all loaded plugins with their metadata:
```bash
codepulse plugins .
```

Output as JSON:
```bash
codepulse plugins . --json
```

## API Reference

### Rule Interface

```typescript
interface Rule {
  name: string;                    // Required: unique plugin identifier
  description?: string;            // Optional: human-readable description
  version?: string;                // Optional: semantic version (e.g., "1.0.0")
  author?: string;                 // Optional: plugin author
  category?: string;               // Optional: category or tag
  enabled?: boolean;               // Optional: true by default
  run(context: AnalysisContext): Issue[];
}
```

### AnalysisContext

The `context` parameter passed to `run()` contains:

- `files: FileNode[]` — List of all analyzed files
- `graph: Map<string, GraphNode>` — Dependency graph
- `edges: DependencyEdge[]` — List of all import relations
- `config: ProjectConfig` — Current project configuration

### FileNode

Each file in the analysis includes:

- `path: string` — Absolute file path
- `relativePath: string` — Path relative to project root
- `content: string` — Full text content of the file
- `lines: number` — Total line count
- `complexity: number` — Cyclomatic complexity
- `imports: string[]` — List of imports
- `exports: string[]` — List of exports
- `functions: FunctionNode[]` — Functions defined in file
- `churn?: number` — Number of commits modifying this file

### FunctionNode

Information about functions in a file:

- `name: string` — Function name
- `startLine: number` — Line where function starts
- `endLine: number` — Line where function ends
- `complexity: number` — Cyclomatic complexity
- `isExported: boolean` — Whether function is exported

### Issue

The object your plugin should return:

```typescript
interface Issue {
  type: IssueType;        // Issue type (custom, vulnerability, etc.)
  severity: IssueSeverity;// 'info', 'warning', or 'error'
  file: string;           // Relative file path
  line?: number;          // Optional: line number
  symbol?: string;        // Optional: symbol name
  message: string;        // Human-readable message
  suggestion?: string;    // Optional: how to fix it
  context?: string;       // Optional: additional context
}
```

## Advanced Example: Security Plugin

Here's a more advanced example that detects potential security issues:

```typescript
import { Rule } from '../src/rules/rule';
import { AnalysisContext, Issue } from '../src/types';

export default class SecurityPlugin implements Rule {
  name = 'security-scan';
  description = 'Detects common security issues like hardcoded secrets';
  version = '1.0.0';
  author = 'Security Team';
  category = 'security';

  private patterns = [
    { regex: /password\s*=\s*["'][^"']+["']/i, message: 'Potential hardcoded password' },
    { regex: /api[_-]?key\s*=\s*["'][^"']+["']/i, message: 'Potential hardcoded API key' },
    { regex: /secret\s*=\s*["'][^"']+["']/i, message: 'Potential hardcoded secret' },
  ];

  run(context: AnalysisContext): Issue[] {
    const issues: Issue[] = [];

    for (const file of context.files) {
      const lines = file.content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        for (const pattern of this.patterns) {
          if (pattern.regex.test(line)) {
            issues.push({
              type: 'custom',
              severity: 'error',
              file: file.relativePath,
              line: i + 1,
              message: pattern.message,
              suggestion: 'Move secrets to environment variables or secure vaults'
            });
          }
        }
      }
    }

    return issues;
  }
}
```

## Best Practices

1. **Make plugins focused** — Each plugin should do one thing well
2. **Provide clear descriptions** — Help users understand what your plugin does
3. **Use appropriate severity levels** — 'info' for notices, 'warning' for concerns, 'error' for critical issues
4. **Include suggestions** — Help users fix the issues your plugin detects
5. **Handle errors gracefully** — Don't crash the entire analysis if something goes wrong
6. **Test your plugins** — Create test files to verify your plugin works correctly
7. **Use categories** — Organize plugins with meaningful categories (security, performance, code-quality, etc.)
8. **Compile to JavaScript** — Always compile TypeScript plugins to JavaScript before distributing or using in production

