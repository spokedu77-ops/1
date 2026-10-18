# Release Readiness

## Closure 코드 변경 (service)

- `app/api/curriculum/leads/route.ts` — dedupe 키에 purpose/partnership 포함
- `app/api/private/leads/route.fault-injection.test.ts` — E08 FAULT_INJECTION_TEST
- `app/api/dispatch/leads/route.fault-injection.test.ts` — E09 FAULT_INJECTION_TEST
- `.env.example` — CONTACT_E2E_* 문서
- QA scripts: `run-contact-db-e2e.mjs`, `closure/run-contact-admin-qa.mjs`, `closure/run-home-b5-smoke.mjs`

**유지:** `master_org_inquiry`, contact failure copy, 3 APIs, draft UX.

## 배포 전 필수

1. **E15:** QA 관리자 env로 `run-contact-admin-qa.mjs` PASS
2. (선택) Resend staging E10
3. `main` 통합 — 별도 사용자 PR
4. Production `CONTACT_E2E_BLOCKED_PROJECT_REFS`에 prod ref 등록 권장

## 재실행 (로컬)

```powershell
npm run build
$ref = node --input-type=module -e "import nextEnv from '@next/env'; nextEnv.loadEnvConfig(process.cwd()); console.log(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]);"
$env:CONTACT_E2E_ALLOW_DB_WRITES='1'
$env:CONTACT_E2E_APPROVED_PROJECT_REF=$ref
node docs/operations/phase-2c-contact-e2e/run-contact-db-e2e.mjs
$env:CONTACT_E2E_CLOSURE_OUTPUT='1'; node docs/operations/phase-2c-contact-e2e/run-contact-customer-qa.mjs
node docs/operations/phase-2c-contact-e2e/closure/run-contact-admin-qa.mjs
```

## ZIP

`docs/operations/phase-2c-contact-e2e/closure/SPOKEDU_Phase2C_CLOSURE_GATE.zip`

## Git

Commit / Push / Production deploy: **0**
