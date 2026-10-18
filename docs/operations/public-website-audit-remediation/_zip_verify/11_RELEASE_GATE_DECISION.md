# FINAL RELEASE GATE — 판정

**판정 코드:** `REMEDIATION_READY_WITH_EXTERNAL_BLOCKERS`

**기준 Git HEAD (patch base):** `9b897cd7022aef5bbdb93853c9f708e6ab215759` (branch `spokedu-security-audit-20261018`; `FULL_REMEDIATION.patch` = HEAD 대비 작업 트리)

**패키지:** `SPOKEDU_PUBLIC_WEBSITE_RELEASE_GATE.zip` (repo root)

## 요약

| 영역 | 결과 |
|------|------|
| 패키지 완전성 (신규·삭제·SQL·`FULL_REMEDIATION.patch`) | PASS — `RELEASE_FILE_MANIFEST.json`, `included-sources/`, ZIP 재현 검증 `qa-evidence/ZIP_VERIFY.json` |
| TypeScript / Production build | PASS |
| Vitest (legacy redirect, spam guard, gym route, businessInfo, public typography) | PASS |
| ESLint (시정 TS/TSX) | PASS (`.mdc` rule 파일은 ESLint 대상外) |
| Playwright 브라우저 실사 (리다이렉트·lab·home·records·catalog·consult) | PASS — `qa-evidence/BROWSER_QA.json`, `qa-evidence/captures/` |
| Rate limit RPC 격리 DB 다중 요청 E2E | **NOT_RUN** — migration은 패키지에 포함; 스테이징 적용·RPC 실요청은 배포 전 운영자 필수 |
| Gym CRM 격리 DB E2E | **BLOCKED** — `CONTACT_E2E_ALLOW_DB_WRITES=1` 및 승인 project ref 미설정 (`qa-evidence/GYM_CRM_E2E.json`) |
| E15 관리자 인박스 | **BLOCKED_MISSING_CREDENTIALS** (기존과 동일) |
| 통신판매업 신고번호 (FACT) | **릴리스 차단 유지** — `mailOrderReportNumber: null`, Footer `getPublicFooterLegalLine()` 미노출 |

## 외부 차단 / 배포 전 필수

1. **Supabase:** `20261018120000_public_lead_rate_limit.sql` 스테이징 적용 → RPC·권한·429/503 fail-closed 확인 후 Production.
2. **Gym E2E:** 격리 프로젝트에서 `scripts/run-gym-crm-e2e.mjs` 재실행 (insert / reselect / dedupe / cleanup).
3. **통신판매업:** 공식 증빙 확정 시에만 `brandProfile.mailOrderReportNumber` 반영.
4. **E15:** 관리자 자격 증명 확보 후 관리자 인박스 회귀.

## 안전 적용 순서 (요약)

1. 코드 패치 적용 (`FULL_REMEDIATION.patch` 또는 manifest 기준 파일 단위).
2. SQL migration (rate limit) — **Production RPC 없이 public lead API 배포 금지**.
3. `GYM_LEADS_GOOGLE_SCRIPT_URL` 등 env 확인 (Sheets 장애와 CRM insert 분리는 코드 반영됨).
4. Production build + 스모크: `/info/curriculum`, `/info/private`, `/info/gym`, `/consult`, `/spokedu-lab`.
5. 롤백: migration rollback 절차 + 이전 빌드; rate limit RPC 제거 시 Production에서 503 fail-closed 유지(의도).

## 미포함 (의도)

- mileage / inventory / release-candidate-final WIP — 본 gate manifest·patch 범위外.
- `cases.ts` 정본 통합 — 활성 import·증빙 미확인 항목은 `06_CASE_DATA_MIGRATION.md` 미완료로 유지.

## Commit / Push / Deploy

**금지** — 사용자 배포 승인 및 외부 차단 해소 전.
