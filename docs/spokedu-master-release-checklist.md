# SPOKEDU MASTER Release Checklist

## Automated Verification

- [ ] `npx.cmd eslint app/spokedu-master app/api/spokedu-master scripts/spokedu-master-commercial-smoke-qa.mjs`
- [ ] `npx.cmd tsc --noEmit --incremental false`
- [ ] `npx.cmd vitest run app/api/spokedu-master/access/route.test.ts app/api/spokedu-master/operational-routes.test.ts app/api/spokedu-master/explanations/route.test.ts app/api/spokedu-master/operational-data.test.ts`
- [ ] `npm.cmd run qa:spokedu-master:release-automated -- http://localhost:3000`
- [ ] `npm.cmd run qa:spokedu-master:production-prep`
- [ ] `npm.cmd run qa:spokedu-master:data-integrity`
- [ ] `npm.cmd run qa:spokedu-master`
- [ ] `npm.cmd run build`
- [ ] `git diff --check`

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

- [ ] `vitest` contract: `app/spokedu-master/craftP3.contract.test.ts` + `librarySelectionReasons.test.ts`
- [ ] SPOMOVE 선택이유는 tag-only/구 엔진 ID 단독으로 붙지 않음
- [ ] 홈·라이브러리 카드가 `formatProgramSelectionReasons` 어휘를 공유
- [ ] `npm run qa:spokedu-master:craft-capture -- http://localhost:3000` (랜딩 Primary · 라이브러리 어휘 · 바 ≤84)

## Path-to-9 P4 gates (실행 증거 · 다계정 · 톤)

- [ ] `vitest` contract: `app/spokedu-master/ownerIsolation.contract.test.ts`
- [ ] Smoke flow `owner isolation` passes (A 학생/메모가 B에 비노출 + draft 키 격리)
- [ ] `release-automated` includes `craft_capture` (do not ship with `--skip-craft`)
- [ ] verification-report includes entitlement/dayLoop/craftP3/ownerIsolation contracts
- [ ] Toss sandbox 실결제·복구 DB integrity는 secrets 준비 후 (mock만으로 D 8+ 선언 금지)

## Path-to-9 P5 gates (D readiness · secrets 대기)

- [ ] `vitest`: `spokeduMasterBillingOrders.test.ts` / `spokeduMasterBillingProvider.test.ts` / `billingReadinessP5.contract.test.ts`
- [ ] `data-integrity` required_columns include recurring billing fields
- [ ] `payment-reconcile --apply` remains exit 2 with `allowedRecoveryActions` plan only
- [ ] risk-audit amendment: billing/issue + cancel · `strictCommercialScore ≠ D 8+`
- [ ] **Blocked until secrets:** Toss sandbox `--complete-billing` log, restore DB `qa:spokedu-master:data-integrity` run, vault cron apply
