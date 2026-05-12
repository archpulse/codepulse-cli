# 🔌 CodePulse Plugin System

Extend CodePulse analysis with your own custom rules. Plugins have full access to the project's AST metadata, dependency graph, and configuration.

## 📂 Plugin Locations

CodePulse loads plugins from a global directory based on your operating system:

- **Linux**: `~/.config/codepulse/plugins`
- **macOS**: `~/Library/Application Support/codepulse/plugins`
- **Windows**: `%APPDATA%\codepulse\plugins`

## 🚀 Quick Start

1. Create a `~/.config/codepulse/plugins` directory root.
2. Create a TypeScript file (e.g., `~/.config/codepulse/plugins/my-rule.ts`):
   ```typescript
   import { Rule, AnalysisContext, Issue } from '@archpulse/codepulse';

   export default class MyRule implements Rule {
     name = 'my-custom-rule';
     description = 'Checks for specific patterns in my codebase';

     run(context: AnalysisContext): Issue[] {
       return context.files
         .filter(f => f.content.includes('TODO: IMPORTANT'))
         .map(f => ({
           type: 'custom',
           severity: 'warning',
           file: f.relativePath,
           message: 'High priority TODO found!',
           suggestion: 'Address this before the next release.'
         }));
     }
   }
   ```
3. Compile to JavaScript: `tsc ~/.config/codepulse/plugins/my-rule.ts --module commonjs`
4. Run: `codepulse scan .`

## 🛠 The `Rule` Interface

Every plugin must implement the `Rule` interface:

| Property | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | **Required.** Unique identifier for the rule. |
| `description` | `string` | Brief explanation of what the rule checks. |
| `version` | `string` | Semantic version of the plugin. |
| `author` | `string` | Plugin author name. |
| `category` | `string` | e.g., 'security', 'quality', 'performance'. |
| `enabled` | `boolean` | Whether it runs by default (default: `true`). |
| `run()` | `function` | **Required.** The execution logic. Returns an array of `Issue` objects. |

## 📊 Analysis Context

The `run(context)` method receives a rich `AnalysisContext` object:

### `context.files: FileNode[]`
An array of all scanned files. Each `FileNode` contains:
- `path` / `relativePath`: File locations.
- `content`: Full source code.
- `lines`: Total line count.
- `complexity`: Calculated cyclomatic complexity.
- `imports` / `exports`: List of dependency strings.
- `functions`: Detailed AST-extracted function metadata.
- `churn`: Number of Git commits (if in a Git repo).

### `context.graph: Map<string, GraphNode>`
The project's dependency graph.
- `inDegree` / `outDegree`: Importance of the file in the graph.
- `centrality`: Architectural significance.
- `isCritical`: Whether it exceeds the project's critical threshold.

### `context.config: ProjectConfig`
Access to `.codepulse.json` settings, allowing your plugin to be configurable.

## ⚡ Fast Linter Integration

CodePulse also includes a `FastLinterRule` that can bridge external tools. If your "plugin" is actually a wrapper around another CLI tool (like a custom linter), you can use `execSync` within the `run()` method to aggregate results.

## 📖 Best Practices

- **Performance**: Plugins run synchronously during analysis. Avoid heavy synchronous I/O.
- **Filtering**: Use `file.relativePath` or extensions to filter which files your rule applies to.
- **Suggestions**: Always provide a `suggestion` in your `Issue` objects to help users fix the problem.
