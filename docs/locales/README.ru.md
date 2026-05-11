# 🩺 CodePulse CLI (Русский)

> Глубокий статический анализ и сканирование безопасности для JS/TS проектов. Поиск уязвимостей, горячих точек и визуализация здоровья кода.

[![CodePulse Health](../../badge.svg)](https://github.com/archpulse/codepulse-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

### 🌍 Языки
[English](../../README.md) | [Українська](./README.ua.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md) | [한국어](./README.ko.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md)

---

## Установка

```bash
npm install -g @archpulse/codepulse
```

## Быстрый старт

```bash
codepulse scan .
```

---

## Возможности

- **🎨 Красивый цветной CLI** — С ASCII-артом, баннерами и понятными примерами.
- **🌐 Мультиязычность** — Используйте `--lang` для переключения между 7 языками.
- **📜 Генератор лицензий** — Мгновенное создание 10+ типов Open Source лицензий.
- **🔍 Анализ безопасности** — Поиск уязвимостей, секретов и проблем в зависимостях (SCA).
- **🔥 Поиск Hotspots** — Определение рискованных файлов на основе сложности и активности в Git.

---

## Команды

| Команда | Описание |
|---------|-------------|
| `codepulse scan [dir]` | Полный анализ + HTML отчет + SARIF |
| `codepulse license <type> [name]` | Создать файл LICENSE (mit, apache, bsd...) |
| `codepulse stats [dir]` | Быстрая статистика в консоли |
| `codepulse explain [topic]` | Подробное объяснение найденных проблем |

---

## Локализация

Смена языка интерфейса «на лету»:
```bash
codepulse --help --lang ru
codepulse scan . --lang ru
```
