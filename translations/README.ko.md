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

## 🏆 경쟁 우위 (Mythos의 리포트)

CodePulse는 AST 정적 분석, Git 기반 churn 및 결합 분석, 아키텍처 저하 추적을 위한 Time Machine, 런타임 프로파일러 상관관계, 그리고 AI 에이전트 워크플로우를 위한 네이티브 MCP 통합을 매끄럽게 결합한 유일한 도구입니다. SonarQube, CodeClimate 또는 ESLint는 이러한 조합을 제공하지 않으며, CodePulse만이 '과거는 어땠는지, 현재는 어떤지, 그리고 AI를 통해 지금 바로 무엇을 해야 하는지'에 대한 유일무이한 조합을 제공합니다.

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

## 🤖 AI 에이전트 지원 (MCP)

CodePulse는 네이티브 **Model Context Protocol (MCP)** 서버를 포함하고 있어 AI 에이전트(Claude, Cursor 등)가 코드베이스에 대한 심층적인 아키텍처 분석을 수행할 수 있도록 합니다.

### AI 에이전트 설정

```bash
# MCP 설정 및 에이전트 규칙 생성
codepulse setup-mcp
```

이 명령어는 다음을 수행합니다:
1. MCP 호환 AI IDE를 구성합니다.
2. 프로젝트 루트에 `.cursorrules`, `.clinerules`, `CODEX.md`를 생성합니다.
3. AI 비서를 위한 "아키텍처 인텔리전스"를 활성화합니다.

### 사용 가능한 에이전트 도구 (17개 이상의 도구)

| 도구 | 설명 |
|------|-------------|
| `codepulse_identity` | 프로젝트 건강 상태 점검 및 중요 파일 식별 |
| `get_file_context` | 파일 아키텍처 도시에 (연결, 리스크, 복잡성) |
| `predict_change_impact` | 변경 영향 범위 예측 (blast radius) |
| `find_similar_functions` | AST를 통한 구조적 유사성 검색 |
| `suggest_split_strategy` | God Files에 대한 분할 전략 제안 |
| `simulate_edit` | 적용 전 변경 사항 검증 |

---

## 📚 문서

- **📐 [아키텍처 및 내부 워크플로우](../docs/ARCHITECTURE.md)** — CodePulse의 내부 작동 방식 이해
- **🔌 [플러그인 시스템 개발](../docs/PLUGINS.md)** — 자신의 분석 규칙 생성

---

## 🚀 아키텍처 성능

CodePulse는 **아키텍처 인텔리전스 플랫폼**입니다. 표준 린터가 격리된 구문을 분석하는 동안, CodePulse는 전체 프로젝트 구조, 종속성 및 진화적 리스크의 시스템적 상태를 계산합니다.

### 성능 효율성: 시스템 분석 vs 기존 린팅

기존의 정적 린팅(ESLint)을 벤치마크로 사용하여 시스템 분석 엔진의 효율성을 입증합니다.

| 기능 | 기존 정적 린팅 | CodePulse (시스템적) |
|------|:--------------:|:--------------------:|
| **분석 범위** | 파일 단위 | **전체 프로젝트 구조적** |
| **컨텍스트 모델** | 격리된 AST 컨텍스트 | **지속성 프로젝트 그래프** |
| 분석 스타일 | 규칙 지향 | **구조적 + 패턴 인식** |
| **평균 실행 시간** | ~4.8s | **~2.8s** |
| **작업 RAM** | ~103 MB | **~175 MB** |

> **참고**: ESLint는 기능적으로 직접적인 비교 대상이 아니라, 익숙한 파일 기반 정적 분석의 기준점(baseline)으로 사용되었습니다.
> **벤치마크**: 27k LOC 프로젝트 | 5회 평균 | 콜드 런 | Intel i3-1005G1 / 8GB RAM.
> 전체 방법론은 [BENCHMARKS.md](../docs/BENCHMARKS.md)를 참조하세요.

---


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
