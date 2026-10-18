# Phase 1-B4A Main Recovery — PREFLIGHT_REPORT

**일시:** 2026-10-17 (KST)
**상태:** `PREFLIGHT_PASS_WITH_DOM_NOTE` (작업 진행 허용)

## 1-1. Git

| 항목 | 값 |
|------|-----|
| 저장소 | `https://github.com/spokedu77-ops/1.git` |
| 루트 | `C:/Users/joker/Documents/GitHub/1` |
| 브랜치 | `main` |
| HEAD | `c1a7ec52691f0f710e51a15aeb359e8eb7b55e76` |
| porcelain (작업 시작) | clean → 이후 Hero CSS 1줄만 수정 |

## 1-2. 이전 페이즈 구현

| 영역 | 결과 | 근거 |
|------|------|------|
| Hero 한글 H1 + `heroEnglish` | PASS | `home-hero.tsx` |
| Hero DOM (`heroText` 래퍼) | **NOTE** | **커밋된 main에는 `heroText` 클래스 없음.** CTA는 `heroCopy` 내부. 태블릿 2열은 `heroCopy` \| `heroVisual` Grid로 구현됨. |
| Gateway B1 (카드 3) | PASS | `service-gateway.tsx` — `GATEWAY_CARDS` 3개 |
| Method B2B | PASS | `spokedu-method.tsx` |
| Records B2B | PASS | `field-records.tsx` |
| SPOMOVE B3B | PASS | `spomove-stage.tsx` — SEE·DECIDE·MOVE |
| LAB B3B | PASS | `master-stage.tsx` — 숫자 없는 라이브러리 설명 |

`PREVIOUS_PHASE_NOT_PRESENT` 해당 없음.

## 1-3. CSS 충돌

| 항목 | 값 |
|------|-----|
| 대상 | `app/spokedu/components/home-web/home-web.module.css` |
| SHA-256 (수정 직전, HEAD 기준) | `0a1a6bee` 인덱스 기준 — 작업 전 워킹 트리 clean |
| 이번 diff | 태블릿 `@media (768–1023)` 내 `.heroEnglish`에 `color: var(--blue)` 1줄 |
| Hero 외 선택자 | 변경 없음 |
| 충돌 | 없음 (`CSS_CHANGE_CONFLICT` 아님) |

## 1-4. B4A 태블릿 2열 기존 여부

HEAD에 이미 `@media (min-width: 768px) and (max-width: 1023px)` Hero 2열 블록 존재.

- 768~1023: 2열 Grid, CTA가 왼쪽 copy 영역, 4:3 이미지
- 이번 세션 추가: 영문 Display 태블릿 **Brand Blue** (`var(--blue)`) — B1 색상 규격 정합

## 최종

**작업 시작 가능:** 예 (CSS-only 미세 보정 + 독립 QA)
