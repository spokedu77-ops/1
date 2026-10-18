# Phase 1-B2B — Change Scope Audit

## Git

| 항목 | 값 |
|---|---|
| 원격 | `spokedu77-ops/1` (로컬 `origin`) |
| 브랜치 | `main` @ `9309e5a643ac6846e087a8b3db6966438ad39cf5` |
| Commit | **0** |
| Push | **0** |
| Vercel/Production 배포 | **0** |

## 작업 전 Git 상태 (요약)

- B1 미커밋: `home-hero.tsx`, `service-gateway.tsx`, `home-web.module.css` (Hero/Gateway + 모바일 `.actions`/`.btn`)
- B2A: `docs/design/phase-1b2a/` (문서만)
- 기타 미커밋: `SPOKEDU_PUBLIC_AUDIT.md`, `app/robots.ts`, `navigation.contract.test.ts`, `design-audit-captures/` 등 — **B2B에서 미수정**

## B2B 서비스 코드 변경

| 파일 | B2B |
|---|---|
| `spokedu-method.tsx` | 예 |
| `field-records.tsx` | 예 |
| `home-web-assets.ts` | 예 (slug만) |
| `home-web.module.css` | 예 (Method/Records + 모바일 `.step` grid-row fix) |

**허용 범위 밖 서비스 수정:** 0건

## 미커밋 보존

- B1 Hero/Gateway 변경: **유지**
- B2B는 위 4파일만 추가 수정

## Diff 산출물

- `phase-1b2b-source.diff`: `git diff HEAD` 기준 4파일 전체
- **주의:** `home-web.module.css` diff에는 **B1 Hero/Gateway hunks가 포함**될 수 있음(동일 파일). B2B만 분리하려면 해당 파일에서 Method/Records·`.step` 구간만 별도 리뷰.

## 산출물 경로

- `docs/design/phase-1b2b/IMPLEMENTATION_REPORT.md`
- `docs/design/phase-1b2b/CONTENT_FACT_CHECK.md`
- `docs/design/phase-1b2b/QA_RESULTS.md`
- `docs/design/phase-1b2b/CHANGE_SCOPE_AUDIT.md`
- `docs/design/phase-1b2b/captures/*.png`
- `docs/design/phase-1b2b/phase-1b2b-source.diff`
- ZIP: `%USERPROFILE%\Downloads\SPOKEDU_Phase1B2B_REVIEW.zip`
