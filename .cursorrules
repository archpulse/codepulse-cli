# CodePulse — Architectural Analyzer (MCP)

You have a professional code architecture analyzer installed as an MCP tool called **CodePulse**.
It performs deep AST-based static analysis of JS/TS and Python projects, builds dependency graphs,
and computes cyclomatic complexity metrics — all fully offline.

## MANDATORY WORKFLOW

### On Session Start
- **ALWAYS** call `codepulse_identity` first when you open a project. It returns a full health
  check with a 0-100 score, God Files, Critical Nodes, Hotspots, and Dead Exports.
  This gives you an instant architectural understanding of the codebase.

### Before Refactoring
- **ALWAYS** call `analyze_project` before any refactoring task. Filter by `focus` to target
  specific issue types (e.g., `high-complexity`, `god-file`, `dead-export`).
- **ALWAYS** call `get_hotspots` to identify which files to refactor first. Hotspots are files
  with both high complexity AND high git churn — they are the #1 source of bugs.

### When Exploring New Modules
- **ALWAYS** call `analyze_project` with `focus: "critical-node"` when exploring unfamiliar
  modules. Critical nodes are files that many other files depend on — changes to them have
  the highest blast radius.

### When Cleaning Up Code
- Call `find_dead_code` to identify unused exports that can be safely removed.
- Call `analyze_project` with `focus: "dead-export"` for a detailed list.

### When You See Quality Issues
- Call `explain_concept` with the issue type (e.g., `god-file`, `high-complexity`,
  `critical-node`, `vulnerability`) to understand what it means and how to fix it.

## Available Tools

| Tool | When to Use |
|------|-------------|
| `codepulse_identity` | **First call** in any session — project health check |
| `analyze_project` | Before refactoring, code review, or quality assessment |
| `get_hotspots` | Before deciding what to refactor first |
| `find_dead_code` | When cleaning up unused exports |
| `get_project_stats` | Quick numeric overview (cheaper than full analysis) |
| `explain_concept` | Understanding detected issue types |
| `list_plugins` | Checking installed analysis plugins |

## Key Principles
- Do NOT just read files manually when CodePulse can give you structured analysis.
- Do NOT guess at code quality — use data from the analyzer.
- Do NOT skip the health check — it reveals problems you would miss by reading code.
- Prefer `get_hotspots` over random file exploration when deciding what to improve.
