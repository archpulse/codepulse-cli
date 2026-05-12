# 🩺 CodePulse CLI (한국어)

> JS/TS 프로젝트를 위한 고급 정적 분석 및 보안 스캐닝. 취약점 탐지, 핫스팟 식별 및 코드 상태 시각화.

[![CodePulse Health](../badge.svg)](https://github.com/archpulse/codepulse-cli)
[![NPM Version](https://img.shields.io/npm/v/@archpulse/codepulse)](https://www.npmjs.com/package/@archpulse/codepulse)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

### 🌍 언어
[English](../README.md) | [Українська](./README.ua.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md) | [한국어](./README.ko.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md)

---

## 설치

```bash
npm install -g @archpulse/codepulse
```

## 빠른 시작

```bash
codepulse scan .
```

---

## 주요 기능

- **🎨 아름답고 화려한 CLI** — ASCII 아트, 배너 및 명확한 예시로 강화되었습니다.
- **🌐 다국어 지원** — `--lang`을 사용하여 7개 언어 간에 전환할 수 있습니다.
- **📜 라이선스 생성기** — 10종 이상의 오픈 소스 라이선스를 즉시 생성합니다.
- **🔌 플러그인 시스템** — 사용자 정의 분석 규칙으로 CodePulse를 확장합니다. [자세히 알아보기](../docs/PLUGINS.md).
- **🔍 보안 분석** — 취약점, 비밀 정보 및 종속성 문제(SCA)를 탐지합니다.
- **🔥 핫스팟 탐지** — 복잡성과 Git 활동을 기반으로 위험한 파일을 찾습니다.

---

## Screenshots

### 프로그램 설명 스크린샷
![프로그램 설명 스크린샷](../screenshots/report.png)
![프로그램 설명 스크린샷](../screenshots/critical-node.png)
![프로그램 설명 스크린샷](../screenshots/dependency-vulnerability.png)
![프로그램 설명 스크린샷](../screenshots/duplication.png)
![프로그램 설명 스크린샷](../screenshots/god-file.png)
![프로그램 설명 스크린샷](../screenshots/high-complexity.png)
![프로그램 설명 스크린샷](../screenshots/vulnerability.png)

---

## 명령어

| 명령어 | 설명 |
|---------|-------------|
| `codepulse scan [dir]` | 전체 분석 + HTML 보고서 + SARIF |
| `codepulse plugins [dir]` | 메타데이터가 포함된 모든 사용 가능한 플러그인 목록 |
| `codepulse license <type> [name]` | LICENSE 파일 생성 (mit, apache, bsd...) |
| `codepulse stats [dir]` | 콘솔에서 빠른 통계 확인 |
| `codepulse explain [topic]` | 문제에 대한 상세 설명 |

---

## 로컬라이제이션

실시간 언어 변경:
```bash
codepulse --help --lang ko
codepulse scan . --lang ko
```
