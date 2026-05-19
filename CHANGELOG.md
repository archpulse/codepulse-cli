# CHANGELOG — CodePulse v5.0.0 "Engineering Honesty"

## ⚖️ Brutally Honest Health Scoring (Breaking Change)
*   **Non-Linear Normalization:** Replaced linear KLOC scaling with a `sqrt(KLOC)` hybrid model. Small issues no longer vanish in large projects.
*   **Deterministic God Files:** Defined strict thresholds for God Files (1000+ LOC or 30+ imports) with mandatory scoring caps.
*   **Severity-Weighted Risks:** Security vulnerabilities and dependency flaws are now weighted by severity. Critical RCEs now trigger an immediate "Unhealthy" (39/59) cap.
*   **Absolute Debt:** Reinstated absolute penalties for Dead Exports and Hotspots. Garbage is garbage, regardless of project size.

## 🛡️ The Confidence Metric
*   **Humble Analysis:** Introduced a separate "Confidence Score" (Max 98%) to quantify analysis reliability based on file coverage and parsing success.
*   **Unknown Tracking:** Explicit penalties for unparsed files or high-complexity "blind spots" where static analysis is less reliable.
*   **Asymptotic Ceiling:** 100% confidence is now correctly treated as an engineering impossibility.

## 🤖 Advanced AI-Agent Intelligence (MCP v2)
*   **Massive Toolset Expansion:** Expanded from 4 to 17+ specialized tools for AI agents (Claude, Cursor, etc.).
*   **Predictive Analysis:** New `predict_change_impact` and `get_blast_radius` tools for transitive dependency risk assessment.
*   **Structural Similarities:** `find_similar_functions` uses AST fingerprinting to find duplicated logic across the entire project.
*   **Contextual Memory:** `store_memory` and `get_memories` allow agents to persist architectural facts across sessions.
*   **Refactoring Assistance:** `suggest_split_strategy` provides domain-driven decomposition advice for God Files.
*   **Pre-flight Validation:** `simulate_edit` validates proposed changes for syntax and architectural impact before they are applied.

## 🚀 Performance & Internals
*   **Worker Thread Pipeline:** File analysis is now offloaded to worker threads, significantly improving performance on multi-core systems.
*   **Auto-Engine Selection:** Intelligent detection of project structure to automatically switch between **Oxlint** (ultra-fast) and **ESLint** (high-precision) engines.
*   **Refactored Handler Architecture:** MCP handlers are now modularized for better maintainability and extensibility.

## 🔌 Enhanced Plugin Discovery
*   **Local Project Plugins:** CLI now automatically discovers and loads plugins from the `./plugins/` directory.
*   **TS/JS Support:** Full support for custom quality rules written in TypeScript or JavaScript.

## 📊 Triple-Panel Badges
*   **Nuanced Visualization:** Badges now show both Health and Confidence panels.
*   **Contextual Colors:** Confidence panels use a separate color scale (Blue/Amber/Red) to signal assessment depth.

---
# CHANGELOG — CodePulse v4.2.0 "Parallel Pulse"

## 🚀 Parallel Analysis Pipeline
*   **Concurrent Jobs:** Core file analysis, fast linters, and security checks now start in parallel instead of waiting for one another.
*   **Incremental Cache:** Unchanged files are reused from cache based on `mtime` + size, which makes repeat scans much faster on large repositories.
*   **Streaming Scan:** File discovery and parsing avoid full-file reads for the common path, with blacklist and minified-file skips applied early.

## 🧰 Linter & Security Updates
*   **Oxlint Migration:** `Biome` was replaced with `Oxlint` for faster JS/TS linting on large projects.
*   **Auto-Install:** `scan` now installs project-specific external linters automatically when a repo actually needs them.
*   **Linter Debugging:** Added `-ld` for linter debug output, plus `-diw` / `-ldiw` to hide warning-level issues when needed.
*   **Fail-Loud Diagnostics:** External linter failures now surface as issues instead of disappearing into `none`.

## 🤖 MCP and Agent Rules
*   **Faster Setup:** `setup-mcp` keeps generating MCP config and agent rule files, but the rules are now softer and more practical for code review workflows.
*   **Codex Support:** Added Codex-friendly rules alongside the existing agent rule targets.

## 🧠 Quality-of-Life
*   **Update Checks:** Old `npx` launches now surface version updates more reliably.
*   **Project Awareness:** Mixed-language projects now get better language-aware lint routing instead of trying to force every linter everywhere.

---

# CHANGELOG — CodePulse v4 "Architectural Intelligence"

## 🚀 The Big Leap
Version 4 transforms CodePulse from a passive code scanner into an active architectural co-pilot. We have introduced predictive risk analytics and a proactive discovery system for AI agents.

### 🧩 New Feature: Circular Dependency Breaker
*   **Cycle Detection:** Integrated Tarjan's algorithm to detect circular dependencies (A→B→C→A) directly in the dependency graph.
*   **Active Reporting:** New `circular-dependency` issue type. Circular loops are now automatically factored into the Health Score (up to -40 pts).
*   **AI-Guided Refactoring:** MCP tool `codepulse_identity` now explicitly flags dependency cycles, enabling AI agents to propose immediate refactoring strategies (e.g., dependency injection).

### 🧠 Intelligent Analytics
*   **Temporal Coupling Detector:** A new Git-history analysis engine. It identifies "invisible" dependencies between files that frequently change together (80%+ co-change rate), even if they have no direct imports.
*   **PR Risk Scorer:** Introduced the `pr-risk` command. It evaluates the danger of Pull Request changes on a 100-point scale by analyzing architectural centrality, complexity, and historical churn.
*   **Runtime Profiler Correlation:** Ability to map profiler data (`.cpuprofile`, `cProfile`) onto the dependency graph. Identify "Active Hotspots"—code that is both architecturally complex and performance-heavy.
*   **Git Time Machine:** Reconstruct dependency graphs at any point in history to visualize architectural decay or modularization progress over time.

### 🤖 AI-Agent Integration (MCP)
*   **Proactive Discovery:** `setup-mcp` now automatically generates agent-specific rules files (`.clinerules`, `.cursorrules`, `.windsurfrules`, `.traerules`, `.pirules`, `.kirorules`, `CLAUDE.md`, `.github/copilot-instructions.md`). These are placed in the `rules/` folder to keep the project root clean, and instruct LLMs to use CodePulse tools before suggesting any code changes.
*   **Smart File Context:** New MCP tool `get_file_context`. Provides AI agents with a deep "dossier" on any specific file: its risks, hidden couplings, and structural importance.
*   **Project Identity:** On first contact, AI agents now receive a concise "Project Health Check" identifying God Files and refactoring priorities immediately.

### ⚡ Performance & TUI
*   **Incremental Engine:** The `watch` mode now uses a content-hash based incremental engine. CPU usage is reduced to near 0% when idle, only re-parsing changed files.
*   **Interactive TUI:** Added a `Ctrl+O` toggle in watch mode to display the full, non-truncated list of all detected issues.
*   **Architectural Refactor:** Deep refactoring of CodePulse itself. Cyclomatic complexity of core functions has been halved, and the codebase now achieves a 100/100 health score.

---
*CodePulse v4: Don't just read code. Understand its pulse.*
