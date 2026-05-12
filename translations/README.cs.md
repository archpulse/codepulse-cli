<div align="center">

# 🩺 CodePulse CLI

<img src="../logo.svg" alt="CodePulse Logo" width="120" height="120" style="filter: brightness(0) invert(1);" />

### 🚀 Pokročilá analýza kódu s chirurgickou přesností

**Architektonická Inteligence • Sémantická Analýza • Monitorování v Reálném Čase**

Hluboká analýza struktury kódu pro velké JS/TS a Python projekty

![CodePulse Health](../badge.svg)
[![NPM Version](https://img.shields.io/npm/v/@archpulse/codepulse?style=for-the-badge&color=0ea5e9)](https://www.npmjs.com/package/@archpulse/codepulse)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/Node-16%2B-brightgreen?style=for-the-badge)](https://nodejs.org/)

---

### 🌍 Jazyky
[English](../README.md) | [Українська](./README.ua.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md) | [한국어](./README.ko.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md)

</div>

---

## ⚡ Rychlý start

### Instalace

```bash
npm install -g @archpulse/codepulse
```

### První skenování

```bash
# Analyzujte svůj projekt
codepulse scan .

# Režim watch se živým dashboard
codepulse watch .
```

---

## 🎯 Hlavní funkce

| Funkce | Popis |
|---------|-------------|
| **🏗️ Architektonický radar** | Definujte vrstvy a automaticky zachycujte porušení hranic |
| **🧠 Sémantické duplikáty** | Hašování na bázi AST najde identickou logiku, ne jen řádky |
| **⚡ Režim Watch** | Interaktivní TUI dashboard, který se aktualizuje během kódování |
| **🎨 Krásné CLI** | Bohaté barvy, ASCII art, jasné příklady |
| **🌐 7 jazyků** | Používejte `--lang` pro přepínání mezi jazyky |
| **📜 Generátor licencí** | Vytvořte 10+ typů open-source licencí okamžitě |

---

## 📋 Všechny příkazy

| Příkaz | Popis |
|---------|-------------|
| `codepulse scan [dir]` | Kompletní analýza + HTML zpráva + SARIF export |
| `codepulse watch [dir]` | Interaktivní živý TUI dashboard |
| `codepulse plugins list` | Seznam všech dostupných pluginů s metadaty |
| `codepulse license <type>` | Vytvořit soubor LICENSE (mit, apache, bsd, gpl atd.) |
| `codepulse stats [dir]` | Rychlé statistiky projektu v konzoli |
| `codepulse explain [topic]` | Podrobné vysvětlení konkrétních problémů |

---

## 🏗️ Architektonická pravidla

Definujte strukturu projektu a hranice v `.codepulse.json`:

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

## �� Systém pluginů

Vytvářejte vlastní analyticka pravidla s výkonným systémem pluginů CodePulse.

### Vytvoření pluginu

Vytvořte plugin v adresáři `~/.config/codepulse/plugins`:

```typescript
import { Rule, AnalysisContext, Issue } from '@archpulse/codepulse';

export default class MyAnalysisPlugin implements Rule {
  name = 'my-custom-plugin';
  description = 'Můj vlastní analytický plugin';
  version = '1.0.0';
  author = 'Vaše jméno';
  category = 'code-quality';

  run(context: AnalysisContext): Issue[] {
    // Vaše analyticka logika
    return [];
  }
}
```

### Zobrazení načtených pluginů

```bash
codepulse plugins list
codepulse plugins list --json
```

📚 **[Další informace o pluginech →](../docs/PLUGINS.md)**

---

## 📚 Dokumentace

- **📐 [Architektura a interní procesy](../docs/ARCHITECTURE.md)** — Pochopit, jak CodePulse pracuje pod kapotou
- **🔌 [Vývoj systému pluginů](../docs/PLUGINS.md)** — Vytvářejte vlastní analyticka pravidla

---

## 📸 Vizuální příklady

<table>
  <tr>
    <td align="center">
      <img src="../screenshots/report.png" alt="HTML zpráva" width="250"/>
      <br><strong>HTML zpráva</strong>
    </td>
    <td align="center">
      <img src="../screenshots/critical-node.png" alt="Kritické uzly" width="250"/>
      <br><strong>Kritické závislosti</strong>
    </td>
    <td align="center">
      <img src="../screenshots/high-complexity.png" alt="Analýza složitosti" width="250"/>
      <br><strong>Analýza složitosti</strong>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="../screenshots/god-file.png" alt="God Files" width="250"/>
      <br><strong>Detekce God Files</strong>
    </td>
    <td align="center">
      <img src="../screenshots/duplication.png" alt="Duplikace kódu" width="250"/>
      <br><strong>Sémantická duplikace</strong>
    </td>
    <td align="center">
      <img src="../screenshots/dependency-vulnerability.png" alt="Zranitelnosti" width="250"/>
      <br><strong>Problémy závislostí</strong>
    </td>
  </tr>
</table>

---

## 🌐 Lokalizace

```bash
# Francouzština
codepulse --help --lang fr

# Ukrajinština
codepulse scan . --lang ua

# Němčina
codepulse watch . --lang de
```

**Podporované jazyky:** English, Українська, Русский, Čeština, 한국어, Deutsch, Français

---

## 💡 Případy použití

### 🏢 Podnikové aplikace
- Vynucujte architektonické hranice v týmech
- Identifikujte kritické uzly, které ovlivňují více služeb
- Sledujte trendy složitosti kódu

### 🎯 Optimalizace výkonu
- Najděte a refaktorujte vysoce složité funkce
- Detekujte a eliminujte sémantickou duplikaci kódu
- Analyzujte řetězce závislostí na kritická místa

### 🛡️ Kvalita kódu
- Nepřetržité monitorování architektury v režimu watch
- Automatická kontrola dodržování licencí
- Vlastní pravidla na bázi pluginů pro standardy vašeho týmu

---

## 📦 Systémové požadavky

- **Node.js**: 16.0.0 nebo vyšší
- **npm**: 6.0.0 nebo vyšší (nebo yarn/pnpm)
- **OS**: Linux, macOS nebo Windows
- **RAM**: 512MB minimum (1GB+ doporučeno pro velké projekty)

---

## 🤝 Přispívání do projektu

```bash
# Klonujte repozitář
git clone https://github.com/archpulse/codepulse-cli.git
cd codepulse-cli

# Nainstalujte závislosti
npm install

# Spusťte testy
npm test

# Sestavte projekt
npm run build

# Vyzkoušejte lokálně
npm run dev -- scan .
```

---

## 📄 Licence

Licence MIT © 2024 archpulse

Podívejte se na [LICENSE](../LICENSE) pro podrobnosti.

---

<div align="center">

### ⭐ Líbí se vám CodePulse? Dejte nám hvězdu na GitHubu!

**Vytvořeno s ❤️ archpulse**

</div>
