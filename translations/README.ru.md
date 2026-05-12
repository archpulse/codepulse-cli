# 🩺 CodePulse CLI (Русский)

> Глубокий статический анализ и сканирование безопасности для JS/TS проектов. Поиск уязвимостей, горячих точек и визуализация здоровья кода.

[![CodePulse Health](../badge.svg)](https://github.com/archpulse/codepulse-cli)
[![NPM Version](https://img.shields.io/npm/v/@archpulse/codepulse)](https://www.npmjs.com/package/@archpulse/codepulse)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

### 🌍 Языки
[English](../README.md) | [Українська](./README.ua.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md) | [한국어](./README.ko.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md)

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
- **🔌 Система плагинов** — Расширяйте CodePulse собственными правилами анализа. [Подробнее](../docs/PLUGINS.md).
- **🔍 Анализ безопасности** — Поиск уязвимостей, секретов и проблем в зависимостях (SCA).
- **🔥 Поиск Hotspots** — Определение рискованных файлов на основе сложности и активности в Git.

---

## Скриншоты

### Скриншоты с объяснением программы
![скриншот объяснения программы](../screenshots/report.png)
![скриншот объяснения программы](../screenshots/critical-node.png)
![скриншот объяснения программы](../screenshots/dependency-vulnerability.png)
![скриншот объяснения программы](../screenshots/duplication.png)
![скриншот объяснения программы](../screenshots/god-file.png)
![скриншот объяснения программы](../screenshots/high-complexity.png)
![скриншот объяснения программы](../screenshots/vulnerability.png)

---

## Команды

| Команда | Описание |
|---------|-------------|
| `codepulse scan [dir]` | Полный анализ + HTML отчет + SARIF |
| `codepulse plugins [dir]` | Список всех доступных плагинов с метаданными |
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
