# 🩺 CodePulse CLI (Deutsch)

> Erweiterte statische Analyse und Sicherheitsscan für JS/TS-Projekte. Finden Sie Schwachstellen, erkennen Sie Hotspots und visualisieren Sie die Code-Integrität.

[![CodePulse Health](../../badge.svg)](https://github.com/archpulse/codepulse-cli)
[![NPM Version](https://img.shields.io/npm/v/@archpulse/codepulse)](https://www.npmjs.com/package/@archpulse/codepulse)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

### 🌍 Sprachen
[English](../../README.md) | [Українська](./README.ua.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md) | [한국어](./README.ko.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md)

---

## Installation

```bash
npm install -g @archpulse/codepulse
```

## Schnellstart

```bash
codepulse scan .
```

---

## Funktionen

- **🎨 Schönes farbiges CLI** — Erweitert um ASCII-Art, Banner und klare Beispiele.
- **🌐 Mehrsprachige Unterstützung** — Verwenden Sie `--lang`, um zwischen 7 Sprachen zu wechseln.
- **📜 Lizenzgenerator** — Erstellen Sie sofort über 10 Arten von Open-Source-Lizenzen.
- **🔌 Plugin-System** — Erweitern Sie CodePulse mit benutzerdefinierten Analyseregeln. [Weitere Informationen](../PLUGINS.md).
- **🔍 Sicherheitsanalyse** — Erkennt Schwachstellen, hartcodierte Geheimnisse und SCA-Probleme.
- **🔥 Hotspot-Erkennung** — Findet riskante Dateien basierend auf Komplexität und Git-Aktivität.

---

## Befehle

| Befehl | Beschreibung |
|---------|-------------|
| `codepulse scan [dir]` | Vollständige Analyse + HTML-Bericht + SARIF |
| `codepulse plugins [dir]` | Liste aller verfügbaren Plugins mit Metadaten |
| `codepulse license <type> [name]` | Generieren Sie eine LICENSE-Datei (mit, apache, bsd...) |
| `codepulse stats [dir]` | Schnelle Statistiken in der Konsole |
| `codepulse explain [topic]` | Detaillierte Erläuterung von Problemen |

---

## Lokalisierung

CLI-Sprache im laufenden Betrieb ändern:
```bash
codepulse --help --lang de
codepulse scan . --lang de
```
