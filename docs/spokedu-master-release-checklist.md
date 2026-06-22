# SPOKEDU MASTER Release Checklist

## Automated Verification

- [ ] `npx.cmd eslint app/spokedu-master app/api/spokedu-master scripts/spokedu-master-commercial-smoke-qa.mjs`
- [ ] `npx.cmd tsc --noEmit --incremental false`
- [ ] `npx.cmd vitest run app/api/spokedu-master/access/route.test.ts app/api/spokedu-master/operational-routes.test.ts app/api/spokedu-master/explanations/route.test.ts app/api/spokedu-master/operational-data.test.ts`
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
- [ ] Browser smoke fails.
- [ ] Unauthenticated access protection fails.
- [ ] Data from one user is visible to another user.
- [ ] Production DB write for students, class records, or explanations fails.
- [ ] Saved class record to explanation linking fails.
- [ ] A user cannot delete their own MASTER operational data on request.
- [ ] MASTER data deletion removes subscription, payment, webhook, or account records.
- [ ] A paid account receives access 403 after payment.
- [ ] There is no confirmed production error monitoring path.
- [ ] Production monitoring events contain sensitive user, auth, or payment payload data.
- [ ] Database backup and restore readiness cannot be confirmed.
- [ ] Required MASTER tables, RLS, owner relationships, or payment webhook idempotency checks fail in the restored database.
