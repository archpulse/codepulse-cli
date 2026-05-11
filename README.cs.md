# 🩺 CodePulse CLI (Čeština)

> Hloubková statická analýza a skenování bezpečnosti pro projekty JS/TS. Hledání zranitelností, detekce hotspotů a vizualizace zdraví kódu.

[![CodePulse Health](https://img.shields.io/badge/CodePulse-Healthy-brightgreen)](https://github.com/archpulse/codepulse-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

### 🌍 Jazyky
[English](./README.md) | [Українська](./README.ua.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md) | [한국어](./README.ko.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md)

---

## Instalace

```bash
npm install -g @archpulse/codepulse
```

## Rychlý start

```bash
codepulse scan .
```

---

## Funkce

- **🎨 Krásné barevné CLI** — Vylepšeno o ASCII art a jasné příklady.
- **🌐 Podpora více jazyků** — Použijte `--lang` pro přepínání mezi 7 jazyky.
- **📜 Generátor licencí** — Okamžité vytvoření více než 10 typů open-source licencí.
- **🔍 Bezpečnostní analýza** — Detekuje zranitelnosti a problémy v závislostech (SCA).
- **🔥 Detekce hotspotů** — Najde rizikové soubory na základě složitosti a git churnu.

---

## Příkazy

| Příkaz | Popis |
|---------|-------------|
| `codepulse scan [dir]` | Kompletní analýza + HTML report + SARIF |
| `codepulse license <type> [name]` | Vygenerovat soubor LICENSE (mit, apache, bsd...) |
| `codepulse stats [dir]` | Rychlé statistiky v konzoli |
| `codepulse explain [topic]` | Detailní vysvětlení problémů |

---

## Lokalizace

Změna jazyka CLI za běhu:
```bash
codepulse --help --lang cs
codepulse scan . --lang cs
```
