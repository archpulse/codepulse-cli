# 🏛 Architecture & Internal Workflows

CodePulse CLI 3.0 is a modular intelligence tool designed for architectural validation, semantic code analysis, and real-time monitoring.

## 🧱 Core Components

1.  **CLI Layer (`src/commands/`)**: User interface for standard scan, stats, and the new real-time **Watch Mode**.
2.  **Analyzer Layer (`src/analyzer/`)**:
    *   **Scanner**: Multi-language file discovery.
    *   **AST Engine**: Semantic parsing and **structural fingerprinting** for duplication detection.
    *   **Graph Engine**: Dependency mapping and **Architectural Layer** validation.
3.  **Rule Layer (`src/rules/index.ts`)**: Modular rules including `ArchitectureRule` for boundary checks, `ComplexityRule`, and `DeadExportRule`. Large or specialized rules (like `FastLinter` and `VulnerabilityScanner`) are maintained in separate files within `src/rules/` but aggregated in the main index.
4.  **Reporter Layer (`src/reporter/`)**: Visualizes data in HTML, SARIF, or interactive TUI.

## 🔄 Advanced Workflows in v3.0

### 🧠 Semantic Duplication Engine
Instead of line-based hashing, CodePulse 3.0 uses **AST Structural Fingerprinting**.
1.  **Normalization**: Babel identifiers and literals are replaced with generic tokens.
2.  **Hashing**: A Merkle-tree-like hash is generated for every function node.
3.  **Matching**: Functions with identical structural logic are flagged, even if variable names or spacing differ.

### 🏗️ Architectural Radar
CodePulse now enforces system boundaries.
1.  **Layer Definition**: Defined in `.codepulse.json` via path patterns.
2.  **Edge Validation**: The dependency graph is compared against the allowed dependency matrix.
3.  **Violation Reporting**: Direct imports that bypass layers (e.g., UI → Database) are reported as critical errors.

### ⚡ Real-time Watch Mode
A demonized process that provides instant feedback.
1.  **Incremental Analysis**: Monitors file changes via `chokidar`.
2.  **Live TUI Dashboard**: Uses `log-update` and ANSI escapes to render a real-time health dashboard in your terminal.
