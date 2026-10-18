# Phase 2-A — PREFLIGHT_REPORT

**일시:** 2026-10-18 (KST)

## Git / 저장소

| 항목 | 값 |
|------|-----|
| `git rev-parse --show-toplevel` | `C:/Users/joker/Documents/GitHub/1` |
| `origin` | `https://github.com/spokedu77-ops/1.git` ✓ (`spokedu77-ops/1`) |
| **현재 브랜치** | `spokedu-security-audit-20261018` ⚠ **지시서 요구 `main`과 불일치** |
| `HEAD` | `c1a7ec52691f0f710e51a15aeb359e8eb7b55e76` |
| `origin/main` | `c1a7ec52691f0f710e51a15aeb359e8eb7b55e76` (동일 SHA) |
| `HEAD..origin/main` / `origin/main..HEAD` | **0 commits** (분기 없음, 커밋만 동일) |

## 미커밋 변경 (보존)

- Phase 1-B5 Hero: `home-hero.tsx`, `home-web.module.css`, `home-web-assets.ts`, `home-hero-coaching.jpg`
- `docs/design/phase-1b4*` · `phase-1b5-final/` · `phase-2a/` (감사 산출물)
- **서비스 코드 추가 수정 없음** (Phase 2-A)

## Preflight 판정

| 조건 | 결과 |
|------|------|
| 저장소 `spokedu77-ops/1` | PASS |
| 브랜치 이름 `main` | **FAIL** (SHA는 main과 동일) |
| checkout/pull/reset/stash | 수행하지 않음 ✓ |
| Phase 2-A 서비스 diff | **0건** ✓ |

**감사 진행:** 브랜치명 불일치로 `PHASE2A_AUDIT_PARTIAL` 전제 하에 Production·Local 실사 수행.

## 실행 환경

| 환경 | URL | 비고 |
|------|-----|------|
| Production | `https://spokedu.kr` | 비로그인, 신규 브라우저 컨텍스트 |
| Local | `http://127.0.0.1:3018/spokedu/` 경로 없음 — **루트 Clean URL** (`/private` 등) |
| Local BUILD_ID | `GWjWk5d5r6_P0zCpKWV_-` | `npm run build` 후 `PORT=3018 npm run start` |

## 검사 가능 여부

- Production HTTP·Playwright: **가능**
- Local fresh build: **가능**
- Production 문의 **실제 제출**: **금지** (POST 차단·모의만)
