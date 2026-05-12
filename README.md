<div align="center">

# 🩺 CodePulse CLI

<img src="./logo.svg" alt="CodePulse Logo" width="120" height="120" style="filter: brightness(0) invert(1);" />

### 🚀 Advanced Code Analysis with Surgical Precision

**Architectural Intelligence • Semantic Analysis • Real-time Monitoring**

Deep code structure analysis for large JavaScript/TypeScript and Python projects

![CodePulse Health](./badge.svg)
[![NPM Version](https://img.shields.io/npm/v/@archpulse/codepulse?style=for-the-badge&color=0ea5e9)](https://www.npmjs.com/package/@archpulse/codepulse)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/Node-16%2B-brightgreen?style=for-the-badge)](https://nodejs.org/)

---

### 🌍 Multi-Language Support
[English](./README.md) | [Українська](./translations/README.ua.md) | [Русский](./translations/README.ru.md) | [Čeština](./translations/README.cs.md) | [한국어](./translations/README.ko.md) | [Deutsch](./translations/README.de.md) | [Français](./translations/README.fr.md)

</div>

---

## ⚡ Quick Start

### Installation

```bash
npm install -g @archpulse/codepulse
```

### First Scan

```bash
# Analyze your project
codepulse scan .

# Watch mode with live dashboard
codepulse watch .
```

---

## 🏆 Competitive Advantage (Report by Mythos)

CodePulse is the only tool that seamlessly unifies AST static analysis, Git-based churn & coupling analytics, Time Machine for historical architectural tracking, Runtime Profiler correlation, and native MCP integration for AI-agent workflows. Unlike SonarQube, CodeClimate, or ESLint, CodePulse provides the unique combination of 'how it was, how it is, and what to do about it right now via AI'.

| Feature | Description |
|---------|-------------|
| **🏗️ Architectural Radar** | Define layers and catch boundary violations automatically |
| **🧠 Semantic Duplication** | AST-based structural hashing finds identical logic, not just identical lines |
| **🔄 Circular Dependency Breaker** | Automatically detect and break circular imports (A→B→A) |
| **⚡ Real-time Watch Mode** | Interactive TUI dashboard that updates as you code |
| **🎨 Beautiful CLI** | Enhanced with rich colors, ASCII art banners, and clear visualizations |
| **🌐 7-Language Support** | Use `--lang` to switch between languages on the fly |
| **📜 License Generator** | Generate 10+ types of open-source licenses instantly |

---

## 📋 All Commands

### Quick Reference

| Command | Description |
|---------|-------------|
| `codepulse scan [dir]` | Full analysis + HTML report + SARIF export |
| `codepulse watch [dir]` | Interactive real-time TUI dashboard |
| `codepulse plugins list` | List all available plugins with metadata |
| `codepulse license <type>` | Generate LICENSE file (mit, apache, bsd, gpl, etc.) |
| `codepulse stats [dir]` | Quick project statistics in console |
| `codepulse explain [topic]` | Detailed explanation of specific issues |

---

## 🏗️ Architecture Rules

Define your project structure and boundaries in `.codepulse.json`:

```json
{
  "architecture": {
    "layers": [
      { 
        "name": "UI", 
        "pattern": "src/ui/.*", 
        "allowDependenciesFrom": ["Services", "Utils"] 
      },
      { 
        "name": "Services", 
        "pattern": "src/services/.*", 
        "allowDependenciesFrom": ["DB", "Utils"] 
      },
      { 
        "name": "DB", 
        "pattern": "src/db/.*", 
        "allowDependenciesFrom": ["Utils"] 
      }
    ],
    "strict": true
  }
}
```

---

## 🔌 Plugin System

Build custom analysis rules with CodePulse's powerful plugin system.

### Creating a Plugin

Create a plugin in `~/.config/codepulse/plugins` directory:

```typescript
import { Rule, AnalysisContext, Issue } from '@archpulse/codepulse';

export default class MyAnalysisPlugin implements Rule {
  name = 'my-custom-plugin';
  description = 'My custom analysis plugin';
  version = '1.0.0';
  author = 'Your Name';
  category = 'code-quality';

  run(context: AnalysisContext): Issue[] {
    // Your analysis logic here
    return [];
  }
}
```

### View Loaded Plugins

```bash
codepulse plugins list
codepulse plugins list --json
```

📚 **[Learn more about plugins →](./docs/PLUGINS.md)**

---

## 📚 Documentation

- **📐 [Architecture & Internal Workflows](./docs/ARCHITECTURE.md)** — Understand how CodePulse works under the hood
- **🔌 [Plugin System Development](./docs/PLUGINS.md)** — Build your own analysis rules

---

## 📸 Visual Examples

See CodePulse in action:

<table>
  <tr>
    <td align="center">
      <img src="./screenshots/report.png" alt="HTML Report" width="250"/>
      <br><strong>HTML Report</strong>
    </td>
    <td align="center">
      <img src="./screenshots/critical-node.png" alt="Critical Nodes" width="250"/>
      <br><strong>Critical Dependencies</strong>
    </td>
    <td align="center">
      <img src="./screenshots/high-complexity.png" alt="Complexity Analysis" width="250"/>
      <br><strong>Complexity Analysis</strong>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="./screenshots/god-file.png" alt="God Files" width="250"/>
      <br><strong>God File Detection</strong>
    </td>
    <td align="center">
      <img src="./screenshots/duplication.png" alt="Code Duplication" width="250"/>
      <br><strong>Semantic Duplication</strong>
    </td>
    <td align="center">
      <img src="./screenshots/dependency-vulnerability.png" alt="Vulnerabilities" width="250"/>
      <br><strong>Dependency Issues</strong>
    </td>
  </tr>
</table>

---

## 🌐 Localization

Switch languages on the fly:

```bash
# French
codepulse --help --lang fr

# Ukrainian
codepulse scan . --lang ua

# German
codepulse watch . --lang de
```

**Supported languages:** English, Українська, Русский, Čeština, 한국어, Deutsch, Français

---

## 💡 Use Cases

### 🏢 Enterprise Applications
- Enforce architectural boundaries across teams
- Identify critical nodes that impact multiple services
- Monitor code complexity trends

### 🎯 Performance Optimization
- Find and refactor high-complexity functions
- Detect and eliminate semantic code duplication
- Analyze dependency chains for bottlenecks

### 🛡️ Code Quality
- Continuous architecture monitoring in watch mode
- Automatic license compliance checking
- Plugin-based custom rules for your team's standards

### 📚 Team Collaboration
- Generate visual architecture reports
- Share SARIF reports with tools like GitHub Advanced Security
- Multilingual support for international teams

---

## 📦 System Requirements

- **Node.js**: 16.0.0 or higher
- **npm**: 6.0.0 or higher (or yarn/pnpm)
- **OS**: Linux, macOS, or Windows
- **RAM**: 512MB minimum (1GB+ recommended for large projects)

---

## 🤝 Contributing

We love contributions! Whether it's bug reports, feature requests, or pull requests, your input helps make CodePulse better.

### Getting Started

```bash
# Clone the repository
git clone https://github.com/archpulse/codepulse-cli.git
cd codepulse-cli

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Try it locally
npm run dev -- scan .
```

---

## 📄 License

MIT License © 2024 ArchPulse

See [LICENSE](./LICENSE) for details.

---

<div align="center">

### ⭐ Love CodePulse? Give us a star on GitHub!

**Made with ❤️ by archpulse**

</div>
