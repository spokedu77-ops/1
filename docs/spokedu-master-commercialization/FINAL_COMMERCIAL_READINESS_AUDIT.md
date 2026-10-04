# SPOKEDU MASTER — Final Commercial Readiness Audit

> Audit snapshot: 2026-10-03 KST
> Scope: Production, canonical contracts/SSOT, Production database (read-only), operations/admin, public references, existing test evidence
> Change policy: audit only. No product code, database mutation, migration, deploy, or test modification was performed.

## 1. Executive Verdict

**Overall: A. READY EXCEPT EXTERNAL LIVE VERIFICATION**

MASTER의 상용 구조, 핵심 사용자 여정, 서버 권한 경계, 결제 멱등성·복구 구조, 관리자 기본 고객응대 정보는 출시 가능한 수준이다. Production Landing에서 가입 진입까지 끊김이 없고, Free 사용자는 온보딩 직후 무료 수업·Library 탐색·수업 도구라는 첫 가치를 명시적으로 안내받는다. 실제 Production DB에도 classes 19, active students 123, sessions 34, completed sessions 17, records 3, favorites 41이 있어 DISCOVER → PREPARE → RUN → REMEMBER의 저장 모델이 운영 데이터에서 확인된다.

내부 **P0는 0건**이다. 다만 다음을 실제로 실행하지 않았으므로 `COMMERCIAL READY`는 선언할 수 없다.

- Toss 상용 MID/Live Key 기반 9,900원 최초 결제와 갱신
- 신규 실수신 mailbox의 Email OTP 완료
- 신규 credentialed Kakao OAuth 완료
- 신규 실제 계정의 invite signup → redeem → replay

| Launch gate | Verdict | Evidence |
|---|---|---|
| COMMERCIAL ARCHITECTURE | PASS | Product Contract, product/access SSOT, billing issue/renew/cancel routes, Production cron |
| PRODUCT JOURNEY | PASS | Production public entry, onboarding/dashboard/core-route code, Production population snapshot |
| SECURITY | PASS | RLS/privilege/advisor read-only audit; server capability enforcement |
| OPERATIONS | PASS | MASTER ADMIN supports member, paid/promo/effective, renewal, billing and grant history; one P1 escalation gap |
| PRE-LIVE BILLING | PASS | hourly cron active, Vault indirection, fail-closed provider, zero currently chargeable due rows with a Vault key |
| LIVE BILLING | BLOCKED | Toss live approval/MID/keys and real charge/renewal not completed |
| AUTH LIVE E2E | BLOCKED | Kakao start/historical use proven; new Kakao completion and new mailbox OTP not completed |

## 2. Benchmark Method

The audit used journey quality—not feature count—as the comparison unit:

1. Landing → signup continuity
2. Free entry and time-to-first-value
3. Empty-state and recovery guidance
4. Upgrade rationale and paywall truth
5. Subscription status, cancellation, and downgrade clarity
6. Support and operator recovery
7. Product-native reasons to return

Reference gaps are classified only as `CRITICAL GAP`, `MATERIAL GAP`, `NICE-TO-HAVE`, or `NOT RELEVANT`. A reference pattern becomes an action only if its absence weakens MASTER's approved journey.

Evidence precedence followed the brief: Production behavior → Product Contract/code SSOT → Production DB → code → Admin → public docs → tests. Protected live journeys that require unavailable credentials are explicitly not promoted from contract evidence to live evidence.

## 3. Reference Comparison

| Reference | What they do / why it works | MASTER relevance | Decision |
|---|---|---|---|
| [ClassDojo free model](https://help.classdojo.com/hc/en-us/articles/205924206-How-is-ClassDojo-free-for-all-school-) / [terms](https://ideas.classdojo.com/terms/) | Free core is explicit; optional paid value, auto-renewal, cancellation and period-end access are stated plainly. | MASTER already separates durable Free from paid plans and states period-end cancellation. Keep this trust pattern. | APPLY; do not copy family monetization. |
| [Seesaw plans](https://help.seesaw.me/hc/en-us/articles/28238188511117-Seesaw-subscription-plans) / [subscription](https://help.seesaw.me/hc/en-gb/articles/35336214537997-Subscribe-to-Seesaw) | Simple plan comparison and explicit Starter entry reduce uncertainty; downgrade behavior is documented. | MASTER plan truth is clear; data behavior after downgrade should remain support-visible. | APPLY; institution complexity not relevant to individual launch. |
| [Nearpod pricing](https://nearpod.com/pricing) | Free entry, limits, school sales route and downgrade/content behavior appear together. | MASTER Landing and subscription UI already match the Free/paid/Center separation. | APPLY; no new plan needed. |
| [Kahoot business model](https://support.kahoot.com/hc/en-us/articles/115000472927-How-does-Kahoot-make-money) | Free core plus paid enhancements makes the upgrade logic legible. | Mirrors MASTER's Free tools/preview → Lite operations → Premium continuity/SPOMOVE story. | APPLY. |
| [Canva for Education](https://www.canva.com/help/about-canva-for-education/) | Audience eligibility, verification, privacy and teacher resources are made explicit. | Audience clarity is relevant; credential verification is not, because MASTER targets a broader instructor group. | PARTIAL APPLY. |
| [TeamBuildr pricing](https://www.teambuildr.com/pricing) | Workflow proof, concrete pricing, support and enterprise sales paths are separated. | Supports MASTER's individual self-serve vs Center inquiry split. | APPLY; no-card trial is NOT RELEVANT because MASTER Free is not a trial. |
| [TrainHeroic coach](https://www.trainheroic.com/coach/) / [coach FAQ](https://support.trainheroic.com/hc/en-us/articles/18156776017677-FAQs-General-Questions-for-Prospective-Coaches) | Guided first use plus explicit recurring/no-contract/cancel-at-cycle messaging. | MASTER has guided Free activation and cancellation truth; support escalation can be clearer. | APPLY. |
| [CoachNow billing](https://help.coachnow.io/en/articles/2477947-how-can-i-update-manage-my-subscription-and-billing-for-coachnow) | One place exposes subscription, invoices, payment method, cancellation and support fallback. | MASTER subscription status is centralized; incident-level order visibility is weaker for operators. | MATERIAL GAP (P1 operations). |
| [TeamSnap pricing](https://www.teamsnap.com/pricing) / [terms](https://www.teamsnap.com/terms) | Individual free entry and organization sales are distinct; cancellation and end-of-period use are explicit. | Confirms current MASTER Free/Center positioning. | APPLY. |
| [Spond](https://www.spond.com/en-us/) / [payment costs](https://help.spond.com/app/en/articles/118091-payments-costs-in-the-spond-app) | Fast entry, role segmentation, transparent payment economics and trust cues. | Entry simplicity and role clarity apply; transaction-fee business model does not. | PARTIAL APPLY. |
| [PlayMetrics demo](https://home.playmetrics.com/demo) / [club introduction](https://help.playmetrics.com/hc/en-us/articles/360021201253-An-Introduction-to-the-PlayMetrics-Club-System) | Sales-led institution route, role-based operations, onboarding/support. | Relevant only to the current Center inquiry route. | APPLY to sales route; deeper Center packaging is P2. |
| [Linear start guide](https://linear.app/docs/start-guide) / [billing](https://linear.app/docs/billing-and-plans) | Role-oriented first workflow; billing state, past-due, downgrade and cancellation are visible. | MASTER activation is strong; billing incident visibility is the meaningful gap. | MATERIAL GAP (P1). |
| [Notion billing](https://www.notion.com/help/billing) / [plan changes](https://www.notion.com/en-gb/help/upgrade-or-downgrade-your-plan) | Renewal, failed payment, downgrade recovery and proration are explained before action. | MASTER server quote and subscription copy align; live confirmation remains external. | APPLY. |
| [Framer cancellation](https://www.framer.com/help/articles/cancel-your-framer-plan/) | Cancellation status and period-end access are concise and visible. | MASTER matches this pattern in subscription/profile copy. | APPLY. |

**Core benchmark conclusion:** MASTER is not missing a competitor feature required for launch. Its material gaps are operational visibility, structured support escalation, and funnel measurement—not a broken teacher workflow.

## 4. End-to-End Customer Journey

| Stage | Entry / action | Expected result | Actual evidence | Friction / failure / recovery | Plan |
|---|---|---|---|---|---|
| DISCOVER | `/spokedu-master/landing` | Understand audience, product loop and Free entry | Production 200; canonical correct; 1440/834/390 no horizontal overflow, broken images 0 | None observed on public route | Public |
| SIGN UP | Free CTA → login | Choose Kakao or email without login/signup ambiguity | Production login says authentication handles signup and login; Kakao reaches official account page; `login/page.tsx`, `useMasterEmailOtp.ts` | New credentialed completion remains external block | Public |
| ONBOARD | New authenticated user | Minimum profile and explicit next step | `onboarding/page.tsx`: 3 steps, only name required; school/age/program optional; Back and save error; completion → requested next or dashboard | No explicit Skip, but optional fields can remain empty; not launch-blocking | Free |
| FIRST VALUE | Dashboard start choices | Complete one value in 3–5 minutes | `DashboardView.tsx`: free lesson detail, Library browse, class tools; onboarding repeats these outcomes | Protected live new-user run not repeated without credentials | Free |
| PREPARE | Library/detail/class build | Find and attach activity | `LibraryView.tsx`, `[id]/LibraryDetailView.tsx`, classes/manage flow; precise empty/error/paywall states | Full Library/class operations require Lite | Free preview / Lite |
| RUN | Manage/session | Session, activity sequence, attendance, completion | `SessionDetailSheet.tsx`, `SessionActivities.tsx`, `SessionAttendance.tsx`; partial save failure preserves recovery instruction | Real live populated run not repeated; Production DB has 34 sessions | Lite |
| REMEMBER | Completed session/records | Notes/observations persist and are reusable | session completion consistency contract; records/report surfaces; Production records 3 | Premium gate is expected | Premium |
| RETURN | Dashboard/recent/schedule | Resume recent work and prepare next session | `DashboardView.tsx` “이어서 준비”; session detail “다음 수업 만들기”; favorites 41 | Repeat-value evidence is product-native | Mixed |
| UPGRADE | Gate or pricing | Understand needed plan and preserve intended destination | public contract/catalog derived prices/features; payment route preserves plan/next | No live paid completion evidence | Lite/Premium |
| PAY | Billing auth → first charge | One charge, entitlement applied, safe unknown handling | issue route persists order/payment key before apply, recovers without recharge; UI distinguishes charged pending | Live key unavailable | Paid |
| MANAGE | Profile/subscription | See plan, next date, cancellation and errors | `subscription/page.tsx`, `subscriptionSummary.ts` | Admin lacks non-active order visibility (P1) | Paid |
| CANCEL / RECOVER | Cancel API and period end | Stop future renewal, retain access until end, return to Free | cancel route deletes Vault key and schedules end; UI copy matches | Live cancellation not executed | Paid → Free |

## 5. Acquisition

Production evidence at `https://spokedu.kr/spokedu-master/landing`:

- Product and primary audience are explicit within the hero.
- Free, login, Lite, Premium and Center destinations are distinct.
- Free routes to `/spokedu-master/login?next=/spokedu-master/onboarding`; paid routes preserve `plan` through auth.
- Legal/business, recurring billing, cancellation and period-end use are visible.
- Canonical is exactly `https://spokedu.kr/spokedu-master/landing`.
- `/api/spokedu-master/og` returns 200 and renders the 1200×630 Korean card.
- 1440/834/390 public checks: horizontal overflow 0, broken images 0, console errors 0 on Landing.

**Status: PASS.** This audit found no conversion-path break and therefore does not reopen Landing design.

## 6. Auth

Evidence:

- `app/spokedu-master/login/page.tsx`: safe `next`, existing-session convergence, Kakao/email entry, explicit signup/login equivalence.
- `app/components/auth/useMasterEmailOtp.ts`: `shouldCreateUser: true`, six-digit verification, rate-limit recovery message.
- `app/spokedu-master/auth/callback/route.ts`: authorization-code exchange, profile creation, onboarding redirect, safe destination.
- Production Kakao start reached `accounts.kakao.com` and preserved callback to `/spokedu-master/auth/callback?next=/spokedu-master/onboarding`.
- Production Auth DB: 83 distinct email users, 2 Kakao users. This proves historical provider use, not a fresh E2E.

Invalid/expired sessions converge to login through server access checks; protected payment/subscription URLs preserve their destination. Logged-out production pages emitted two expected 401 resource entries during access probing, with no user-visible break; this is diagnostic noise, not a blocker.

**Status: PARTIAL / external verification.** Contract and historical production evidence are strong. New mailbox OTP and credentialed Kakao completion remain blocked.

## 7. Onboarding

`app/spokedu-master/onboarding/page.tsx` has three short steps: environment, class context, start. Name is the only required text; school, age groups and program types are optional. Back navigation is present, touch controls are at least 44px, save failure is shown, and successful completion returns to an approved requested path or dashboard.

The final step says what can be done immediately in Free rather than asking for more setup. A separate Skip button is absent, but optional fields can be left empty; this does not delay first value materially.

**Status: PASS.** No P0/P1 onboarding break found.

## 8. First Value

Activation is explicit in both onboarding and dashboard:

- one designated free lesson from detail through video;
- Library browsing;
- class tools immediately available;
- direct “시작하기” actions in `DashboardView.tsx`.

This answers “가입은 했는데 이제 뭘 하지?” without requiring a class, student roster or payment first. Production data confirms these routes have been used, while a fresh credentialed activation timing remains part of the external Auth E2E.

**Status: PASS.** Benchmark gap: none material.

## 9. Free Experience

Canonical sources:

- `app/spokedu-master/lib/productCatalog.ts`
- `app/spokedu-master/lib/publicProductContract.ts`
- `app/spokedu-master/lib/masterAccessModel.ts`
- `app/lib/server/spokeduMasterAccess.ts`

Free offers Library browsing, a designated full lesson preview and class tools. Lite adds full play-PE Library, classes, schedule, attendance and lesson composition. Premium adds continuity/records, parent notice, SPOMOVE and SPOMAT member benefits. Landing/payment derive from catalog/public contract; Free is not described as a time-limited trial.

**Status: PASS.** Free demonstrates the product philosophy while retaining a concrete Lite reason.

## 10. Core Loop

| Loop | Code evidence | Production data evidence | Status |
|---|---|---|---|
| DISCOVER | Library search/filter/cards/detail | favorites 41 | PASS |
| PREPARE | class creation, activity picker, schedule | classes 19 | PASS |
| RUN | session state/actions, attendance, activity completion | sessions 34 | PASS |
| REMEMBER | notes, observations, completion consistency, records | completed sessions 17; records 3 | PASS |
| FOLLOW-UP | next-session from previous session, report/parent notice | persisted session/record model | PASS |

Navigation, owner-scoped persistence, empty states and save/error feedback are implemented. Examples include actionable “수업반 만들기”, “일정 보기”, “활동 추가”, and partial-completion recovery that retains notes rather than reporting false success.

**Status: PASS.** A route inventory alone was not used as proof; state code plus Production population were required.

## 11. Paywalls

Library expiry and gated states explain what remains in Free and what the user gains. `payment/page.tsx` accepts only `lite | premium`, obtains prices/features from product SSOT, distinguishes choose-plan vs Lite-upgrade, and uses a server quote for proration. The login redirect preserves the requested paid plan.

Lite is presented as a complete operating plan, not a defective Premium subset; Premium adds continuity and SPOMOVE rather than inventing automation. The reviewed customer-facing copy contains no unsupported AI/automatic recommendation claim.

**Status: PASS.** Live post-payment destination remains part of the Toss external block.

## 12. Billing Readiness

### Architecture and code

- Initial billing: `app/api/spokedu-master/payment/billing/issue/route.ts`
- Renewal: `app/api/spokedu-master/payment/billing/renew/route.ts`
- Cancellation: `app/api/spokedu-master/payment/billing/cancel/route.ts`
- Upgrade quote: `app/api/spokedu-master/payment/billing/upgrade-quote/route.ts`
- Webhook: `app/api/spokedu-master/payment/webhook/route.ts`
- Provider/Vault/order helpers: `app/lib/server/spokeduMasterBillingProvider.ts`, `app/lib/server/spokeduMasterBillingKeyVault.ts`, `app/lib/server/spokeduMasterBillingOrders.ts`

The initial charge flow claims an order, checks provider state by immutable order ID, records `payment_key` immediately after approval, and re-applies access without charging again after an apply failure. Unknown/recoverable responses expose `charged`/`recoverable`; `payment/success/page.tsx` prevents a blind “pay again” interpretation and sends charged-but-pending users to support. Renewal has claim/idempotency, retry/backoff, reconciliation and billing-run records. Production without live credentials fails closed.

### Production read-only snapshot

- Supabase project: `mwgvserdyflsqyhcqecp`, `ACTIVE_HEALTHY`, Seoul region.
- Hourly cron `spokedu-master-billing-renew-hourly`: active, `0 * * * *`.
- Cron obtains endpoint and secret through Vault and dispatches with a 30-second timeout.
- Billing runs: 313 total; latest at `2026-10-03T13:00:00Z`; last 12 hourly runs reached the endpoint and failed as `billing_provider_not_configured` with attempted 0—expected fail-closed behavior.
- Orders: 2 active/applied with payment key; 2 pending without payment key; `payment_not_applied = 0`.
- Subscriptions: 12 rows, including historical/QA state; **effective paid active with future period = 0**.
- Plaintext provider billing keys: 0. Vault-backed key references: 3 subscription rows.
- Exact renewal-risk predicate—active Lite/Premium, not cancel-scheduled, due/retry due, Vault key present—returned **0 rows**. Live-key activation therefore has no currently chargeable stale fixture under the production renewal selector.

**Status: PASS pre-live; EXTERNAL BLOCK live.** The apparent stored `active` labels are not treated as effective access because server access also evaluates the period.

## 13. Live Billing Test Plan

Execute in order immediately after Toss approves the production MID/Live Key. Use a dedicated real test customer and record Toss payment/order IDs, DB row IDs, UI screenshots and cleanup outcome.

| Test | Precondition | Action | Toss expected | DB expected | UI expected | Side effect / cleanup |
|---|---|---|---|---|---|---|
| A. Lite first payment | Free, no active paid subscription | Buy Lite at 9,900 KRW | One billing key and one approved payment | one active/applied order; active Lite; Vault secret ref; no plaintext key | immediate Lite access, next billing date | Cancel at end after later tests; never refund unless test protocol requires |
| B. Immediate entitlement | A approved | Open Library/classes/manage | no new charge | effective plan Lite | Lite capabilities open, Premium remains gated | none |
| C. Persistence | A approved | Reload/new tab/re-login | no new charge | same subscription/order | paid state consistent | none |
| D. Cancellation | A active | Schedule cancel | no provider charge | cancel flag/time set; renewal key removed per policy | access retained to period end; no next charge claim | retain until upgrade scenario or use separate account |
| E. Period-end | cancel scheduled and controlled test period | cross/force approved test boundary only under operator procedure | no renewal | subscription expires; effective Free | Free restored, retained data not falsely accessible | archive evidence |
| F. Premium proration | active Lite, not cancel-scheduled | request quote then upgrade | exactly server-quoted difference | Premium applied; original renewal anchor retained | immediate Premium; next full price date shown | verify no duplicate Lite/Premium charge |
| G. Renewal | active paid with live key and controlled due date | trigger scheduled cron once | one renewal | one cycle order/payment; period advanced; billing run success | updated next billing | restore schedule; do not leave manual due rows |
| H. Failure/retry | provider-declinable test method or approved simulator | run renewal | decline once; no duplicate approvals | failed error/retry count/next_retry; later success advances once | accurate failure/recovery message | clear test method and verify key policy |
| I. Duplicate/reconcile | resend identical initial/renew request and simulate response timeout | same order resolves; at most one charge | one payment key per cycle; re-apply without re-charge | charged/pending distinction; safe refresh | confirm Toss console count |
| J. Admin visibility | A–I completed | search customer in MASTER ADMIN | N/A | source rows already present | paid/promo/effective, last payment, next billing/error visible | export incident record, remove test promo only |

No live billing item may be marked PASS from contract tests alone.

## 14. Subscription Lifecycle

| State | Effective-access truth | User UI | Admin | Verdict |
|---|---|---|---|---|
| Free | no valid paid/promo | Free actions and upgrade | effective Free | PASS |
| Lite active | paid Lite valid period | Lite, next date | paid/effective split | PASS (live payment blocked) |
| Premium active | paid Premium valid period | Premium, next date | paid/effective split | PASS (live payment blocked) |
| cancel scheduled | access through period end | cancellation and end date | cancel flag/date | PASS |
| expired | Free effective; preserved data gated | return-to-Free copy | stored vs effective distinguishable | PASS |
| renewal failed / retry | unchanged until entitlement rules decide; retry metadata | retry/error path | error/count/next retry | PARTIAL: needs live test |
| promo only | promo effective until expiry | promo/non-billing copy | grant/effective | PASS |
| paid + promo | maximum effective capability | current effective truth | separate paid/promo | PASS |
| promo expired | paid fallback or Free | effective truth | history retained | PASS |
| charged, apply failed | do not recharge; reconciliation/re-apply | charged-but-pending support path | **non-active order not listed** | PARTIAL, P1 operations |

## 15. Admin Operations

`app/api/admin/spokedu-master-admin/route.ts`, `app/lib/server/spokeduMasterAdmin.ts`, and `app/admin/spokedu-master-admin/MasterAdminClient.tsx` let an operator search users and distinguish paid, promo and effective access; see subscription status, cancellation, next billing, latest active payment, retry count/error/date; and review grant/revoke/invite evidence.

The important gap is exact and bounded: the admin payment query applies `.eq('status', 'active')`. Pending, failed and `recoverable_failed` orders are omitted. Thus “Toss shows paid but Premium is unavailable” can be safely handled by the billing code, but an operator may need DB/log access to identify and replay the incident. Production currently has no charged-not-applied order, so this is **P1, not P0**.

Scenario assessment:

- “결제했는데 Premium이 안 됩니다.” — PARTIAL; subscription and active payment visible, recoverable order not.
- “결제 실패” — PARTIAL; renewal error visible, first-payment failed/pending order not.
- “해지했는데 아직 이용” — PASS; period-end state/date visible.
- “무료 이용권 종료” — PASS; promo/effective history visible.
- “다음 결제일” — PASS.

## 16. Failure / Recovery

| Failure | User knows what happened / money state / next action | Evidence | Status |
|---|---|---|---|
| Network/API 500 | contextual retry copy, no false success | shared request errors and surface state panels | PASS |
| 401/stale session | converges to login with safe return path | access/login routing | PASS |
| 403/plan gate | required plan and payment route | server access + gated UI | PASS |
| OTP rate limit | wait/retry guidance | `useMasterEmailOtp.ts` | PASS |
| Initial payment declined | failure page with retry/support | `payment/cancel/page.tsx` | PASS contract; live blocked |
| Unknown timeout | immutable order lookup before new charge | billing issue route | PASS contract; live blocked |
| Charged/apply failed | explicit charged/recoverable response, re-apply not recharge | billing issue + success page | PASS user safety; P1 admin visibility |
| Renewal failure | retry metadata, backoff, billing runs | renewal route/subscription/Admin | PASS contract; live blocked |
| Provider unavailable | 503 fail-closed, no attempted charge | Production last 12 runs | PASS |
| Session partial completion | notes retained, completion retry explained | `sessionCompletionConsistency.ts` | PASS |
| Empty Library/data | clear empty/error/paywall states and next action | Library/classes/manage | PASS |

No reviewed unknown-payment path tells the user to blindly start another charge.

## 17. Security / Privacy

Read-only Production checks:

- All `public.spokedu_master_*` tables have RLS enabled.
- Billing runs, class schedule rules, entitlement grants and promotion invites intentionally have no client policies: RLS therefore fails closed for anon/authenticated roles.
- Security-definer MASTER functions grant execute only to `service_role`; PUBLIC/anon/authenticated had no execute grant in the audited result.
- Owner tables use `owner_id = auth.uid()` with write checks.
- Payment orders/webhook events deny client access; subscriptions expose own-select only; profile data is served through protected APIs.
- Billing keys are referenced through Vault; Production plaintext-key count is 0.
- Public Landing/OG assets exposed no student, email or institution PII in the rendered check.
- Server capabilities are enforced by `app/lib/server/spokeduMasterAccess.ts`; client access copy is not treated as authorization.

Supabase Security Advisor findings:

- INFO “RLS enabled, no policy” on intentional service-role-only tables above: expected fail-closed, no finding.
- WARN leaked-password protection disabled: MASTER uses passwordless OTP/Kakao, so this is not a MASTER launch blocker; retain as platform-hardening P2. [Supabase password security guidance](https://supabase.com/docs/guides/auth/password-security)

Performance advisor reported unindexed foreign keys including schedule rules and promotion/grant audit fields. Current population is small and no catastrophic latency was observed; monitor as P2 rather than distorting launch severity.

**Status: PASS. No new isolation, secret-exposure or direct-bypass finding.**

## 18. Performance / Accessibility

Production public checks at 1440/834/390 found no horizontal overflow or broken assets. Landing and login retained readable hierarchy and 44px-class controls. The application components use explicit empty/loading/error panels, keyboard-focus styles, labeled buttons and responsive bottom sheets; session/manage controls use 44px minimum targets.

Existing rendered artifacts and Surface Matrix cover Dashboard, Library, detail, manage/session, attendance, records, SPOMOVE, subscription/payment and onboarding at desktop/mobile. This audit did not claim a new protected populated visual PASS without credentials. No current evidence indicates a catastrophic runtime/mobile blocker.

**Status: PASS for launch blockers; PARTIAL for fresh credentialed rendered replay.** The latter belongs to external Auth E2E, not a redesign task.

## 19. Support

Landing/footer expose phone/email; Center has a distinct mail route. Payment cancel/success and non-billing subscription states link to customer support. FAQ covers device, plans, SPOMOVE, special education, recurring billing, cancellation and institutions.

The remaining material issue is incident context: payment support links do not provide a user-visible case/order reference or an operator UI for pending/recoverable first-payment orders. A customer can reach support, but first-line resolution may require engineering/DB assistance.

**Status: PARTIAL — P1.** This is not a P0 while Production has zero charged-not-applied orders and safe re-charge prevention exists.

## 20. Analytics / Observability

Production `commercial_funnel_events` exists, but the read-only route/name summary contains only non-MASTER public-site events (`dispatch`, `curriculum`, `private`, `other`). It does not provide a reliable MASTER funnel for landing visit → signup → onboarding → first value → return → upgrade click → checkout → payment → cancellation → renewal failure.

What is currently measurable:

- Auth provider adoption from Auth identities;
- onboarding completion from profiles;
- first/repeat product activity approximately from classes, sessions, records and favorites;
- checkout/payment/subscription outcomes from payment orders/subscriptions;
- renewal health from billing runs and retry fields;
- promo/invite state from grant/invite ledgers.

What is not reliably attributable: acquisition source and step-level drop-off before persisted domain events. **Status: PARTIAL — P1.** This limits launch learning, not transaction correctness.

## 21. Retention

The reason to return is visible in the product rather than delegated to campaigns:

- dashboard recent/continue;
- favorites and repeated Library use;
- schedule and today’s sessions;
- class continuity and attendance;
- records and next-session notes;
- “이전 수업으로 새 수업 만들기”;
- SPOMOVE reuse.

Production data (34 sessions, 17 completed, 41 favorites) supports real repeat behavior, though it does not establish cohort retention rates.

**Status: PASS product loop; PARTIAL measurement (covered by analytics P1).**

## 22. Center / Institution

Center remains sales-led. Landing and product surfaces route institutions to inquiry without presenting Center as self-serve or inventing package/entitlement truth. This is adequate for individual teacher launch.

**Status: PASS for current launch.** Detailed Center packaging remains P2 and must follow Product Decision DC-003, not this audit.

## 23. Commercial Readiness Matrix

| Area | Reference standard | MASTER evidence | Status | User impact | Severity | Action | Retest |
|---|---|---|---|---|---|---|---|
| Acquisition | Clear target, Free and paid paths | Production Landing/canonical/OG/links | PASS | Product and next step understood | — | None | Public smoke per release |
| Auth entry | One clear signup/login convergence | Production login, Kakao start, OTP code | PARTIAL | New completion unproven now | External | Execute fresh Kakao + mailbox OTP | Both reach onboarding/dashboard |
| Onboarding | Minimum setup to first value | 3 steps, optional context, explicit Free outcomes | PASS | Low setup cost | — | None | Fresh account timing |
| First value | Useful action within 3–5 minutes | Free lesson/Library/tools CTAs | PASS | Immediate value | — | None | Fresh account observation |
| Free | Durable useful tier, not fake trial | SSOT and UI | PASS | Trustworthy entry | — | None | Contract regression |
| Core loop | Complete approved workflow | code + populated Production DB | PASS | Teaching work completes | — | None | Credentialed smoke |
| Paywalls | Reason, plan and return path clear | derived public contract, safe next/plan | PASS | Upgrade intelligible | — | None | Live payment return |
| Initial billing | One charge, safe reconciliation | issue route/order recovery | EXTERNAL BLOCK | Cannot prove real money yet | External | Live A–F | Toss + DB + UI evidence |
| Renewal | Cron/retry/reconcile | active hourly cron, billing runs, renew route | EXTERNAL BLOCK | Cannot prove renewal yet | External | Live G–I | one charge per cycle |
| Live-key activation safety | No stale fixture charged | exact chargeable predicate = 0 | PASS | Avoids accidental charge | — | Recheck immediately before key activation | Same query = 0 |
| Cancellation | Period-end truth | cancel route, subscription copy | PARTIAL | Contract correct, real provider unproven | External | Live D/E | UI/DB/Toss agreement |
| Admin paid status | Paid/promo/effective + renewal | MASTER ADMIN | PASS | Most inquiries resolvable | — | None | Scenario script |
| Admin payment incidents | See pending/recoverable orders | active-only order filter | PARTIAL | Engineering needed for rare paid/no-access case | P1 | Add incident/order visibility in approved sprint | Simulate recoverable order |
| Failure recovery | State, money, retry are clear | charged/recoverable semantics | PASS | Prevents duplicate charge | — | Live confirm | timeout/apply-fail test |
| Security/privacy | Server enforcement, RLS, secrets | RLS/privileges/Vault/advisor | PASS | Data and payment keys protected | — | None | Advisor + bypass suite |
| Responsive/a11y | Core tasks usable on mobile/keyboard | public production + component evidence | PASS | No launch-blocking device exclusion | — | Credentialed spot-check | 390 populated smoke |
| Support | Clear channel + resolvable context | footer/payment support; weak incident context | PARTIAL | Slower billing incident resolution | P1 | Define first-line payment incident handoff | Operator drill |
| Funnel observability | Track conversion/retention failures | DB milestones but no MASTER funnel events | PARTIAL | Slower launch learning | P1 | Instrument only approved core milestones | Event-to-DB reconciliation |
| Retention | Product-native repeat reason | recent/favorites/schedule/records/SPOMOVE | PASS | Clear weekly return value | — | None | cohort analysis when instrumentation exists |
| Center | Separate sales path | dedicated inquiry, no invented package | PASS | Institutions have next step | P2 | Decide package only under DC-003 | Sales-path review |

## 24. P0 — Launch Blockers

**Count: 0 internal P0.**

No evidence of duplicate-charge risk, ineffective post-payment recovery, entitlement bypass, owner/tenant leakage, broken signup architecture, broken core workflow, false cancellation state, critical mobile/runtime failure, or material legal/payment disclosure error was found.

External live-verification items are not relabeled as internal defects.

## 25. P1 — Immediate Post-Launch

**Count: 3.**

1. **Payment incident visibility in MASTER ADMIN.** Show pending/failed/recoverable first-payment orders and reconciliation state so a normal “charged but no Premium” inquiry does not require DB/log access. Source: active-only filter in `app/api/admin/spokedu-master-admin/route.ts`.
2. **Structured support escalation for payment incidents.** Give support enough non-secret context to connect the user, order and state; keep retry language consistent with `charged/recoverable` truth.
3. **Minimal MASTER funnel observability.** Reliably distinguish landing, signup, onboarding complete, first value, return, upgrade, checkout, payment success, cancellation and renewal failure. Current DB can infer only persisted milestones and cannot measure acquisition/drop-off.

These are material commercial weaknesses but do not break the current approved journey or expose money/data under the observed state.

## 26. P2 — Growth / Hardening

**Count: 3.**

1. Decide deeper Center packaging only after DC-003 is approved.
2. Monitor/adapt the advisor-reported unindexed foreign keys as Production volume grows; no current performance blocker.
3. Review Supabase leaked-password protection at platform level if password auth is introduced; current MASTER OTP/Kakao path is unaffected.

Testimonials, referrals, annual billing and advanced marketing automation are deliberately not converted into findings.

## 27. External Blockers

1. **Toss:** production automatic-billing approval/MID/Live Key; first real 9,900 KRW charge; real renewal and failure/retry.
2. **Email:** newly requested OTP received and completed through a real mailbox.
3. **Kakao:** new credentialed OAuth completion. Start and historical Production usage are already proven.
4. **Invite:** real new-account signup → redeem → replay/atomicity exercise. Contract evidence is not a substitute.

The staging Supabase project is currently `INACTIVE`; live-verification planning must not silently assume it is available.

## 28. Final Launch Gate

### Ready when

1. Re-run the exact stale-charge predicate immediately before introducing live keys; result must remain 0.
2. Execute Live Billing Test Plan A–J and retain Toss/DB/UI evidence. Any duplicate charge, charged-but-unrecoverable state, false cancellation date or entitlement mismatch converts immediately to internal P0/HOLD.
3. Complete a fresh Email OTP E2E and fresh Kakao credentialed E2E; both must converge through onboarding/access to MASTER.
4. Complete invite signup → redeem → replay with a new real account.
5. Run one operator drill for charged-but-not-applied and renewal failure; log the P1 visibility limitation if it has not yet been fixed.

### Final status

- **COMMERCIAL ARCHITECTURE:** PASS
- **PRODUCT JOURNEY:** PASS
- **SECURITY:** PASS
- **OPERATIONS:** PASS
- **PRE-LIVE BILLING:** PASS
- **LIVE BILLING:** BLOCKED
- **AUTH LIVE E2E:** BLOCKED
- **OVERALL:** **A. READY EXCEPT EXTERNAL LIVE VERIFICATION**

### Evidence index

**Canonical/code**

- `docs/SPOKEDU_MASTER_PRODUCT_CONTRACT.md`
- `app/spokedu-master/lib/productCatalog.ts`
- `app/spokedu-master/lib/publicProductContract.ts`
- `app/spokedu-master/lib/masterAccessModel.ts`
- `app/lib/server/spokeduMasterAccess.ts`
- `app/spokedu-master/spomove/SPOMOVE_PRODUCT_CONTRACT.md`
- `docs/spokedu-master-commercial-runbook.md`
- `app/spokedu-master/onboarding/page.tsx`
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `app/spokedu-master/manage/session-detail/*`
- `app/spokedu-master/payment/*`
- `app/api/spokedu-master/payment/*`
- `app/api/admin/spokedu-master-admin/route.ts`

**Production/DB**

- `https://spokedu.kr/spokedu-master/landing`
- `https://spokedu.kr/spokedu-master/login`
- `https://spokedu.kr/api/spokedu-master/og`
- Supabase Production project `mwgvserdyflsqyhcqecp`, read-only aggregates captured 2026-10-03 KST.

**Test evidence**

- Audited commit: `dd5a024e7b6d498e2a4e8760ff03e4adce110a45`.
- Recent GitHub Actions evidence for that release line: MASTER QA run `37126985501`, TypeScript run `37126985504` in `spokedu77-ops/1`.
- Existing contract suites cover access matrix, billing UI/issue/renew/cancel, webhook/idempotency, session completion consistency and admin semantics. Tests were not modified or rerun to manufacture this audit verdict.

---

## Short Summary

**FINAL STATUS:** A. READY EXCEPT EXTERNAL LIVE VERIFICATION
**INTERNAL P0:** 0
**P1:** 3
**P2:** 3
**EXTERNAL BLOCKERS:** Toss live charge/renewal, fresh Email OTP, fresh Kakao completion, real invite redeem/replay
**TOP 5 FINDINGS:** internal P0 0; stale charge candidates 0; payment recovery is duplicate-safe; Admin hides non-active incident orders; MASTER funnel attribution is incomplete
**REFERENCE GAP:** no missing competitor feature blocks the core journey; the material gaps are incident operations and observability
**READY WHEN:** Live Billing A–J plus fresh Email/Kakao/invite E2E pass with Toss/DB/UI evidence
**NEXT:** recheck chargeable rows → install live credentials → Lite first charge → access/cancel/upgrade → renewal/failure/idempotency → Admin drill → Email/Kakao/invite E2E.
