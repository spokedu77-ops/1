# Phase 1-B4C — CSS_INTEGRITY_AUDIT

## 검사 방법

`docs/design/phase-1b4c/home-css-contract.mjs` — 8개 홈 TSX의 `styles.xxx` vs `home-web.module.css` 선택자.

## 복구 전

| 항목 | 값 |
|------|-----|
| 총 참조 | 117 |
| 누락 | **26** |
| 증거 | `baseline-css-contract.json` |
| exit code | **1** |

누락 목록: Gateway 13, Method 2, Records 8, SPOMOVE 1, LAB 2 (로컬 재검사와 일치).

## 복구 후

| 항목 | 값 |
|------|-----|
| 누락 | **0** |
| 증거 | `post-css-contract.json` |
| exit code | **0** |

## 빌드 CSS Modules

Production build 후 Playwright computed style로 Gateway `borderWidth: 1px`, Records `infoBg` 패널, LAB `object-fit: contain`(390) 확인 (`QA_EVIDENCE.json`).

## Hero

B4B Hero MQ·DOM 규칙 **유지** (복구 diff에 Hero 변경이 포함될 수 있으나 B4B 의도와 충돌 없음).
