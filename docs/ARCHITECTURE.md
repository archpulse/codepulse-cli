# 🏛 Architecture & Internal Workflows

CodePulse CLI is a modular static analysis tool designed for speed and extensibility. This document outlines the core components and data flows within the system.

## 🧱 Core Components

The system is divided into four main layers:

1.  **CLI Layer (`src/commands/`)**: Handles user input, command-line arguments, and output formatting (Console, HTML, SARIF).
2.  **Analyzer Layer (`src/analyzer/`)**: The engine responsible for scanning files, parsing code (AST), and building the dependency graph.
3.  **Rule Layer (`src/rules/`)**: Contains the analysis logic. Each rule is a discrete module that runs against the analysis context.
4.  **Reporter Layer (`src/reporter/`)**: Transforms analysis results into various formats (HTML dashboard, SARIF for CI/CD, SVG graphs).

## 🔄 Analysis Workflow

When you run `codepulse scan`, the following steps occur:

### 1. File Discovery
The `Scanner` (`src/analyzer/scanner.ts`) recursively walks the target directory, respecting `.gitignore` and `.codepulseignore`. It identifies supported files (JS, TS, Python, C++, etc.).

### 2. Multi-Language Parsing
CodePulse uses specialized parsers for different languages:
- **JS/TS**: Powered by `@babel/parser` for full AST analysis.
- **Python**: Generic parsing with specialized logic for imports.
- **Generic**: Fallback line-based analysis for other supported languages.

### 3. Graph Construction
The `GraphBuilder` (`src/analyzer/graph.ts`) maps dependencies between files. It calculates:
- **In-Degree/Out-Degree**: How many files import or are imported by this file.
- **Centrality**: Identification of "Critical Nodes" that affect large portions of the codebase.

### 4. Git Integration
The `GitAnalyzer` (`src/analyzer/git.ts`) extracts commit history to calculate **Churn**. High churn combined with high complexity identifies **Hotspots** — the riskiest files in your project.

### 5. Rule Execution
The `runRules` engine executes two types of rules:
- **Built-in Rules**: Complexity, SCA, Vulnerabilities, Dead Exports, etc.
- **External Plugins**: Loaded dynamically from the `plugins/` directory.

### 6. Report Generation
The collected `Issues` and `Stats` are passed to the `Reporter`. The HTML reporter generates a self-contained dashboard with:
- **Dependency Graph** (interactive SVG)
- **Code Health Stats**
- **Categorized Issue List**

## 📂 Project Structure

```text
src/
├── analyzer/      # Core scanning and analysis logic
├── commands/      # CLI command definitions
├── locales/       # Multilingual strings (i18n)
├── reporter/      # HTML/SARIF/SVG generation
├── rules/         # Analysis rules and rule engine
├── types/         # System-wide TypeScript interfaces
└── utils/         # Helper functions (plugins, i18n, etc.)
```

## 🔌 Extensibility

CodePulse is built on a "Plugin-First" philosophy. The same `Rule` interface used for built-in analysis is available to external plugins. For more details on extending CodePulse, see [PLUGINS.md](./PLUGINS.md).
