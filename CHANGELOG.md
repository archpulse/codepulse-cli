# CHANGELOG — CodePulse v4.0.0 "Architectural Intelligence"

## 🚀 The Big Leap
Version 4.0 transforms CodePulse from a passive code scanner into an active architectural co-pilot. We have introduced predictive risk analytics and a proactive discovery system for AI agents.

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
*CodePulse v4.0.0: Don't just read code. Understand its pulse.*
