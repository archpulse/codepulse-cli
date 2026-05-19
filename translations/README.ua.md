<div align="center">

# 🩺 CodePulse CLI

<img src="../logo.svg" alt="CodePulse Logo" width="120" height="120" style="filter: brightness(0) invert(1);" />

### 🚀 Просунутий архітектурний аналіз з хірургічною точністю

**Архітектурна розвідка • Семантичний аналіз • Моніторинг у реальному часі**

Глибокий аналіз структури коду для великих JS/TS та Python проектів

![CodePulse Health](../badge.svg)
[![NPM Version](https://img.shields.io/npm/v/@archpulse/codepulse?style=for-the-badge&color=0ea5e9)](https://www.npmjs.com/package/@archpulse/codepulse)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/Node-16%2B-brightgreen?style=for-the-badge)](https://nodejs.org/)

---

### 🌍 Мови
[English](../README.md) | [Українська](./README.ua.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md) | [한국어](./README.ko.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md)

</div>

---

## ⚡ Швидкий старт

### Встановлення

```bash
npm install -g @archpulse/codepulse
```

### Перший сканування

```bash
# Аналізуйте ваш проект
codepulse scan .

# Режим watch з живим дашбордом
codepulse watch .
```

---

## 🚀 Архітектурна продуктивність

CodePulse — це **платформа архітектурного інтелекту**. У той час як звичайні лінтери аналізують ізольований синтаксис, CodePulse обчислює системний стан усієї структури проекту, його залежностей та еволюційних ризиків.

### Ефективність: Системний аналіз vs Традиційний лінтинг

Ми використовуємо традиційний статичний лінтинг (ESLint) як базовий рівень (baseline), щоб продемонструвати ефективність нашого системного движка.

| Можливості | Традиційний лінтинг | CodePulse (Системний) |
|------------|:-------------------:|:---------------------:|
| **Область аналізу** | Пофайловий | **Структурний (весь проект)** |
| **Модель контексту**| Ізольований AST-контекст | **Персистентний граф проекту** |
| Стиль аналізу | Орієнтований на правила| **Структурний + паттерни** |
| **Середній час** | ~4.8 сек | **~2.8 сек** |
| **Робоча RAM** | ~103 MB | **~175 MB** |

> **Примітка**: ESLint використовується тут як звичний базовий рівень пофайлового статичного аналізу, а не як прямий функціональний аналог.
> **Бенчмарк**: Проект на 27k LOC | середнє за 5 запусків | холодні запуски | Intel i3-1005G1 / 8GB RAM.
> Повний опис методології — у [BENCHMARKS.md](../docs/BENCHMARKS.md).

CodePulse — єдиний інструмент, що об'єднує статичний аналіз AST, аналітику історії Git (churn + temporal coupling), «Time Machine» для візуалізації архітектурної деградації, кореляцію з рантайм-профайлером та нативну інтеграцію з AI-агентами через MCP. На відміну від SonarQube, CodeClimate чи ESLint, CodePulse дає унікальну комбінацію: «як було, як є і що з цим робити прямо зараз за допомогою AI».

## 🎯 Основні можливості

| Можливість | Опис |
|---------|-------------|
| **🏗️ Архітектурний радар** | Визначайте шари та автоматично ловіть порушення меж |
| **🧠 Семантичні дублікати** | AST-хешування знаходить однакову логіку, не просто рядки |
| **⚡ Режим Watch** | Інтерактивний TUI дашборд, який оновлюється під час кодування |
| **🎨 Красивий CLI** | Багаті кольори, ASCII-арт, ясні приклади |
| **🌐 7 мов** | Використовуйте `--lang` для перемикання між мовами |
| **📜 Генератор ліцензій** | Створіть 10+ типів open-source ліцензій миттєво |

---

## 📋 Усі команди

| Команда | Опис |
|---------|-------------|
| `codepulse scan [dir]` | Повний аналіз + HTML звіт + SARIF експорт |
| `codepulse watch [dir]` | Інтерактивний живий TUI дашборд |
| `codepulse plugins list` | Список всіх доступних плагінів з метаданими |
| `codepulse license <type>` | Згенерувати LICENSE файл (mit, apache, bsd, gpl тощо) |
| `codepulse stats [dir]` | Швидка статистика проекту в консолі |
| `codepulse explain [topic]` | Детальне пояснення конкретних проблем |

---

## 🏗️ Архітектурні правила

Визначте структуру вашого проекту та межі в `.codepulse.json`:

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

## 🔌 Система плагінів

Створюйте користувацькі правила аналізу з потужною системою плагінів CodePulse.

### Створення плагіну

Створіть плагін у директорії `~/.config/codepulse/plugins`:

```typescript
import { Rule, AnalysisContext, Issue } from '@archpulse/codepulse';

export default class MyAnalysisPlugin implements Rule {
  name = 'my-custom-plugin';
  description = 'Мій користувацький плагін аналізу';
  version = '1.0.0';
  author = 'Ваше ім\'я';
  category = 'code-quality';

  run(context: AnalysisContext): Issue[] {
    // Ваша логіка аналізу
    return [];
  }
}
```

### Перегляд завантажених плагінів

```bash
codepulse plugins list
codepulse plugins list --json
```

📚 **[Дізнайтеся більше про плагіни →](../docs/PLUGINS.md)**

---

## 🤖 Підтримка AI-агентів (MCP)

CodePulse включає нативний сервер **Model Context Protocol (MCP)**, що дозволяє AI-агентам (таким як Claude, Cursor та інші) виконувати глибокий архітектурний аналіз вашого коду.

### Налаштування для AI-агентів

```bash
# Генерація конфігурації MCP та правил для агентів
codepulse setup-mcp
```

Ця команда виконає:
1. Налаштування вашої MCP-сумісної AI IDE.
2. Генерацію `.cursorrules`, `.clinerules` та `CODEX.md` у корені вашого проекту.
3. Включення «архітектурного інтелекту» для вашого AI-помічника.

### Доступні інструменти агента (17+ інструментів)

| Інструмент | Опис |
|------|-------------|
| `codepulse_identity` | Оцінка здоров'я проєкту та виявлення критичних файлів |
| `get_file_context` | Архітектурне досьє файлу (зв'язки, ризик, складність) |
| `predict_change_impact` | Прогноз впливу змін на систему (blast radius) |
| `find_similar_functions` | Пошук семантично схожої логіки через AST |
| `suggest_split_strategy` | Стратегія розділення God Files |
| `simulate_edit` | Валідація змін перед їх застосуванням |

---

## 📚 Документація

- **📐 [Архітектура та внутрішні робочі процеси](../docs/ARCHITECTURE.md)** — Зрозумійте, як CodePulse працює під капотом
- **🔌 [Розробка системи плагінів](../docs/PLUGINS.md)** — Створюйте свої правила аналізу

---

## 📸 Візуальні приклади

<table>
  <tr>
    <td align="center">
      <img src="../screenshots/report.png" alt="HTML звіт" width="250"/>
      <br><strong>HTML звіт</strong>
    </td>
    <td align="center">
      <img src="../screenshots/critical-node.png" alt="Критичні вузли" width="250"/>
      <br><strong>Критичні залежності</strong>
    </td>
    <td align="center">
      <img src="../screenshots/high-complexity.png" alt="Аналіз складності" width="250"/>
      <br><strong>Аналіз складності</strong>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="../screenshots/god-file.png" alt="God Files" width="250"/>
      <br><strong>Виявлення God Files</strong>
    </td>
    <td align="center">
      <img src="../screenshots/duplication.png" alt="Дублювання коду" width="250"/>
      <br><strong>Семантичне дублювання</strong>
    </td>
    <td align="center">
      <img src="../screenshots/dependency-vulnerability.png" alt="Вразливості" width="250"/>
      <br><strong>Проблеми залежностей</strong>
    </td>
  </tr>
</table>

---

## 🌐 Локалізація

```bash
# Французька
codepulse --help --lang fr

# Українська
codepulse scan . --lang ua

# Німецька
codepulse watch . --lang de
```

**Підтримувані мови:** English, Українська, Русский, Čeština, 한국어, Deutsch, Français

---

## 💡 Варіанти використання

### 🏢 Корпоративні додатки
- Забезпечуйте архітектурні межі в командах
- Визначайте критичні вузли, які впливають на кілька служб
- Моніторте тенденції складності коду

### 🎯 Оптимізація продуктивності
- Знайдіть та рефакторизуйте високоскладні функції
- Виявте та усуньте семантичне дублювання коду
- Аналізуйте ланцюги залежностей для вузьких місць

### 🛡️ Якість коду
- Безперервний моніторинг архітектури в режимі watch
- Автоматична перевірка дотримання ліцензій
- Користувацькі правила на базі плагінів для стандартів вашої команди

---

## 📦 Системні вимоги

- **Node.js**: 16.0.0 або вище
- **npm**: 6.0.0 або вище (або yarn/pnpm)
- **ОС**: Linux, macOS або Windows
- **RAM**: 512MB мінімум (1GB+ рекомендується для великих проектів)

---

## 🤝 Внесення до проекту

```bash
# Клонуйте репозиторій
git clone https://github.com/archpulse/codepulse-cli.git
cd codepulse-cli

# Встановіть залежності
npm install

# Запустіть тести
npm test

# Зберіть проект
npm run build

# Спробуйте локально
npm run dev -- scan .
```

---

## 📄 Ліцензія

MIT ліцензія © 2024 archpulse

Дивіться [LICENSE](../LICENSE) для деталей.

---

<div align="center">

### ⭐ Подобається CodePulse? Дайте нам зірку на GitHub!

**Зроблено з ❤️ archpulse**

</div>
