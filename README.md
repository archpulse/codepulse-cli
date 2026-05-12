# 🩺 CodePulse CLI

> Advanced static analysis and security scanning for JS/TS projects. Find vulnerabilities, detect hotspots, and visualize code health.

![CodePulse Health](./badge.svg)
[![NPM Version](https://img.shields.io/npm/v/@archpulse/codepulse)](https://www.npmjs.com/package/@archpulse/codepulse)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

### 🌍 Languages / Мови / Языки
[English](./README.md) | [Українська](./translations/README.ua.md) | [Русский](./translations/README.ru.md) | [Čeština](./translations/README.cs.md) | [한국어](./translations/README.ko.md) | [Deutsch](./translations/README.de.md) | [Français](./translations/README.fr.md)

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
## Documentation

- **📐 [Architecture & Internal Workflows](./docs/ARCHITECTURE.md)** — Learn how CodePulse works under the hood.
- **🔌 [Plugin System Development](./docs/PLUGINS.md)** — Build your own analysis rules.

---

## Commands


### Program Explanation Screenshots
![Program Explanation Screenshot](./screenshots/report.png)
![Program Explanation Screenshot](./screenshots/critical-node.png)
![Program Explanation Screenshot](./screenshots/dependency-vulnerability.png)
![Program Explanation Screenshot](./screenshots/duplication.png)
![Program Explanation Screenshot](./screenshots/god-file.png)
![Program Explanation Screenshot](./screenshots/high-complexity.png)
![Program Explanation Screenshot](./screenshots/vulnerability.png)

---

## Commands

| Command | Description |
|---------|-------------|
| `codepulse scan [dir]` | Full analysis + HTML report + SARIF |
| `codepulse plugins list` | List all available plugins with metadata |
| `codepulse license <type> [name]` | Generate a LICENSE file (mit, apache, bsd...) |
| `codepulse stats [dir]` | Quick stats in console |
| `codepulse explain [topic]` | Detailed explanation of issues |

---

## Plugin System

CodePulse has a powerful plugin system for custom analysis. Create a `~/.config/codepulse/plugins` directory and add `.ts` or `.js` files that implement the `Rule` interface:

```typescript
import { Rule, AnalysisContext, Issue } from '@archpulse/codepulse';


export default class MyPlugin implements Rule {
  name = 'my-plugin';
  description = 'My custom analysis plugin';
  version = '1.0.0';
  author = 'John Doe';
  category = 'code-quality';

  run(context: AnalysisContext): Issue[] {
    // Your analysis logic
    return [];
  }
}
```

View loaded plugins:
```bash
codepulse plugins list
codepulse plugins list --json
```

[Learn more about plugins →](./docs/PLUGINS.md)

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
