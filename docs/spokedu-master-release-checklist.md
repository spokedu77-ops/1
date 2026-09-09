# SPOKEDU MASTER Release Checklist

## Automated Verification

Executable MASTER QA is defined by GitHub Actions, not by ad-hoc file lists in this checklist. There is no single repository-wide `npm run lint` gate. `npm test` / `npm run test:full` is broader regression and is **not** the normal MASTER PR gate.

### Canonical CI — MASTER PR/push (`master-gate`)

Authoritative job: `.github/workflows/spokedu-master-qa.yml` / `master-gate`.

- [ ] Targeted ESLint (`--max-warnings 0`). Path list is owned by that job, currently:

```text
npx eslint
app/spokedu-master
app/api/spokedu-master
app/lib/server/spokeduMasterAccess.ts
app/lib/server/spokeduMasterPayment.ts
app/lib/server/spokeduMasterPaymentApply.ts
proxy.ts
scripts/spokedu-master-commercial-smoke-qa.mjs
scripts/spokedu-master-commercial-preflight.mjs
--max-warnings 0
```

- [ ] `npm run test:spokedu-master:core`
- [ ] `git diff --check`

Do not treat individual files such as `operational-data.test.ts` or `explanations/route.test.ts` as the core CI allowlist. Core membership is `vitest.spokedu-master-core.config.ts`.

### Canonical CI — repository TypeScript

Authoritative job: `.github/workflows/typecheck.yml`. This is **not** part of `master-gate`.

- [ ] `npm run typecheck`

Runs when that workflow’s path filters match (typically `**/*.ts` / `**/*.tsx` and related config).

### Canonical CI — commercial Linux smoke (not every PR)

Job: `commercial-linux-smoke` in the same MASTER QA workflow. Runs when pushing `release/**` or `commercial/**`, or when `workflow_dispatch` sets `run_commercial_smoke`. Depends on `master-gate`.

- [ ] `npm run build`
- [ ] `npm run start` (CI uses port 3099)
- [ ] HTTP probes: `/login`, `/spokedu-master/landing`, `/spokedu-master/payment`

### OPTIONAL / MANUAL (not MASTER core CI)

Windows-local convenience (not canonical CI):

- [ ] `npx.cmd tsc --noEmit --incremental false`

Operator / staging scripts (not the PR core gate):

- [ ] `npm run qa:spokedu-master:release-automated -- http://localhost:3000`
- [ ] `npm run qa:spokedu-master:production-prep`
- [ ] `npm run qa:spokedu-master:data-integrity`
- [ ] `npm run qa:spokedu-master`
- [ ] `npm run build` (local)

Legacy ClassRecord / import protection (run when changing that code; not PR core):

- [ ] `npm run test:spokedu-master:legacy`

## Required Environment Variables

- [ ] `SPOKEDU_MASTER_QA_ID`
- [ ] `SPOKEDU_MASTER_QA_PASSWORD`
- [ ] `SPOKEDU_MONITORING_WEBHOOK_URL`
- [ ] `SPOKEDU_MASTER_DATABASE_URL` for read-only data-integrity checks against a temporary restore or approved target
- [ ] Any existing app variables required by the dev server and Supabase auth in the target environment

Do not write actual secret values in this checklist.

## Production Environment Checks

- [ ] Create one student in production.
- [ ] Save one class record in production.
- [ ] Generate, save, and revisit an explanation from the saved class record.
- [ ] Verify the profile page deletes only MASTER operational data after typing `MASTER 데이터 삭제`.
- [ ] Confirm subscriptions, payment orders, webhook events, and the auth account remain after MASTER operational data deletion.
- [ ] Confirm a real paid account receives `/api/spokedu-master/access` 200.
- [ ] Confirm a logged-in account without access sees the 403 access screen.
- [ ] Confirm paid checkout grants SPOKEDU MASTER access.
- [ ] Confirm the production error monitoring project receives one test server error event.
- [ ] Confirm the production error monitoring project receives one test client runtime error event.
- [ ] Confirm payment confirm/webhook failures are visible to operators without raw payment payloads.
- [ ] Confirm monitoring events do not include passwords, tokens, cookies, student names, student memos, explanation text, or full emails.
- [ ] Confirm sticky CTA behavior on a real mobile device.
- [ ] Confirm production Service Worker and Cache Storage contain no personalized document or protected API responses.
- [ ] Confirm Supabase automated backups and PITR availability for the production project.
- [ ] Run or review one restore rehearsal into a temporary database.
- [ ] Run `qa:spokedu-master:data-integrity` against the temporary restored database.
- [ ] Confirm restore owner, approval path, and stop criteria.

## Stop Release If

- [ ] `npm.cmd run build` fails.
- [ ] TypeScript fails.
- [ ] Browser smoke fails (includes entitlement matrix: free/lite/premium/expired).
- [ ] `qa:spokedu-master:data-integrity` fails or was skipped without an approved exception.
- [ ] `SPOKEDU_MASTER_DATABASE_URL` (or approved restore DB URL) is missing in production prep.
- [ ] Unauthenticated access protection fails.
- [ ] Data from one user is visible to another user.
- [ ] Production DB write for students, class records, or explanations fails.
- [ ] Saved class record to explanation linking fails.
- [ ] A user cannot delete their own MASTER operational data on request.
- [ ] MASTER data deletion removes subscription, payment, webhook, or account records.
- [ ] A paid account receives access 403 after payment.
- [ ] Lite can open records/SPOMOVE without Premium GateWall, or free/expired can open library without GateWall.
- [ ] Owner isolation fails: one user's students/records/drafts visible to another user.
- [ ] There is no confirmed production error monitoring path.
- [ ] Production monitoring events contain sensitive user, auth, or payment payload data.
- [ ] Database backup and restore readiness cannot be confirmed.
- [ ] Required MASTER tables, RLS, owner relationships, or payment webhook idempotency checks fail in the restored database.

## Path-to-9 P1 gates (D/E)

- [ ] `vitest` contract: `app/spokedu-master/entitlementMatrix.contract.test.ts`
- [ ] Smoke flow `entitlement matrix` passes against the release candidate.
- [ ] `release-automated` includes `data_integrity` step (do not ship with `--skip-integrity`).

## Path-to-9 P2 gates (C / A 여정)

- [ ] `vitest` contract: `app/spokedu-master/dayLoop.contract.test.ts`
- [ ] Smoke flow `day loop` passes: library today → home bar → record → report → home → SPOMOVE
- [ ] CompactOpsBar still ≤84px (no bar expansion during day-loop work)

## Path-to-9 P3 gates (B 만듦새 / 선택이유)

- [ ] `vitest` contract: `app/spokedu-master/craftSelectionReasons.contract.test.ts` + `librarySelectionReasons.test.ts`
- [ ] SPOMOVE 선택이유는 tag-only/구 엔진 ID 단독으로 붙지 않음
- [ ] 홈·라이브러리 카드가 `formatProgramSelectionReasons` 어휘를 공유
- [ ] `npm run qa:spokedu-master:craft-capture -- http://localhost:3000` (랜딩 Primary · 라이브러리 어휘 · 바 ≤84)

## Path-to-9 P4 gates (실행 증거 · 다계정 · 톤)

- [ ] `vitest` contract: `app/spokedu-master/ownerIsolation.contract.test.ts`
- [ ] Smoke flow `owner isolation` passes (A 학생/메모가 B에 비노출 + draft 키 격리)
- [ ] `release-automated` includes `craft_capture` (do not ship with `--skip-craft`)
- [ ] verification-report includes entitlement/dayLoop/selection-reasons/ownerIsolation contracts
- [ ] Toss sandbox 실결제·복구 DB integrity는 secrets 준비 후 (mock만으로 D 8+ 선언 금지)

## Path-to-9 P5 gates (D readiness · secrets 대기)

- [ ] `vitest`: `spokeduMasterBillingOrders.test.ts` / `spokeduMasterBillingProvider.test.ts` / `billingReadinessP5.contract.test.ts`
- [ ] `data-integrity` required_columns include recurring billing fields
- [ ] `payment-reconcile --apply` remains exit 2 with `allowedRecoveryActions` plan only
- [ ] risk-audit amendment: billing/issue + cancel · `strictCommercialScore ≠ D 8+`
- [ ] **Blocked until secrets:** Toss sandbox `--complete-billing` log, restore DB `qa:spokedu-master:data-integrity` run, vault cron apply

## H4 launch evidence (D 8+ / E 출시 클로즈)

증거 없이 점수 선언 금지. mock / 구두 완료는 반영하지 않는다.

### Toss sandbox 실결제 (D 8+)

1. Staging + Toss **test** keys만 사용.
2. Preflight (결제 없이): `npm run qa:spokedu-master:payment-no-toss -- http://localhost:3000`
3. 브라우저에서 `/spokedu-master/payment?plan=premium` → 테스트 결제 완료.
4. success URL의 `authKey` / `customerKey`로:
   - `SPOKEDU_MASTER_PAYMENT_E2E_AUTH_KEY=…`
   - `SPOKEDU_MASTER_PAYMENT_E2E_CUSTOMER_KEY=…`
   - `npm run qa:spokedu-master:staging-payment -- http://localhost:3000 --complete-billing`
5. 산출물: 터미널 JSON/`ok: true` 로그 또는 success URL 스크린샷을 증거로 보관.

### 임시 DB restore rehearsal (E 출시 클로즈)

1. Follow `docs/spokedu-master-backup-restore-runbook.md` (stop criteria · named owner).
2. Restore into a **temporary** database (never production).
3. `SPOKEDU_MASTER_DATABASE_URL=<temp>` → `npm run qa:spokedu-master:data-integrity`
4. 산출물: restore 시각 · owner · integrity 로그 경로.
