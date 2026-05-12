# CodePulse — Architectural Intelligence (MCP)

You have a professional code architecture analyzer installed as an MCP tool called **CodePulse**. 
It performs deep AST-based static analysis, builds dependency graphs, and computes cyclomatic complexity.

## MANDATORY WORKFLOW

### 1. Context Acquisition (On Session Start)
- **ALWAYS** call `codepulse_identity` first. It returns a 0-100 Health Score and identifies:
  - **God Files**: Modules that are too large and MUST be split.
  - **Critical Nodes**: High-dependency files (highest risk for changes).
  - **Hotspots**: Complex files with high churn (priority for refactoring).

### 2. Risk Assessment (Before Editing)
- **ALWAYS** call `get_file_context(file: "...path...")` before modifying any file.
- It reveals **Temporal Coupling** (hidden dependencies from git history) and structural risks.

### 3. Quality Assurance (Before Refactoring)
- Call `analyze_project` with `focus` filters to identify specific technical debt.
- Call `find_dead_code` to clean up unused exports.

## Core Tools Registry

| Tool | Primary Use Case |
|------|------------------|
| `codepulse_identity` | Project health overview & refactoring targets |
| `get_file_context` | Pre-edit risk check (reveals hidden couplings) |
| `analyze_project` | Detailed debt analysis (complexity, god files, etc.) |
| `get_hotspots` | Prioritizing where to fix bugs/refactor first |
| `find_dead_code` | Removing unused code safely |

## Guiding Principles
- Never guess code quality — verify with CodePulse metrics.
- Prioritize Hotspots over random exploration.
- Maintain the architectural boundaries identified in the dependency graph.
