# SPOKEDU MASTER — Product Audit Baseline

**Status:** Foundation snapshot (read-only audit)  
**Date:** 2026-08-20  
**Scope:** `app/spokedu-master`, related API routes, contract tests  
**Method:** Code evidence only; **UNKNOWN** where not verified

Companion: [Constitution](./SPOKEDU_MASTER_PRODUCT_CONSTITUTION.md) · [Decision Protocol](./SPOKEDU_MASTER_PRODUCT_DECISION_PROTOCOL.md)

---

## 1. Executive Summary

SPOKEDU MASTER is a **capability-gated professional loop**: discover lessons/activities → prepare → run (SPOMOVE) → record → report. Entitlement SSOT is `/api/spokedu-master/access`. Home 4+4 and SPOMOVE StartBriefing/no-public-autostart contracts are **strong and tested**. Main gaps: **continuity logic fragmentation** (`homeOpsModel` vs `masterUserLoop`), **free-tier journey clarity**, **Premium retention narrative in product** (not just copy), and **Center/Team journey UNKNOWN**.

---

## 2. Surface Matrix

Legend: **CS** = CONTRACT STATUS (KEEP / REFINE / REPLACE CANDIDATE / REMOVE CANDIDATE)

### 2.1 ENTRY

| SURFACE | JOB | PRIMARY USER QUESTION | PRIMARY ACTION | TARGET USER | CAPABILITY | STATE SOURCE | UPSTREAM | DOWNSTREAM | PERSISTENCE | CURRENT CONTRACT | UX RISK | COMMERCIAL | CS | EVIDENCE |
|---------|-----|----------------------|----------------|-------------|------------|--------------|----------|------------|-------------|------------------|---------|------------|-----|----------|
| Root `/spokedu-master` | PREPARE | 어디로 가야 하지? | redirect onboarding/dashboard | All authed | access snapshot | `page.tsx`, profile | login | onboarding or dashboard | profile persist | onboardingDone gate | Low | Acquisition | KEEP | `page.tsx` |
| Onboarding | PREPARE | 프로필 설정 | finish → dashboard | First user | none | store persist | root redirect | dashboard | Zustand persist | 4-step profile | Medium friction | Activation | KEEP | `onboarding/page.tsx` |
| Landing | DISCOVER | 뭐를 살 수 있지? | pricing CTAs | Anonymous/partial | public | static + catalog | marketing links | payment | none | Center = inquiry only | Low | Acquisition | KEEP | `landing/page.tsx`, `publicProductContract.ts` |
| EntitlementPreviewHome | FOLLOW-UP | 왜 막혔지? | 구독 선택 / 플랜 비교 | Free/expired | !hasMasterEntitlement | access snapshot | dashboard gate | payment, class-tools | none | editorial preview only (PD-004) | Misread as full home | Conversion | KEEP | `EntitlementPreviewHome.tsx` |
| Login | — | — | external `/login` | All | — | Supabase auth | AppShell 401 | return URL | session | AppShell redirect | UNKNOWN edge cases | — | KEEP | `AppShell.tsx` |

### 2.2 SHELL

| SURFACE | JOB | PRIMARY QUESTION | PRIMARY ACTION | CAPABILITY | STATE | CS | EVIDENCE |
|---------|-----|------------------|----------------|------------|-------|-----|----------|
| AppShell | RUN | 어디 탭? | nav + gate | route → capability | access, programs load | KEEP | `AppShell.tsx` |
| StatusBar | RUN | 온라인? 검색? | library search | hasMasterEntitlement for programs | operational online | REFINE (no lock parity) | `StatusBar.tsx` |
| TabBar | RUN | 기능 이동 | 6 tabs + 🔒 | `masterRouteAccess` | access snapshot | KEEP | `TabBar.tsx`, `masterNavLabels.ts` |
| SubscriptionGateWall | FOLLOW-UP | 왜 못 들어가? | 구독 선택/관리 | minimum plan from intent | gate context | KEEP | `SubscriptionGateWall.tsx`, `masterGateIntent.ts` |

Chrome hidden: onboarding, landing, payment, session, parent, terms.

### 2.3 HOME (Entitled Dashboard)

| SURFACE | JOB | PRIMARY QUESTION | PRIMARY ACTION | SECONDARY | STATE | UPSTREAM | DOWNSTREAM | CS | EVIDENCE |
|---------|-----|------------------|----------------|-----------|-------|----------|------------|-----|----------|
| Weekly shelf (4) | DISCOVER | 이번 주 뭐 하지? | card → library/detail | preview | programs API + weekly algo | entitlement | library, record | **KEEP (PD-001)** | `DashboardView.tsx`, `weeklyRecommendations.ts` |
| SPOMOVE shelf (4) | DISCOVER | 어떤 활동? | guideline/start | favorite | featured slot IDs + presets | home | spomove session | **KEEP (PD-001)** | `DashboardView.tsx`, `officialSpomovePresets.ts` |
| CompactOpsBar | REMEMBER/PREPARE | 뭐 이어하지? | anchor CTA | secondary link | drafts LS, today lesson, recent | prior sessions | class-record, report, library, spomove | KEEP | `CompactOpsBar.tsx`, `homeOpsModel.ts` |
| Today Lesson list | PREPARE | 오늘 수업? | **수업 준비** (PD-002) | remove today | Zustand persist, Seoul dayKey | library detail | library/[id] | **KEEP (PD-002)** | `todayLesson.ts`, `LessonCatalogCard` |
| ActivityPanel compact | FOLLOW-UP | 기록/안내문? | counts → report/record | — | ExplanationData, OperationalData | records | report, students | **KEEP (PD-003)** compact w/o plan badge | `DashboardView.tsx` L1137 |
| FirstStartGuide | DISCOVER | 처음 뭐 하지? | guided steps | — | heuristics empty state | first user | library, spomove | KEEP | `DashboardView.tsx` |
| Context programs (admin) | DISCOVER | 교실/미취학? | preview cards | — | program tags | admin | library | KEEP (admin-only) | `DashboardView.tsx` |

**Cross-surface:** `selectMasterLoopAction` (`masterUserLoop.ts`) computes next loop action but is **underused in UI** (header 「기록」 title only) → **REFINE (DC-001)**.

### 2.4 LIBRARY

| SURFACE | JOB | PRIMARY QUESTION | PRIMARY ACTION | STATE | DOWNSTREAM | CS | EVIDENCE |
|---------|-----|------------------|----------------|-------|------------|-----|----------|
| LibraryView | DISCOVER | 수업 찾기 | filter/search, **수업 준비** | store programs, favorites | detail, record | KEEP | `LibraryView.tsx` |
| LibraryDetailView | PREPARE | 어떻게 준비? | 오늘 수업 지정, 기록 시작, 지도안 복사 | today lesson, recent | class-record, report, spomove link | KEEP | `LibraryDetailView.tsx` |
| ProgramPreviewModal | PREPARE | 미리보기 | today toggle, open detail | modal state | detail | KEEP | `ProgramPreviewModal.tsx` |
| Pro-locked cards | FOLLOW-UP | 왜 잠김? | 프리미엄 자료 | isPremium | payment gate | KEEP | `LessonCatalogCard`, `commercialTierGate.contract.test.ts` |

### 2.5 SPOMOVE

| SURFACE | JOB | PRIMARY QUESTION | PRIMARY ACTION | STATE | CS | EVIDENCE |
|---------|-----|------------------|----------------|-------|-----|----------|
| SpomoveHubView | DISCOVER | 활동 고르기 | guideline / recent start | presets, recent, favorites | KEEP | `SpomoveHubView.tsx` |
| SpomoveGuidelineSheet | PREPARE | 설정 확인 | **이 설정으로 시작** → entry=start | sheet state | KEEP | `SpomoveGuidelineSheet.tsx` |
| Session page | RUN | 실행 | engine router | URL params, entry mode | **KEEP (PD-006)** | `session/page.tsx` |
| StartBriefing | PREPARE→RUN | 확인 후 시작 | **수업 시작** | cue speed, launch mode | KEEP | `StartBriefing.tsx` |
| Recent rerun | REMEMBER→RUN | 지난 설정? | **같은 설정으로 시작** / **다시 실행** | spomoveSnapshot | **KEEP (PD-005)** | Hub recent, `buildProgramResumeHref` |
| Public session href | — | — | **no autostart** | preset builder | KEEP | `publicOfficialPresetSessionHref` |
| Legacy autostart | RUN | — | autostart if no entry | URL | REPLACE CANDIDATE (DC-002) | `sessionEntryMode.ts`, contract doc |

**Do not classify by URL alone:** `entry=start` + `autostart=1` → Setup, not engine autostart.

### 2.6 RECORDS & FOLLOW-UP

| SURFACE | JOB | PRIMARY QUESTION | PRIMARY ACTION | STATE | CS | EVIDENCE |
|---------|-----|------------------|----------------|-------|-----|----------|
| class-record | FOLLOW-UP | 수업 기록 | save record | OperationalData API, drafts LS | KEEP | `class-record/page.tsx` |
| activity | REMEMBER | 뭐 했지? | list + 보강/안내문 | server records | KEEP | `activity/page.tsx` |
| report | FOLLOW-UP | 안내문 | copy/save explanation | ExplanationData, drafts | KEEP | `report/page.tsx` |
| students | REMEMBER | 학생 메모 | student hub | operational | KEEP | `students/page.tsx` |

Premium required for new records (`canCreateClassRecordFromSnapshot`).

### 2.7 ACCESS / MONETIZATION

| SURFACE | JOB | CAPABILITY SSOT | CS | EVIDENCE |
|---------|-----|-----------------|-----|----------|
| access API | — | library/records/spomove flags | KEEP | `masterAccessModel.ts`, `entitlementMatrix.contract.test.ts` |
| payment | FOLLOW-UP | Toss billing, gate context | KEEP | `payment/page.tsx` |
| payment success | FOLLOW-UP | poll access 6× | KEEP | `payment/success/page.tsx` |
| subscription | FOLLOW-UP | manage/upgrade | KEEP | `subscription/page.tsx` |
| profile | FOLLOW-UP | plan summary | KEEP | `profile/page.tsx`, `subscriptionSummary.ts` |
| shop (SPOMAT) | DISCOVER | premium member price | KEEP | `shop/page.tsx` |

**Tier matrix (verified in contract tests):**

| Tier | library | classTools | records | spomove |
|------|---------|------------|---------|---------|
| Free | ✗ | ✓ | ✗ | ✗ |
| Lite | ✓ | ✓ | ✗ | ✗ |
| Premium | ✓ | ✓ | ✓ | ✓ |
| Expired | ✗ | ✗* | ✗ | ✗ |

*GateWall blocks; verify class-tools free path in runtime QA.

**Center/Team:** `isCenterOrTeam` in snapshot; self-serve UX **UNKNOWN (DC-003)**.

### 2.8 TOOLS / ERROR / RESPONSIVE

| SURFACE | JOB | CS | EVIDENCE |
|---------|-----|-----|----------|
| class-tools | RUN (utility) | KEEP | `class-tools/page.tsx` |
| ErrorBoundary / client errors | RELIABILITY | KEEP | `ErrorBoundary.tsx`, `clientErrors.ts` |
| Mobile shell | RUN | REFINE (6-tab density) | TabBar `lg:hidden`, `pb-28` |
| SPOMOVE pad layout | RUN | KEEP | `StartBriefing`, launch mode |

---

## 3. End-to-End Journey Map

### J1 — New user: Home → lesson → prepare → record

| Step | Flow | Friction |
|------|------|----------|
| 1 | login → onboarding (4 steps) → dashboard | Onboarding length |
| 2 | Free: **EntitlementPreviewHome**, not 4+4 shelves | **COMMERCIAL GAP (DC-004)** — discovery only via preview/class-tools |
| 3 | Paid: FirstStartGuide → library → detail | OK |
| 4 | **수업 준비** → today lesson / prep | OK (PD-002) |
| 5 | class-record → report | Premium gate at record | OK |

**DEAD END risk:** Free user expects full home; sees paywall home.

### J2 — Returning user continuity

| Signal | Mechanism | Friction |
|--------|-----------|----------|
| Record draft | homeOps anchor priority 1 | OK |
| Report draft | priority 2 | OK |
| Prep draft | priority 3 | OK |
| Today lesson | priority 4; overrides bar | Multiple signals — user must infer priority **(DC-005)** |
| Recent SPOMOVE | anchor + hub | OK |
| masterUserLoop | not primary CTA | **DUPLICATED DECISION (DC-001)** |

### J3 — SPOMOVE new exploration

Hub → GuidelineSheet → `entry=start` → StartBriefing → engine. **No public autostart.** OK.

Phase 0: preset descriptions hidden on Hub — discovery thinner (documented in SPOMOVE contract).

### J4 — SPOMOVE recent rerun

Recent → snapshot href → StartBriefing → confirm → run. May skip Hub (**PD-005**). Fallback if snapshot incomplete: generic start — **LOST CONTEXT risk**.

### J5 — Lite repeat use

Library + tools; records/spomove walled with honest GateWall copy. OK.

### J6 — Lite → Premium encounter

Gate at record/spomove with journey context (`masterGateIntent`). OK.

### J7 — Premium repeat use

Full loop; SPOMAT shop if active. Retention depends on history/drafts — **strong if user records**.

### J8 — Team/Center

**UNKNOWN** dedicated UX; sales inquiry on landing. Badge in non-compact ActivityPanel only.

### J9 — Expired/cancelled

EntitlementPreviewHome + GateWall. Profile preserved. OK.

### J10 — Mobile/tablet field use

Bottom TabBar, carousels, session fullscreen, library detail hides StatusBar. **6-tab tight on small phones.**

---

## 4. Commercial Value Audit

### Paid capability → time saved

| Capability | Time/judgment saved | Context accumulated | Repeat speed |
|------------|---------------------|---------------------|--------------|
| Library | Lesson search/filter | favorites, recent video | faster re-find |
| Today lesson | “오늘 뭐 하지” | day-scoped assignment | same-day re-entry |
| Drafts (record/report/prep) | Resume incomplete work | localStorage per owner | **high retention** |
| Class records | Re-build attendance/memo | server history | activity/students |
| Report/explanations | Rewrite parent comms | saved explanations | copy again |
| SPOMOVE presets + recent | Re-configure activity | snapshot rerun | **PD-005 path** |
| SPOMAT member price | — | purchase history | UNKNOWN |

### Core questions

**“4 weeks later, without MASTER, what becomes annoying?”**

- Re-writing parent reports from scratch
- Re-finding last week’s lesson configuration for SPOMOVE
- Re-entering attendance patterns without student history
- Losing in-progress drafts (if user relied on them)

**“What gets repeatedly better in Premium vs Lite?”**

- Cumulative records + student memos
- SPOMOVE run + rerun with snapshot
- Report generation from records

**COMMERCIAL GAP:** Product UI does not always **surface** this delta at moment of Lite wall — GateWall copy is honest but **retention story** could be stronger in Home continuity (not fake recommendation).

---

## 5. Commercial Gaps (structural)

| ID | Gap | Impact |
|----|-----|--------|
| CG-001 | Free dashboard ≠ entitled home; path to class-tools not equally prominent | Acquisition confusion |
| CG-002 | `masterUserLoop` logic disconnected from visible Home CTA | Retention loop underpowered |
| CG-003 | Lite value clear; Premium **accumulation** value less visible before paywall | Upgrade conversion |
| CG-004 | Center/Team journey undefined in product | Enterprise leakage |
| CG-005 | Legacy autostart ambiguity | Trust if accidental run |

---

## 6. Prioritized Roadmap (implementation NOT in Foundation Sprint)

Scoring: Impact × Frequency × Criticality × Commercial leverage × Cross-surface leverage ÷ Risk

### P0 — Trust / data / misleading promise

| Item | Why P0 |
|------|--------|
| Any silent draft loss / false “saved” | Constitution § Reliability |
| UI claiming recommendation/personalization without contract | Product Truth |
| Accidental SPOMOVE autostart on public links | Safety (mitigated by contract; legacy DC-002) |

*No new P0 bugs filed in this read-only pass beyond known contract coverage.*

### P1 — Loop completion & retention

| Item | Leverage |
|------|----------|
| DC-001: Surface loop action OR remove dead `masterUserLoop` UI divergence | Home + all loop phases |
| DC-005: Clarify continuity priority in Home UX | Returning users |
| CG-003: Premium accumulation story at upgrade moments | Commercial |

### P2 — Polish & segment clarity

| Item | Notes |
|------|-------|
| DC-004: Free user entry clarity | EntitlementPreviewHome |
| StatusBar lock parity | Shell consistency |
| Mobile TabBar density | J10 |
| DC-006: subscription.ts vs snapshot cleanup | Tech debt |

### BACKLOG

| Item | Notes |
|------|-------|
| DC-002: Legacy autostart policy post-release | SPOMOVE contract |
| DC-003: Center/Team product journey | Sales-led |
| Admin context program empty states | Admin-only |

---

## 7. Decision Candidates (Pending — do not implement)

### DC-001 — masterUserLoop visibility

- **CURRENT:** `selectMasterLoopAction` used minimally; `CompactOpsBar` uses `homeOpsModel`
- **WHY WRONG:** Two continuity brains; loop action invisible
- **OPTIONS:** A) Wire loop to CompactOps primary B) Merge models C) Remove loop selector
- **RECOMMENDED:** A or B after journey review
- **DECISION:** PENDING

### DC-002 — Legacy autostart

- **CURRENT:** `?autostart=1` without `entry` still resolves true (`sessionEntryMode.ts`)
- **WHY WRONG:** Conflicts with Product Truth if linked externally
- **OPTIONS:** A) Keep B) Redirect to briefing C) Remove
- **RECOMMENDED:** B post-release
- **DECISION:** PENDING

### DC-003 — Center/Team UX

- **OBSERVED:** `isCenterOrTeam` badge; catalog contactRequired
- **UNKNOWN:** Self-serve surfaces
- **DECISION:** PENDING

### DC-004 — Free tier home clarity

- **OBSERVED:** EntitlementPreviewHome vs class-tools tab
- **DECISION:** PENDING

### DC-005 — Continuity signal UX

- **OBSERVED:** Priority in code (`homeOpsModel.resolveHomeAnchor`) but multi-signal UI
- **DECISION:** PENDING

### DC-006 — subscription helper SSOT

- **OBSERVED:** `lib/subscription.ts` vs `masterAccessModel.ts`; tests prefer snapshot
- **DECISION:** PENDING

---

## 8. Preserved Approved Decisions

See [Decision Protocol § Approved Product Decisions](./SPOKEDU_MASTER_PRODUCT_DECISION_PROTOCOL.md#6-approved-product-decisions-seed-registry): **PD-001 through PD-007**.

---

## 9. Evidence Index

| Area | Primary files |
|------|----------------|
| Access / entitlement | `lib/masterAccessModel.ts`, `access/MasterAccessProvider.tsx`, `entitlementMatrix.contract.test.ts` |
| Home | `dashboard/DashboardView.tsx`, `dashboard/homeOpsModel.ts`, `dashboard/CompactOpsBar.tsx`, `dashboard/EntitlementPreviewHome.tsx` |
| Loop | `lib/masterUserLoop.ts`, `dayLoop.contract.test.ts` |
| Library | `library/LibraryView.tsx`, `library/[id]/LibraryDetailView.tsx`, `lessonFlow.contract.test.ts` |
| SPOMOVE | `spomove/SpomoveHubView.tsx`, `spomove/session/page.tsx`, `spomove/session/sessionEntryMode.ts`, `spomove/SPOMOVE_PRODUCT_CONTRACT.md`, `spomove/spomoveFlow.contract.test.ts` |
| Records | `report/page.tsx`, `class-record/page.tsx`, `lib/saveDraftStorage.ts` |
| Shell | `components/layout/AppShell.tsx`, `TabBar.tsx`, `StatusBar.tsx` |
| Public product | `lib/publicProductContract.ts`, `lib/productCatalog.ts` |
| Commercial QA | `docs/spokedu-master-commercial-runbook.md`, `app/spokedu-master/docs/QA_CHECKLIST.md` |

---

## 10. Audit Limitations

- Runtime QA flows not executed (no-verify-shell; Foundation Sprint read-only)
- Server API internals referenced but not line-audited outside `spokedu-master`
- Content quality tiers (READY/NEEDS IMPROVEMENT) — partial via commercial runbook library-content QA; not re-run here

**Next step:** Product Owner reviews P1/P2 roadmap → approve Sprint Brief(s) → implementation sprints.
