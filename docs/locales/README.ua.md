# 🩺 CodePulse CLI (Українська)

> Глибокий статичний аналіз та сканування безпеки для JS/TS проектів. Пошук вразливостей, гарячих точок та візуалізація здоров'я коду.

[![CodePulse Health](../../badge.svg)](https://github.com/archpulse/codepulse-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

### 🌍 Мови
[English](../../README.md) | [Українська](./README.ua.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md) | [한국어](./README.ko.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md)

---

## Встановлення

```bash
npm install -g @archpulse/codepulse
```

## Швидкий старт

```bash
codepulse scan .
```

---

## Можливості

- **🎨 Красивий кольоровий CLI** — З ASCII-артом, баннерами та зрозумілими прикладами.
- **🌐 Мультимовність** — Використовуйте `--lang` для перемикання між 7 мовами.
- **📜 Генератор ліцензій** — Миттєве створення 10+ типів Open Source ліцензій.
- **🔌 Система плагінів** — Розширюйте CodePulse власними правилами аналіза. [Докладніше](../PLUGINS.md).
- **🔍 Аналіз безпеки** — Пошук вразливостей, секретів та проблем у залежностях (SCA).
- **🔥 Пошук Hotspots** — Визначення ризикованих файлів на основі складності та активності в Git.

---

## Команди

| Команда | Опис |
|---------|-------------|
| `codepulse scan [dir]` | Повний аналіз + HTML звіт + SARIF |
| `codepulse plugins [dir]` | Список усіх доступних плагінів з метаданими |
| `codepulse license <type> [name]` | Створити файл LICENSE (mit, apache, bsd...) |
| `codepulse stats [dir]` | Швидка статистика в консолі |
| `codepulse explain [topic]` | Детальне пояснення знайдених проблем |

---

## Локалізація

Зміна мови інтерфейсу «на льоту»:
```bash
codepulse --help --lang ua
codepulse scan . --lang ua
```
