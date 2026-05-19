# 🏛 Architecture & Internal Workflows

CodePulse CLI 5.0 is a modular intelligence tool designed for architectural validation, semantic code analysis, and real-time monitoring.

## 🧱 Core Components

1.  **CLI Layer (`src/commands/`)**: User interface for standard scan, stats, and the real-time **Watch Mode**.
2.  **Analyzer Layer (`src/analyzer/`)**:
    *   **Scanner**: Multi-language file discovery with worker thread offloading.
    *   **AST Engine**: Semantic parsing and **structural fingerprinting** for duplication detection.
    *   **Graph Engine**: Dependency mapping and **Architectural Layer** validation.
    *   **Worker Pool**: Parallel processing of files to maximize multi-core performance.
3.  **Rule Layer (`src/rules/index.ts`)**: Modular rules including `ArchitectureRule` for boundary checks, `ComplexityRule`, and `DeadExportRule`. Includes integrated **FastLinter** (Oxlint) and **SecurityScanner**.
4.  **Reporter Layer (`src/reporter/`)**: Visualizes data in HTML, SARIF, or interactive TUI, now featuring the **Confidence Metric**.
5.  **MCP Layer (`src/mcp/`)**: A modularized server implementation of the Model Context Protocol with specialized handlers for Health, Architecture, and AI Agent interactions.

## 🔄 Advanced Workflows in v5.0

### 🧠 Semantic Duplication Engine
Instead of line-based hashing, CodePulse uses **AST Structural Fingerprinting**.
1.  **Normalization**: Babel identifiers and literals are replaced with generic tokens.
2.  **Hashing**: A Merkle-tree-like hash is generated for every function node using `generateFunctionFingerprint`.
3.  **Matching**: Functions with identical structural logic are flagged, even if variable names or spacing differ.

### 🏗️ Architectural Radar
CodePulse enforces system boundaries through layer definitions.
1.  **Layer Definition**: Defined in `.codepulse.json` via path patterns.
2.  **Edge Validation**: The dependency graph is compared against the allowed dependency matrix.
3.  **Violation Reporting**: Direct imports that bypass layers (e.g., UI → Database) are reported as critical errors.

### 🛡️ Confidence & Health Scoring
Version 5.0 introduces a non-linear scoring model.
1.  **Health Score**: Uses a `sqrt(KLOC)` hybrid model to ensure small issues remain visible in large projects.
2.  **Confidence Metric**: Quantifies analysis reliability (Max 98%) by tracking unparsed files and complexity blind spots.

### ⚡ Parallel Analysis Pipeline
1.  **Worker Threads**: Analysis tasks are distributed across a pool of worker threads (`src/analyzer/workers.ts`).
2.  **Auto-Engine Selection**: The system detects `.eslintrc` or `package.json` configurations to decide between **Oxlint** (speed) and **ESLint** (precision) engines.

### 🤖 AI Intelligence & MCP
CodePulse is a first-class citizen in AI-assisted development.
1.  **Modular Handlers**: Tool logic is split into `handlers-health.ts`, `handlers-architecture.ts`, and `handlers-agent.ts`.
2.  **Agent Rule Sets**: Auto-generates specialized instruction files (`.cursorrules`, `.clinerules`, `CODEX.md`) to guide LLMs.
3.  **Interactive Tools**: Provides 17+ tools including blast radius prediction, evolutionary risk assessment, and refactoring strategies.
