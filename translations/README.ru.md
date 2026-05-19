<div align="center">

# 🩺 CodePulse CLI

<img src="../logo.svg" alt="CodePulse Logo" width="120" height="120" style="filter: brightness(0) invert(1);" />

### 🚀 Продвинутый анализ кода с хирургической точностью

**Архитектурный интеллект • Семантический анализ • Мониторинг в реальном времени**

Глубокий анализ структуры кода для больших JS/TS и Python проектов

**v5 Engineering Honesty: Представляем нелинейную модель оценки и метрику 🛡️ Доверия (Confidence Score).**

![CodePulse Health](../badge.svg)
[![NPM Version](https://img.shields.io/npm/v/@archpulse/codepulse?style=for-the-badge&color=0ea5e9)](https://www.npmjs.com/package/@archpulse/codepulse)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/Node-16%2B-brightgreen?style=for-the-badge)](https://nodejs.org/)

---

### 🌍 Языки
[English](../README.md) | [Українська](./README.ua.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md) | [한국어](./README.ko.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md)

</div>

---

## ⚡ Быстрый старт

### Установка

```bash
npm install -g @archpulse/codepulse
```

### Первое сканирование

```bash
# Анализируйте ваш проект
codepulse scan .

# Режим watch с живым дашбордом
codepulse watch .
```

---

## 🚀 Архитектурная производительность

CodePulse — это **платформа архитектурного интеллекта**. В то время как обычные линтеры анализируют изолированный синтаксис, CodePulse вычисляет системное состояние всей структуры проекта, его зависимостей и эволюционных рисков.

### Эффективность: Системный анализ vs Традиционный линтинг

Мы используем традиционный статический линтинг (ESLint) в качестве базового уровня (baseline), чтобы продемонстрировать эффективность нашего системного движка.

| Возможности | Традиционный линтинг | CodePulse (Системный) |
|-------------|:--------------------:|:---------------------:|
| **Область анализа** | Пофайловый | **Структурный (весь проект)** |
| **Модель контекста**| Изолированный AST-контекст | **Персистентный граф проекта** |
| Стиль анализа | Ориентирован на правила| **Структурный + паттерны** |
| **Среднее время** | ~4.8 сек | **~2.8 сек** |
| **Рабочая RAM** | ~103 MB | **~175 MB** |

> **Примечание**: ESLint используется здесь как привычный базовый уровень пофайлового статического анализа, а не как прямой функциональный аналог.
> **Бенчмарк**: Проект на 27k LOC | среднее за 5 запусков | холодные запуски | Intel i3-1005G1 / 8GB RAM.
> Полное описание методологии — в [BENCHMARKS.md](../docs/BENCHMARKS.md).

---

## 🏆 Конкурентное преимущество (Отчет от Mythos)

CodePulse — единственный инструмент, объединяющий статический анализ AST, git-историческую аналитику (churn + temporal coupling), Time Machine для визуализации архитектурной деградации, корреляцию с runtime профайлером и нативную интеграцию с AI-агентами через MCP. Ни SonarQube, ни CodeClimate, ни ESLint не дают этой комбинации: «как было, как есть и что с этим делать прямо сейчас через AI».

## 🎯 Основные возможности

| Возможность | Описание |
|---------|-------------|
| **🏗️ Архитектурный радар** | Определяйте слои и автоматически ловите нарушения границ |
| **🧠 Семантические дубликаты** | AST-хеширование находит одинаковую логику, не просто строки |
| **⚡ Режим Watch** | Интерактивный TUI дашборд, который обновляется при кодировании |
| **🎨 Красивый CLI** | Богатые цвета, ASCII-арт, ясные примеры |
| **🌐 7 языков** | Используйте `--lang` для переключения между языками |
| **📜 Генератор лицензий** | Создайте 10+ типов open-source лицензий мгновенно |

---

## 📋 Все команды

| Команда | Описание |
|---------|-------------|
| `codepulse scan [dir]` | Полный анализ + HTML отчет + SARIF экспорт |
| `codepulse watch [dir]` | Интерактивный живой TUI дашборд |
| `codepulse plugins list` | Список всех доступных плагинов с метаданными |
| `codepulse license <type>` | Сгенерировать LICENSE файл (mit, apache, bsd, gpl и т.д.) |
| `codepulse stats [dir]` | Быстрая статистика проекта в консоли |
| `codepulse explain [topic]` | Подробное объяснение конкретных проблем |

---

## 🏗️ Архитектурные правила

Определите структуру вашего проекта и границы в `.codepulse.json`:

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

## 🔌 Система плагинов

Создавайте пользовательские правила анализа с мощной системой плагинов CodePulse.

### Создание плагина

Создайте плагин в директории `~/.config/codepulse/plugins`:

```typescript
import { Rule, AnalysisContext, Issue } from '@archpulse/codepulse';

export default class MyAnalysisPlugin implements Rule {
  name = 'my-custom-plugin';
  description = 'Мой пользовательский плагин анализа';
  version = '1.0.0';
  author = 'Ваше имя';
  category = 'code-quality';

  run(context: AnalysisContext): Issue[] {
    // Ваша логика анализа
    return [];
  }
}
```

### Просмотр загруженных плагинов

```bash
codepulse plugins list
codepulse plugins list --json
```

📚 **[Узнайте больше о плагинах →](../docs/PLUGINS.md)**

---

## 🤖 Поддержка AI-агентов (MCP)

CodePulse включает нативный сервер **Model Context Protocol (MCP)**, позволяющий AI-агентам (таким как Claude, Cursor и другие) выполнять глубокий архитектурный анализ вашего кода.

### Настройка для AI-агентов

```bash
# Генерация конфигурации MCP и правил для агентов
codepulse setup-mcp
```

Эта команда выполнит:
1. Настройку вашей MCP-совместимой AI IDE.
2. Генерацию `.cursorrules`, `.clinerules` и `CODEX.md` в корне вашего проекта.
3. Включение «архитектурного интеллекта» для вашего AI-помощника.

### Доступные инструменты агента (17+ инструментов)

| Инструмент | Описание |
|------|-------------|
| `codepulse_identity` | Оценка здоровья проекта и выявление критических файлов |
| `get_file_context` | Архитектурное досье файла (связи, риск, сложность) |
| `predict_change_impact` | Прогноз влияния изменений на систему (blast radius) |
| `find_similar_functions` | Поиск семантически похожей логики через AST |
| `suggest_split_strategy` | Стратегия разделения God Files |
| `simulate_edit` | Валидация изменений перед их применением |

---

## 📚 Документация

- **📐 [Архитектура и внутренние рабочие процессы](../docs/ARCHITECTURE.md)** — Поймите, как CodePulse работает под капотом
- **🔌 [Разработка системы плагинов](../docs/PLUGINS.md)** — Создавайте свои правила анализа

---

## 📸 Визуальные примеры

<table>
  <tr>
    <td align="center">
      <img src="../screenshots/report.png" alt="HTML отчет" width="250"/>
      <br><strong>HTML отчет</strong>
    </td>
    <td align="center">
      <img src="../screenshots/critical-node.png" alt="Критические узлы" width="250"/>
      <br><strong>Критические зависимости</strong>
    </td>
    <td align="center">
      <img src="../screenshots/high-complexity.png" alt="Анализ сложности" width="250"/>
      <br><strong>Анализ сложности</strong>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="../screenshots/god-file.png" alt="God Files" width="250"/>
      <br><strong>Обнаружение God Files</strong>
    </td>
    <td align="center">
      <img src="../screenshots/duplication.png" alt="Дублирование кода" width="250"/>
      <br><strong>Семантическое дублирование</strong>
    </td>
    <td align="center">
      <img src="../screenshots/dependency-vulnerability.png" alt="Уязвимости" width="250"/>
      <br><strong>Проблемы зависимостей</strong>
    </td>
  </tr>
</table>

---

## 🌐 Локализация

```bash
# Французский
codepulse --help --lang fr

# Украинский
codepulse scan . --lang ua

# Немецкий
codepulse watch . --lang de
```

**Поддерживаемые языки:** English, Українська, Русский, Čeština, 한국어, Deutsch, Français

---

## 💡 Варианты использования

### 🏢 Корпоративные приложения
- Обеспечивайте архитектурные границы в командах
- Определяйте критические узлы, влияющие на несколько сервисов
- Мониторьте тенденции сложности кода

### 🎯 Оптимизация производительности
- Найдите и рефакторизуйте высокосложные функции
- Обнаружите и устраните семантическое дублирование кода
- Анализируйте цепи зависимостей для узких мест

### 🛡️ Качество кода
- Непрерывный мониторинг архитектуры в режиме watch
- Автоматическая проверка соответствия лицензиям
- Пользовательские правила на основе плагинов для стандартов вашей команды

---

## 📦 Системные требования

- **Node.js**: 16.0.0 или выше
- **npm**: 6.0.0 или выше (или yarn/pnpm)
- **ОС**: Linux, macOS или Windows
- **RAM**: 512MB минимум (1GB+ рекомендуется для больших проектов)

---

## 🤝 Вклад в проект

```bash
# Клонируйте репозиторий
git clone https://github.com/archpulse/codepulse-cli.git
cd codepulse-cli

# Установите зависимости
npm install

# Запустите тесты
npm test

# Соберите проект
npm run build

# Попробуйте локально
npm run dev -- scan .
```

---

## 📄 Лицензия

MIT лицензия © 2024 archpulse

Смотрите [LICENSE](../LICENSE) для деталей.

---

<div align="center">

### ⭐ Нравится CodePulse? Дайте нам звезду на GitHub!

**Сделано с ❤️ archpulse**

</div>
