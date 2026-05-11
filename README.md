# 🩺 CodePulse CLI

> Advanced static analysis and security scanning for JS/TS projects. Find vulnerabilities, detect hotspots, and visualize code health.

![CodePulse Health](./badge.svg)
[![NPM Version](https://img.shields.io/npm/v/@archpulse/codepulse)](https://www.npmjs.com/package/@archpulse/codepulse)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

### 🌍 Languages / Мови / Языки
[English](./README.md) | [Українська](./docs/locales/README.ua.md) | [Русский](./docs/locales/README.ru.md) | [Čeština](./docs/locales/README.cs.md) | [한국어](./docs/locales/README.ko.md) | [Deutsch](./docs/locales/README.de.md) | [Français](./docs/locales/README.fr.md)

---

## Install

```bash
npm install -g @archpulse/codepulse
```

## Quick Start

```bash
codepulse scan .
```

---

## Features

- **🎨 Beautiful Colorful CLI** — Enhanced with rich colors, ASCII art banners, and clear examples.
- **🌐 Multilingual Support** — Use `--lang` to switch between 7 languages (en, ua, ru, cs, ko, de, fr).
- **📜 License Generator** — Generate 10+ types of open-source licenses instantly.
- **🤖 Zero-Config MCP Server** — Works with Claude Desktop, Cursor, and more.
- **🔍 Security Analysis** — Detects vulnerabilities, hardcoded secrets, and SCA issues.
- **🔥 Hotspot Detection** — Finds risky files based on complexity and git churn.

---

## Commands

| Command | Description |
|---------|-------------|
| `codepulse scan [dir]` | Full analysis + HTML report + SARIF |
| `codepulse license <type> [name]` | Generate a LICENSE file (mit, apache, bsd...) |
| `codepulse stats [dir]` | Quick stats in console |
| `codepulse explain [topic]` | Detailed explanation of issues |

---

## Localization

Change the CLI language on the fly:
```bash
codepulse --help --lang fr
codepulse scan . --lang ua
```

---

## License

MIT - See [LICENSE](./LICENSE) for details.
