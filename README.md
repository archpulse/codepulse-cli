# 🩺 CodePulse CLI

> Deep code analysis for JS/TS projects. Find dead code, measure complexity, visualize dependencies.

```bash
codepulse scan ./my-project
```

Works **100% locally**. No server. No AI. No cloud.

---

## Install

```bash
npm install -g codepulse
```

Or run directly:

```bash
npx codepulse scan .
```

---

## Commands

| Command | Description |
|---------|-------------|
| `codepulse scan [dir]` | Full analysis + HTML report |
| `codepulse stats [dir]` | Quick stats in console |
| `codepulse dead [dir]` | Show unused exports |
| `codepulse graph [dir]` | Generate dependency graph SVG only |

---

## What it does

- **Dependency graph** — builds a directed graph of all `import`/`require` relations
- **Dead code detection** — finds exports never imported by any other file
- **Complexity analysis** — cyclomatic complexity per function and file
- **God file detection** — flags files with 500+ lines or 15+ imports
- **Critical node detection** — finds modules whose removal would break the most

---

## Report output

```
.codepulse-report/
    index.html      ← full dashboard
    graph.svg       ← dependency graph
    stats.json      ← raw data
```

Open `index.html` in your browser.

---

## Options

```bash
codepulse scan . --pro    # Disable 200-file limit (Pro license required)
codepulse scan . --open   # Auto-open report in browser
```

---

## Tech stack

- TypeScript + Node.js
- `@babel/parser` — AST analysis
- `commander` — CLI
- No external services required

---

## License

See [LICENSE](./LICENSE) for details.
