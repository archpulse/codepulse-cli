<div align="center">

# 🩺 CodePulse CLI

<img src="../logo.svg" alt="CodePulse Logo" width="120" height="120" style="filter: brightness(0) invert(1);" />

### 🚀 외과적 정확성으로 진행하는 고급 코드 분석

**아키텍처 인텔리전스 • 의미론적 분석 • 실시간 모니터링**

대규모 JS/TS 및 Python 프로젝트를 위한 깊이 있는 코드 구조 분석

![CodePulse Health](../badge.svg)
[![NPM Version](https://img.shields.io/npm/v/@archpulse/codepulse?style=for-the-badge&color=0ea5e9)](https://www.npmjs.com/package/@archpulse/codepulse)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/Node-16%2B-brightgreen?style=for-the-badge)](https://nodejs.org/)

---

### 🌍 언어
[English](../README.md) | [Українська](./README.ua.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md) | [한국어](./README.ko.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md)

</div>

---

## ⚡ 빠른 시작

### 설치

```bash
npm install -g @archpulse/codepulse
```

### 첫 번째 스캔

```bash
# 프로젝트 분석
codepulse scan .

# 라이브 대시보드를 사용한 감시 모드
codepulse watch .
```

---

## 🏆 경쟁 우위 (Mythos의 연구 보고서)

CodePulse는 단순한 린터가 아닙니다. 업계 최초의 **아키텍처 인텔리전스 엔진**입니다. 기존 도구들(ESLint, SonarQube, CodeClimate)이 파일 수준에서 증상 위주의 격리된 검사에 집중하는 반면, CodePulse는 5가지 핵심 데이터 차원을 통합하여 전체적인 아키텍처 관점을 제공합니다:

*   **구조적 AST 분석:** 코드 모듈에 대한 깊이 있는 의미론적 이해.
*   **Git-시계열 분석:** 변경 이력(churn 및 co-change 비율)을 통해 "숨겨진" 결합을 추적.
*   **역사적 Time Machine:** 커밋 이력 전반에 걸친 아키텍처 저하를 시각화.
*   **런타임 상관관계:** 성능 병목 현상을 정적 코드 구조에 매핑.
*   **네이티브 MCP 인텔리전스:** 정밀하고 에이전트 주도적인 리팩토링에 필요한 구조적 컨텍스트를 LLM에 제공.

**"잃어버린 연결 고리":** AI 네이티브 엔지니어링 시대에 AI가 생성하는 결과물의 품질은 AI가 받는 컨텍스트에 의해 제한됩니다. CodePulse는 기본적인 **아키텍처 컨텍스트 제공자(Architectural Context Provider)** 역할을 합니다. 우리는 단순히 기술적 부채를 보고하는 것을 넘어, 가장 효과적인 리팩토링 경로를 사전에 식별하고, LLM이 아키텍처 문제를 외과적 정밀도로 수정하는 데 필요한 정확한 구조적 지도를 제공합니다.

## 🎯 주요 기능

| 기능 | 설명 |
|---------|-------------|
| **🏗️ 아키텍처 레이더** | 레이어를 정의하고 경계 위반을 자동으로 포착 |
| **🧠 의미론적 중복 탐지** | AST 기반 해싱으로 동일한 로직 찾기, 줄 비교 아님 |
| **⚡ 감시 모드** | 코드 작성 중 업데이트되는 대화형 TUI 대시보드 |
| **🎨 아름다운 CLI** | 풍부한 색상, ASCII 아트, 명확한 예제 |
| **🌐 7가지 언어** | `--lang`을 사용하여 언어 간 전환 |
| **📜 라이선스 생성기** | 10+ 오픈소스 라이선스를 즉시 생성 |

---

## 📋 모든 명령어

| 명령어 | 설명 |
|---------|-------------|
| `codepulse scan [dir]` | 완전 분석 + HTML 리포트 + SARIF 내보내기 |
| `codepulse watch [dir]` | 대화형 라이브 TUI 대시보드 |
| `codepulse plugins list` | 메타데이터가 포함된 모든 사용 가능한 플러그인 목록 |
| `codepulse license <type>` | LICENSE 파일 생성 (mit, apache, bsd, gpl 등) |
| `codepulse stats [dir]` | 콘솔의 빠른 프로젝트 통계 |
| `codepulse explain [topic]` | 특정 문제에 대한 상세 설명 |

---

## 🏗️ 아키텍처 규칙

`.codepulse.json`에서 프로젝트 구조 및 경계 정의:

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

## 🔌 플러그인 시스템

CodePulse의 강력한 플러그인 시스템으로 사용자 지정 분석 규칙을 만드세요.

### 플러그인 생성

`~/.config/codepulse/plugins` 디렉토리에 플러그인 생성:

```typescript
import { Rule, AnalysisContext, Issue } from '@archpulse/codepulse';

export default class MyAnalysisPlugin implements Rule {
  name = 'my-custom-plugin';
  description = '나의 사용자 지정 분석 플러그인';
  version = '1.0.0';
  author = '당신의 이름';
  category = 'code-quality';

  run(context: AnalysisContext): Issue[] {
    // 분석 로직
    return [];
  }
}
```

### 로드된 플러그인 보기

```bash
codepulse plugins list
codepulse plugins list --json
```

📚 **[플러그인에 대해 더 알아보기 →](../docs/PLUGINS.md)**

---

## 📚 문서

- **📐 [아키텍처 및 내부 워크플로우](../docs/ARCHITECTURE.md)** — CodePulse의 내부 작동 방식 이해
- **🔌 [플러그인 시스템 개발](../docs/PLUGINS.md)** — 자신의 분석 규칙 생성

---

## 📸 시각적 예제

<table>
  <tr>
    <td align="center">
      <img src="../screenshots/report.png" alt="HTML 리포트" width="250"/>
      <br><strong>HTML 리포트</strong>
    </td>
    <td align="center">
      <img src="../screenshots/critical-node.png" alt="주요 노드" width="250"/>
      <br><strong>중요 종속성</strong>
    </td>
    <td align="center">
      <img src="../screenshots/high-complexity.png" alt="복잡성 분석" width="250"/>
      <br><strong>복잡성 분석</strong>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="../screenshots/god-file.png" alt="God Files" width="250"/>
      <br><strong>God File 탐지</strong>
    </td>
    <td align="center">
      <img src="../screenshots/duplication.png" alt="코드 중복" width="250"/>
      <br><strong>의미론적 중복</strong>
    </td>
    <td align="center">
      <img src="../screenshots/dependency-vulnerability.png" alt="취약점" width="250"/>
      <br><strong>종속성 문제</strong>
    </td>
  </tr>
</table>

---

## 🌐 로컬라이제이션

```bash
# 프랑스어
codepulse --help --lang fr

# 우크라이나어
codepulse scan . --lang ua

# 독일어
codepulse watch . --lang de
```

**지원되는 언어:** English, Українська, Русский, Čeština, 한국어, Deutsch, Français

---

## 💡 사용 사례

### 🏢 엔터프라이즈 애플리케이션
- 팀 전체에서 아키텍처 경계 적용
- 여러 서비스에 영향을 주는 중요 노드 식별
- 코드 복잡도 추세 모니터링

### 🎯 성능 최적화
- 고복잡도 함수 찾기 및 리팩토링
- 의미론적 코드 중복 탐지 및 제거
- 병목 현상을 위한 종속성 체인 분석

### 🛡️ 코드 품질
- 감시 모드에서 지속적인 아키텍처 모니터링
- 자동 라이선스 준수 확인
- 팀 표준을 위한 플러그인 기반 사용자 지정 규칙

---

## 📦 시스템 요구사항

- **Node.js**: 16.0.0 이상
- **npm**: 6.0.0 이상 (또는 yarn/pnpm)
- **OS**: Linux, macOS 또는 Windows
- **RAM**: 최소 512MB (대형 프로젝트의 경우 1GB+ 권장)

---

## 🤝 프로젝트 기여

```bash
# 저장소 복제
git clone https://github.com/archpulse/codepulse-cli.git
cd codepulse-cli

# 종속성 설치
npm install

# 테스트 실행
npm test

# 프로젝트 구축
npm run build

# 로컬에서 시도
npm run dev -- scan .
```

---

## 📄 라이선스

MIT 라이선스 © 2024 archpulse

자세한 내용은 [LICENSE](../LICENSE)를 참조하세요.

---

<div align="center">

### ⭐ CodePulse가 마음에 드나요? GitHub에서 별을 주세요!

**archpulse가 ❤️로 만들었습니다**

</div>
