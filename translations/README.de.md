<div align="center">

# 🩺 CodePulse CLI

<img src="../logo.svg" alt="CodePulse Logo" width="120" height="120" style="filter: brightness(0) invert(1);" />

### 🚀 Erweiterte Code-Analyse mit chirurgischer Präzision

**Architektur-Intelligenz • Semantische Analyse • Echtzeit-Überwachung**

Tiefgehende Codestruktur-Analyse für große JS/TS- und Python-Projekte

![CodePulse Health](../badge.svg)
[![NPM Version](https://img.shields.io/npm/v/@archpulse/codepulse?style=for-the-badge&color=0ea5e9)](https://www.npmjs.com/package/@archpulse/codepulse)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/Node-16%2B-brightgreen?style=for-the-badge)](https://nodejs.org/)

---

### 🌍 Sprachen
[English](../README.md) | [Українська](./README.ua.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md) | [한국어](./README.ko.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md)

</div>

---

## ⚡ Schnellstart

### Installation

```bash
npm install -g @archpulse/codepulse
```

### Erste Analyse

```bash
# Analysieren Sie Ihr Projekt
codepulse scan .

# Watch-Modus mit Live-Dashboard
codepulse watch .
```

---

## 🏆 Wettbewerbsvorteil

CodePulse ist das einzige Tool, das **AST-statische Analyse**, **Git-basierte Churn- & Kopplungs-Analyse**, eine **Time Machine zur Verfolgung architektonischer Verschlechterung**, **Runtime-Profiler-Korrelation** und eine **native MCP-Integration für KI-Agenten-Workflows** nahtlos vereint. Während Tools wie SonarQube, CodeClimate oder ESLint Standard-Linting bieten, liefert CodePulse das "fehlende Glied": eine ganzheitliche Sicht darauf, **wie der Code war, wie er ist und wie man ihn jetzt sofort mit KI-Unterstützung repariert.** Wir melden nicht nur technische Schulden – wir identifizieren proaktiv die wirkungsvollsten Refactoring-Pfade, um Ihre Architektur gesund zu halten.

## 🎯 Hauptfunktionen

| Funktion | Beschreibung |
|---------|-------------|
| **🏗️ Architektur-Radar** | Definieren Sie Ebenen und erfassen Sie Grenzverletzungen automatisch |
| **🧠 Semantische Duplikate** | AST-Hashing findet identische Logik, nicht nur identische Zeilen |
| **⚡ Watch-Modus** | Interaktives TUI-Dashboard, das sich während des Codierens aktualisiert |
| **🎨 Schönes CLI** | Reiche Farben, ASCII-Art, klare Beispiele |
| **🌐 7 Sprachen** | Verwenden Sie `--lang` zum Wechsel zwischen Sprachen |
| **📜 Lizenzgenerator** | Erstellen Sie 10+ Arten von Open-Source-Lizenzen sofort |

---

## 📋 Alle Befehle

| Befehl | Beschreibung |
|---------|-------------|
| `codepulse scan [dir]` | Vollständige Analyse + HTML-Bericht + SARIF-Export |
| `codepulse watch [dir]` | Interaktives Live-TUI-Dashboard |
| `codepulse plugins list` | Liste aller verfügbaren Plugins mit Metadaten |
| `codepulse license <type>` | LICENSE-Datei generieren (mit, apache, bsd, gpl usw.) |
| `codepulse stats [dir]` | Schnelle Projektstatistiken in der Konsole |
| `codepulse explain [topic]` | Detaillierte Erklärung spezifischer Probleme |

---

## 🏗️ Architekturregeln

Definieren Sie Ihre Projektstruktur und Grenzen in `.codepulse.json`:

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

## 🔌 Plugin-System

Erstellen Sie benutzerdefinierte Analyseregeln mit CodePulses leistungsstarkem Plugin-System.

### Plugin erstellen

Erstellen Sie ein Plugin im Verzeichnis `~/.config/codepulse/plugins`:

```typescript
import { Rule, AnalysisContext, Issue } from '@archpulse/codepulse';

export default class MyAnalysisPlugin implements Rule {
  name = 'my-custom-plugin';
  description = 'Mein benutzerdefiniertes Analyse-Plugin';
  version = '1.0.0';
  author = 'Ihr Name';
  category = 'code-quality';

  run(context: AnalysisContext): Issue[] {
    // Ihre Analyselogik
    return [];
  }
}
```

### Geladene Plugins anzeigen

```bash
codepulse plugins list
codepulse plugins list --json
```

📚 **[Erfahren Sie mehr über Plugins →](../docs/PLUGINS.md)**

---

## 📚 Dokumentation

- **📐 [Architektur und interne Workflows](../docs/ARCHITECTURE.md)** — Verstehen Sie, wie CodePulse unter der Haube funktioniert
- **🔌 [Plugin-System-Entwicklung](../docs/PLUGINS.md)** — Erstellen Sie Ihre eigenen Analyseregeln

---

## 📸 Visuelle Beispiele

<table>
  <tr>
    <td align="center">
      <img src="../screenshots/report.png" alt="HTML-Bericht" width="250"/>
      <br><strong>HTML-Bericht</strong>
    </td>
    <td align="center">
      <img src="../screenshots/critical-node.png" alt="Kritische Knoten" width="250"/>
      <br><strong>Kritische Abhängigkeiten</strong>
    </td>
    <td align="center">
      <img src="../screenshots/high-complexity.png" alt="Komplexitätsanalyse" width="250"/>
      <br><strong>Komplexitätsanalyse</strong>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="../screenshots/god-file.png" alt="God Files" width="250"/>
      <br><strong>God-File-Erkennung</strong>
    </td>
    <td align="center">
      <img src="../screenshots/duplication.png" alt="Code-Duplikation" width="250"/>
      <br><strong>Semantische Duplikation</strong>
    </td>
    <td align="center">
      <img src="../screenshots/dependency-vulnerability.png" alt="Sicherheitslücken" width="250"/>
      <br><strong>Abhängigkeitsprobleme</strong>
    </td>
  </tr>
</table>

---

## 🌐 Lokalisierung

```bash
# Französisch
codepulse --help --lang fr

# Ukrainisch
codepulse scan . --lang ua

# Deutsch
codepulse watch . --lang de
```

**Unterstützte Sprachen:** English, Українська, Русский, Čeština, 한국어, Deutsch, Français

---

## 💡 Anwendungsfälle

### 🏢 Unternehmensanwendungen
- Setzen Sie Architekturgrenzen in Teams durch
- Identifizieren Sie kritische Knoten, die mehrere Dienste beeinflussen
- Überwachen Sie Code-Komplexitätstrends

### 🎯 Leistungsoptimierung
- Finden und refaktorieren Sie hochkomplexe Funktionen
- Erkennen und beseitigen Sie semantische Code-Duplikation
- Analysieren Sie Abhängigkeitsketten auf Engpässe

### 🛡️ Codequalität
- Kontinuierliche Architekturüberwachung im Watch-Modus
- Automatische Lizenzkonformitätsprüfung
- Plugin-basierte benutzerdefinierte Regeln für Ihre Team-Standards

---

## 📦 Systemanforderungen

- **Node.js**: 16.0.0 oder höher
- **npm**: 6.0.0 oder höher (oder yarn/pnpm)
- **OS**: Linux, macOS oder Windows
- **RAM**: 512MB Minimum (1GB+ empfohlen für große Projekte)

---

## 🤝 Zum Projekt beitragen

```bash
# Repository klonen
git clone https://github.com/archpulse/codepulse-cli.git
cd codepulse-cli

# Abhängigkeiten installieren
npm install

# Tests ausführen
npm test

# Projekt bauen
npm run build

# Lokal testen
npm run dev -- scan .
```

---

## 📄 Lizenz

MIT-Lizenz © 2024 archpulse

Siehe [LICENSE](../LICENSE) für Details.

---

<div align="center">

### ⭐ Gefällt Ihnen CodePulse? Geben Sie uns einen Stern auf GitHub!

**Erstellt mit ❤️ von archpulse**

</div>
