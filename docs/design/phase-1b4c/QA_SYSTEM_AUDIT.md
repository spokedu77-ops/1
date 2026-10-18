# Phase 1-B4C — QA_SYSTEM_AUDIT

| 페이즈 | 스크립트 | 기존 PASS 주장 | 감사 판정 | 누락 검사 |
|---|---|---|---|---|
| B1 | NOT_AVAILABLE (전용 gate 없음) | 문서 | NOT_VERIFIED | CSS class contract |
| B2B | NOT_AVAILABLE | 문서 | NOT_VERIFIED | Section layout |
| B3B | NOT_AVAILABLE | 문서 | NOT_VERIFIED | LAB contain |
| B4A | `phase-1b4a-main-recovery/run-qa.mjs` | Hero metrics | **INCOMPLETE** | Gateway/Records |
| B4B | `phase-1b4b/run-qa.mjs` | Hero 10폭 | **FALSE_PASS** (잠재) | CSS Modules 26 누락 미탐 |

## 공통 구조적 결함

1. **Build PASS ≠ 시각 PASS**
2. DOM/이미지 개수만 확인 → **computed layout·border 미확인**
3. CSS Modules **소스↔TSX 정합성 검사 없음**
4. 구 서버/ stale `.next` → `INVALID_ENVIRONMENT` 위험 (B4A 교훈)
5. 1차 QA 결과를 2차가 JSON 재독만 — **금지** → `home-qa-audit.mjs`는 live DOM 재조회

## B4C 개선

| 스크립트 | 역할 |
|---|---|
| `home-css-contract.mjs` | STATIC, exit 1 on missing |
| `home-visual-qa.mjs` | RUNTIME layout + captures |
| `home-qa-audit.mjs` | 독립 live 카운트 vs evidence |

## HERO_CTA 버그 수정

초版 visual QA는 스크롤 후 음수 `getBoundingClientRect`로 CTA PASS 오판 → **scroll(0,0)+top≥0** 조건 추가.
