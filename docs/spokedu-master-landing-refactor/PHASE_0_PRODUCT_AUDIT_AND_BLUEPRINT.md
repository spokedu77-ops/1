# SPOKEDU MASTER LANDING — Phase 0 Product Audit and Refactor Blueprint

**Status:** Phase 0 PASS  
**Audit date:** 2026-10-03 (Asia/Seoul)  
**Scope:** Read-only product, commercial, content, asset, Production, and reference audit. No Landing UI, entitlement, payment, auth, or persistence implementation is included.  
**Authority order used:** `docs/SPOKEDU_MASTER_PRODUCT_CONTRACT.md` → `app/spokedu-master/MASTER_VISUAL_SYSTEM.md` → `app/spokedu-master/MASTER_SURFACE_MATRIX.md` → domain/code SSOT.

## 1. Executive Summary

SPOKEDU MASTER is not merely a PE activity archive. The current code implements a teacher-facing operating product that helps an instructor discover an activity, prepare and schedule a class, run it with attendance and live tools, remember what happened through records, and follow up through a next-class note or parent notice. The canonical internal loop is **DISCOVER → PREPARE → RUN → REMEMBER → FOLLOW-UP** (`docs/SPOKEDU_MASTER_PRODUCT_CONTRACT.md`, §§1–4). Customer copy should translate that into ordinary teacher language rather than print the internal labels.

The present Landing states part of this value, but it is an early product summary rather than persuasive evidence. Its hero is a field photograph with three abstract proof cards; its “Stats” are labels disguised as metrics; the feature area compresses the whole product into three icon cards; there is no real product interface above the fold; there is no Free plan card; and the actual continuity from lesson discovery to next lesson is not demonstrated with the product screens that already exist in the repository.

The next Landing should lead with an unmistakable audience and outcome, then prove the full working sequence using actual product captures. Recommended external positioning:

> **유아·초등 체육수업을 찾고, 수업반과 일정에 담아 현장에서 운영하고, 기록을 다음 수업까지 이어가는 교사·강사용 수업 운영 서비스.**

SPOMOVE is a strong differentiator, but not the product’s main identity. It should receive one high-impact chapter (roughly 10–15% of the page’s narrative mass) after core preparation and live operation are understood. Special education should appear as a supported usage context grounded in adjustable difficulty, visual stimuli, repetition, varied movement activities, and SPOMOVE—not as a separate product or a clinical claim.

Phase 1 can begin from this document. P0 is a page-level rebuild that preserves product and commercial semantics, imports public product truth instead of duplicating plan facts, uses repository proof assets where sound, and schedules clean recaptures where existing images are stale or incomplete.

## 2. Current MASTER Product Truth

### 2.1 Canonical definition and operating loop

The Product Contract defines MASTER as a professional operating product for physical-education instructors. Its retention value is continuity and history, not simply more catalog content. The canonical loop is:

1. **Discover:** curated Home recommendations and Library search/filter help find a usable activity (`dashboard/DashboardView.tsx`, `library/LibraryView.tsx`).
2. **Prepare:** a program detail exposes equipment, setup, teaching method, script, and the action to add it to a scheduled Session (`library/[id]/LibraryDetailView.tsx`, `components/session/AssignProgramToSessionButton.tsx`).
3. **Run:** Classes, Students, schedule/agenda, Session activity composition, attendance, activity completion, and Class Tools support live delivery (`manage/**`, `classes/**`, `students/**`, `activity/**`, `components/ui/ClassToolsView.tsx`).
4. **Remember:** Session memo, per-student observation, capture, class record, and saved history preserve what happened (`activity/SessionCapturePanel.tsx`, `class-record/**`, `session-captures` and `class-records` APIs).
5. **Follow up:** next-session note/import and parent notice reuse prior context without copying historical attendance or records (`sessions/[sessionId]/next/**`, `report/page.tsx`, Product Contract §§23.3–23.4).

The end-to-end public explanation should therefore be: **수업 찾기 → 내 수업에 담기 → 수업반·일정에 연결 → 출석과 도구로 진행 → 메모·관찰·안내 남기기 → 다음 수업 준비에 다시 쓰기.**

### 2.2 Capability classification

| Classification | Capability | Evidence and public-use decision |
|---|---|---|
| A — exists and marketable | Curated weekly lessons and editorial discovery | `dashboard/DashboardView.tsx`; Home 4+4 is PD-001. Show as discovery proof, not personalization. |
| A | Library browse, search, filters, program detail, preparation media | `library/LibraryView.tsx`, `library/[id]/LibraryDetailView.tsx`. Core acquisition story. |
| A | Favorites for entitled users | `favorites/**`, `program-favorites` and `favorites` APIs. Supporting retrieval feature, not a hero promise. |
| A | Classes, roster, students, schedule/agenda/calendar | `classes/**`, `students/**`, `manage/**`, `activity/MonthSessionCalendar.tsx`. Core operating proof. |
| A | Add/reorder/complete program or SPOMOVE activities within a Session | `sessions/[sessionId]/programs/**`, Product Contract §23.6. Core prepare/run continuity. |
| A | Attendance and mark-all-present | `sessions/[sessionId]/attendance/route.ts`, Product Contract §§23.1, 23.6. Lite and above. |
| A | Class Tools: stopwatch, timer, scoreboard, random picker, teams, order, tournament/ladder | `components/ui/ClassToolsView.tsx`, class-tools contracts. Free availability is real; specific participant scoping must not be simplified. |
| A | Session memo, student observation, next-session note, class records | `SessionCapturePanel.tsx`, `class-record/**`; Premium. Use “기록” and concrete examples, not analytics claims. |
| A | Parent notice save/copy | `report/page.tsx`, `sessions/[sessionId]/parent-notice/route.ts`; Premium. It is authored/saved text, not an automatic messaging service. |
| A | SPOMOVE browse/start/confirm/run | `spomove/**`, `SPOMOVE_PRODUCT_CONTRACT.md`; Premium runtime. Market as screen-based movement extension. Never imply autostart (PD-006). |
| A | SPOMAT Premium member benefit | `productCatalog.ts` (`canBuySpomatAtMemberPrice`), `shop/**`. Say member price eligibility only; public contract intentionally does not publish SPOMAT prices. |
| A | Direct monthly Lite/Premium purchase, subscription management, cancellation reservation | `productCatalog.ts`, `payment/**`, `subscription/**`, billing APIs. Commercially essential. |
| A | Center/institution inquiry | `publicProductContract.ts`, `businessInfo.ts`. Sales-led CTA, not a fourth self-serve subscription tier. |
| B — exists, not a Landing core value | Profile/onboarding, install/PWA, account settings, service status | Necessary support surfaces; mention only when explaining Free entry or trust. |
| B | Recent activity/value summary and subscriber evidence | `value-summary` API and dashboard panels. Useful in-product retention UI, weak external proof without verified aggregate data. |
| B | Lesson-plan copy/print/export helpers | Real supporting affordances, but not the product’s differentiator. |
| C — internal/admin | Program editor, grants/invites/billing administration, QA bypasses/scripts, audit reports | Never market to customers. Admin screenshots under `artifacts/master-admin/**` are excluded. |
| D — stale or inconsistent | `MASTER_PRODUCT_FLOW = DISCOVER/BUILD/TEACH/CAPTURE/REUSE` | `lib/masterProductTruth.ts` conflicts with the newer canonical Product Contract. Do not use it for Landing copy; cleanup requires a separate approved scope. |
| D | Recurring schedule controls/backend artifacts | Product Contract §23.5 explicitly says recurrence is not a current product surface. Do not advertise. |
| D | Generic claims of recommendation, matching, AI, real-time or automation | Product Contract §7 prohibits them without backing behavior/data. |
| D | Existing Landing “유아~중등” stats-like claim | Primary approved audience is 유아·초등; the generic range is not persuasive and dilutes targeting. Remove from hero proof. |
| E — does not exist | Automatic parent delivery/messaging | Parent notice can be written, saved, and copied; no evidence of automatic send. |
| E | AI-generated lesson planning/personalized recommendations | No approved product truth. |
| E | Center self-serve purchase | DC-003 remains pending; Center is inquiry only. |

### 2.3 Exact Operating Loop and handoffs

The executable flow is not a single wizard. Library can be explored independently; when a scheduled Session context is present, an activity can be added to that Session. The operational object is the Session, attached to a Class and date/time. During a Session, attendance and program completion are distinct states; SPOMOVE engine completion does not automatically complete the activity; completing activities does not complete the Session. Records are Premium and flow back into later preparation via previous-session memory, next-session note/import, and parent notice. This distinction is protected by the Product Contract and must survive simplified marketing diagrams.

## 3. Free / Lite / Premium Product Matrix

Authority: server capability snapshot in `app/lib/server/spokeduMasterAccess.ts`, mirrored in `lib/masterAccessModel.ts`; prices/product availability in `lib/productCatalog.ts`; public language/handoffs in `lib/publicProductContract.ts`.

| Capability | Free | Lite — ₩9,900/month | Premium — ₩28,900/month | Center/Team |
|---|---:|---:|---:|---:|
| Library browse/search | Yes | Yes | Yes | Yes |
| Full Library use | No; designated free preview program only | Yes | Yes | Yes |
| Favorites | No effective save/use in current UI (`canUseLibrary` required) | Yes | Yes | Yes |
| Classes / Students / Schedule | Not entitled as an operating workflow | Yes | Yes | Yes |
| Attendance | No | Yes | Yes | Yes |
| Class Tools | Yes | Yes | Yes | Yes |
| Records / observations / saved continuity | No | No | Yes | Yes |
| Parent notice | No | No | Yes | Yes |
| SPOMOVE browse/runtime | Public/editorial previews may exist; runtime not entitled | No | Yes | Yes |
| SPOMAT member price | No | No | Yes while paid Premium is active | Not promised by catalog |
| Payment | None | Direct monthly recurring card billing | Direct monthly recurring card billing | No direct payment |
| Subscription management | N/A | Yes | Yes | Sales-managed context |
| Entry | Login → onboarding; tools + Library browse + one designated full preview | Direct purchase or upgrade path | Direct purchase / prorated Lite upgrade | Email inquiry |

Important wording constraints:

- Free is **not** a free Lite plan: it is Class Tools, Library browsing, and one designated full program experience (`publicProductContract.ts`, `onboarding/page.tsx`). DC-004 means its broader journey remains a pending product decision; the Landing can accurately explain today’s scope without inventing a new journey.
- Lite is the complete weekly operating base: Library full use plus Classes/Schedule/Attendance/Class Tools.
- Premium adds the connected memory/follow-up layer and SPOMOVE, not merely a larger catalog.
- Center is not a peer-priced fourth card. Present it after pricing as a separate institutional inquiry.
- Phase 1 must consume `getPublicProductContract()` and catalog helpers. No price, purchasability, Center mode, or SPOMAT eligibility literal should be added to Landing.

## 4. Current Landing Audit

Source: `app/spokedu-master/landing/page.tsx`; login-aware banner: `LandingLoggedInBanner.tsx`; billing contract: `landingBillingCopy.contract.test.ts`. Production returned HTTP 200 on 2026-10-03 with the same title, `robots=index, follow`, and `/api/spokedu-master/og`; no canonical link was present in returned HTML.

| Current section | Decision | Findings |
|---|---|---|
| Sticky Nav | KEEP + REWRITE | Login/start paths and logged-in re-entry are sound. Add compact in-page anchors only if they do not crowd 390px. “시작하기” should become explicit Free entry. |
| Hero | REBUILD | Audience is absent; the largest text is only the brand name. Field image supplies atmosphere but not proof. Add teacher-first outcome and real product interface crop. Keep billing microcopy near pricing, not as the hero’s last word. |
| `HERO_PROOF` | DELETE | “가입 이유/매일 쓰는 이유/계속 쓰는 이유” are internal abstractions without external evidence. They consume above-fold attention that should show the product. |
| `STATS` | DELETE | Values such as “라이브러리”, “프리미엄”, “유아~중등”, “실내·실외” are categories, not statistics. The numeric visual grammar falsely implies quantitative proof and weakens trust. Replace only with verified field/customer evidence or omit. |
| `FLOW` | KEEP + REWRITE | The three-step idea is directionally correct, but “Session” is internal language and the real five-part loop is compressed too early. Recast as a screenshot-backed workflow with truthful handoffs and a clear records/Premium boundary. |
| `FEATURES` | REBUILD | Three icon cards hide product maturity and flatten Library, SPOMOVE, and operations into equal generic features. Replace with chapters anchored by actual UI. Core lesson work must precede SPOMOVE. |
| `PRICING` | REBUILD | Correctly uses catalog price/value helpers for Lite/Premium and separates Center inquiry, but omits Free, does not provide a fast comparison, and “가장 인기” has no verified evidence. Remove unsupported popularity badge. Use public contract SSOT. |
| Final CTA | KEEP + REWRITE | Correct login/onboarding routes. Rewrite around Free’s exact scope and current user state; remove generic “시작하기.” |
| Footer | KEEP + REWRITE | Business/legal fields are present and SSOT-backed. Improve hierarchy and preserve all Toss-required information; add explicit recurring-billing links/context where appropriate. |
| Logged-in banner | KEEP + REFINE | Useful re-entry. Keep destination based on onboarding completion; visually reduce so it does not displace the public proposition. |
| Metadata/OG | REBUILD | Landing override is indexable and has OG/Twitter, but canonical is absent, hero alt still says “플랫폼,” and OG is a generic dark text graphic rather than product proof. |

Five-second verdict: a visitor can infer “PE operations,” but cannot immediately tell **who** it is for, see **what the product looks like**, understand **Free**, or distinguish Lite from Premium in outcome terms. On mobile, the tall brand-first hero, proof cards, and two full-width CTAs delay concrete proof.

## 5. Reference Research

Research was performed against official public pages on 2026-10-03. Dynamic content and campaigns can change; Phase 1 should use the extracted principles, not copy text or layouts.

| Service and exact page | Observed pattern | Relevant principle for MASTER |
|---|---|---|
| ClassDojo — https://www.classdojo.com/ and https://www.classdojo.com/teachers/ | Short community outcome, immediate “free for teachers,” product/real-class visuals, community proof, privacy, final CTA, FAQ. | Say who it is for in teacher language; make Free unambiguous; use real classroom/product proof and trust near conversion. |
| Seesaw — https://seesaw.com/ | Audience/use-case framing, learning workflow, product captures, school CTA separated from teacher entry. | Keep individual teacher path distinct from institutional inquiry. |
| Kahoot! Schools — https://kahoot.com/schools/ and https://kahoot.com/schools/how-it-works/ | Outcome-led hero, free teacher CTA, create → host → assign → report sequence, real UI and classroom images, research/customer proof, pricing and FAQ. | Demonstrate the loop as actions with screens; pair field evidence with product evidence; separate Free and school inquiry. |
| Nearpod — https://nearpod.com/ | Teacher pain (prep/engagement/insight) mapped to product stages, lesson preview imagery, free entry and institutional CTA. | Connect “매번 처음부터 준비” to specific workflow relief, not a feature grid. |
| Canva Education — https://www.canva.com/education/ | Clear eligibility/audience, prominent free promise, product examples by task, proof/testimonials, FAQ, institutional branch. | State audience and scope precisely; use task-oriented sections and a comprehensive FAQ. Do not imitate “all-in-one.” |
| TeamBuildr — https://www.teambuildr.com/ and https://www.teambuildr.com/features | Coach-specific headline, platform screenshot, use cases, customer/organization proof, explicit program → deliver → track sequence, trial vs demo split, detailed FAQ. | Speak to instructors as professionals; show the daily operating sequence; route individual and institution CTAs differently. |
| TrainHeroic — https://www.trainheroic.com/strength-coach-platform/ | Coach pain and identity, product screens next to roster/programming/messaging use, real athlete/coach context. | Make workflow evidence dominant and preserve professional coaching tone. |
| CoachNow — https://coachnow.io/ | Coaching relationship/workflow narrative, media feedback proof, plan/value framing. | Describe continuity as better follow-through, not “data accumulation.” |
| TeamSnap — https://www.teamsnap.com/ | Schedule/communication/roster jobs, family/team proof, free/paid paths, mobile-oriented product demonstration. | Present schedule and roster as concrete field jobs; keep mobile operating value visible. |
| Spond — https://www.spond.com/ | Simple club/team operations language, mobile screenshots, trust and free entry, club-management branch. | Use plain operational verbs and separate organization adoption. |
| PlayMetrics — https://www.playmetrics.com/ | Club operating system narrative, role-based workflows, organization proof, demo CTA. | Relevant only to Center follow-up; do not let organization complexity dominate the teacher page. |
| Linear — https://linear.app/ | Very short category statement, live-looking interface immediately beneath hero, workflow chapters with large UI crops, proof before final CTA. | Use the actual interface as the primary visual language and give each chapter one decisive product state. |
| Notion Product — https://www.notion.com/product | One-line outcome, Free + demo split, three job chapters, product imagery, quantitative/customer proof, final CTA. | Keep message architecture shallow and CTA modes explicit. Use no stats until SPOKEDU has verified numbers. |
| Framer — https://www.framer.com/ | Product-in-use hero, large editorial typography, alternating deep product demonstrations, strong responsive media treatment. | Combine editorial public-site rhythm with actual UI; avoid generic icon tiles. |
| Webflow — https://webflow.com/ | Outcome hero, product visuals, capability chapters, customer stories, enterprise path, FAQ/final CTA. | Build scroll rhythm from claim → interface → outcome → proof rather than feature density. |

## 6. Reference Pattern Extraction

The principles to bring into SPOKEDU are:

1. **ClassDojo / Seesaw:** teacher-readable language and a Free promise understood without plan archaeology.
2. **Kahoot / Nearpod / Canva Education:** explain the product as teacher jobs and classroom moments, not internal systems terminology.
3. **TeamBuildr / TrainHeroic:** professional coach identity, real workflow, and field proof; software supports expertise rather than replacing it.
4. **TeamSnap / Spond:** roster, schedule, attendance, and communication are concrete daily operations best shown in mobile/desktop UI.
5. **Linear / Framer / Webflow:** interface-first visual proof, large intentional crops, one product idea per scroll chapter, and disciplined whitespace.
6. **Notion:** short headline, clear Free/organization CTA split, and outcome-led plan narrative.
7. **SPOKEDU-specific:** field expertise, authored PE programs, real instructional stills, SPOMOVE, and SPOMAT provide category-specific credibility competitors cannot lend.

Recommended scroll rhythm: **teacher pain → real MASTER overview → discover/prepare → run → remember/follow up → SPOMOVE differentiation → field evidence → plans → FAQ → CTA/legal**. On desktop, alternate media-led chapters; on mobile, claim → crop → 2–3 evidence bullets → optional CTA.

## 7. Internal Asset Inventory

### 7.1 Product UI and captures

| Asset | Status | What it proves / proposed use | Risks and notes |
|---|---|---|---|
| `public/images/spokedu/home/field-editorial/home-master-ui.png` (1024×795) | READY with minor crop | Real Home: continuity, weekly lessons, SPOMOVE. Hero/overview proof. | No visible PII. 1024px is adequate for a bounded hero crop, not full-bleed retina. Verify current production UI before shipping. |
| `public/images/spokedu/subscription/library-program-cards.png` (1280×726) | READY | Real Library filter/catalog density. Library chapter. | No PII; strong desktop proof. Text becomes too small on mobile, so use a focused crop. |
| `public/images/spokedu/subscription/prepare-class-tools.png` (1280×719) | READY | Real Class Tools stopwatch and tabs. Run-the-class chapter. | No PII. Desktop only; recapture a 390 mobile tool state for responsive proof. |
| `public/images/spokedu/subscription/prepare-lesson-plan.png` (1280×918) | READY / CROP | Program detail, setup image, checklist/script, record/notice actions. Prepare chapter. | No PII. Crop should preserve instructional image and text relationship. |
| `public/images/spokedu/subscription/prepare-dishcone-bingo.png` (1280×694) | READY / CROP | Actual lesson program detail alternate. | Confirm current labels and avoid redundant use. |
| `public/images/spokedu/subscription/product-lesson.png` (1296×748) | CROP/PROCESS | Older lesson/product state. | Compare against current detail before use; likely superseded by `prepare-lesson-plan.png`. |
| `public/images/spokedu/subscription/product-library.png` (1216×430) | CROP/PROCESS | Wide Library strip. | Too shallow for a main section; possible supporting strip only. |
| `public/images/spokedu/subscription/product-dashboard.png` (1312×238) | NOT SUITABLE | Narrow dashboard strip. | Insufficient vertical context and weak marketing proof. |
| `public/images/spokedu/subscription/product-library-public-capture.jpg` (1024×703) | RECAPTURE | Public Library state. | Compression and 1024px ceiling; use only as fallback. |
| `artifacts/master-admin/**` | NOT SUITABLE | Internal membership, grants, billing admin. | Internal/admin data and irrelevant audience. Never expose. |
| Current Schedule/Attendance/Session/Records UI | RECAPTURE | Essential operating-loop proof. | No clean repository marketing captures found. Produce sanitized desktop 1440/1024 and mobile 390 states with non-identifying fixtures. |
| Current SPOMOVE Hub/Start/Run UI | RECAPTURE | Strong differentiation. | Existing field images prove use, not current product controls. Capture Hub + Start confirmation + one runtime frame; preserve no-autostart semantics. |

### 7.2 Field, instructional, and physical-product assets

| Asset family | Status | Use | Notes |
|---|---|---|---|
| `public/images/spokedu/home/field-editorial/home-hero-field.webp`, `home-hero-gym-motion.jpg` | READY | Hero/supporting field layer | Actual field imagery; do not let it replace product UI. Check release/consent provenance in `public/images/spokedu/SOURCES.internal.md`. |
| `home-hero-inclusive.webp`, `home-case-adapted-p05.webp` | READY with copy guard | Special-education usage context | Use alongside modest claims about adaptation/repetition/visual cues; no outcome or diagnostic claims. |
| `home-spomove-field.webp`, `home-spomove-dive-field.webp`, `home-case-spomove-p05.webp` | READY | SPOMOVE field proof | Pair with real current UI/runtime capture. |
| `home-service-institution.jpg`, `home-service-private.jpg` | READY | Center/teacher field proof | Use only where the scene matches the claim. |
| `public/images/spokedu-master/programs/funstick-fencing/hero.jpeg` (5712×4284), `gallery-1.jpeg` (4032×3024), `setup.png` (3240×2040) | READY / PROCESS | High-resolution authored program/setup proof | Strong detail/media integrity. Process derivatives without cover-cropping instructional information. |
| `public/images/spokedu/programs/**` and `public/images/spokedu/records/**` | CROP/PROCESS | Field/editorial proof options | Select only documented, relevant records; do not imply customer endorsement without approval. |
| `public/images/spokedu/brand/spomat.png`, `spomat-diamond-cutout.png`, `spomat-layout.png` | READY / PROCESS | Small SPOMAT member-benefit proof | Show the actual physical product. Keep subordinate to MASTER and do not publish an unapproved public price. |
| SVG placeholder program heroes | NOT SUITABLE | None | Placeholder/graphic proof cannot substitute for real product/activity imagery. |

The target asset ratio remains sound: **actual product UI 60–70%, field imagery 20–25%, graphic/icon/copy support 10–15%**. Icons may label small facts but may not carry the sales narrative.

## 8. Target Audience

**Primary:** kindergarten/daycare PE teachers, elementary teachers, specialist PE teachers, freelance/after-school PE instructors, and center instructors who directly prepare and run classes. Lead with the person doing tomorrow’s preparation, not procurement.

**Secondary:** special educators, adapted/special PE instructors, and instructors serving children with developmental disabilities. Include them through truthful usage contexts: adjustable difficulty, visual stimulus, repetition, level-based application, SPOMOVE, and varied movement activities. Do not present MASTER as a special-education-specific product or claim therapeutic outcomes.

**Tertiary:** centers, schools, institutions, and public agencies. Use a distinct “센터·기관 도입 문의” CTA after individual plans and in the footer; no invented Center price or self-serve checkout.

## 9. Product Positioning

- **WHO:** 유아·초등 체육수업을 직접 준비하고 운영하는 교사와 강사.
- **PROBLEM:** 매 수업마다 활동을 처음부터 찾고, 명단·일정·출석·진행 도구·기록을 따로 관리하느라 준비와 후속 운영이 끊기는 문제.
- **PRODUCT:** 검증 가능한 체육활동 Library, 수업반·일정·출석·현장 도구, 기록과 안내문, SPOMOVE를 실제 수업 흐름으로 연결한 웹 서비스.
- **DIFFERENCE:** 자료를 읽고 끝나는 사이트가 아니라, 고른 활동을 실제 수업에 담아 운영하고 그날의 맥락을 다음 수업에 다시 쓰게 한다.
- **WHY SPOKEDU:** 저장소의 실제 현장·프로그램 사진, authored setup media, SPOKEDU 수업 콘텐츠, SPOMOVE와 SPOMAT이라는 물리/디지털 교육 자산이 제품 UI와 연결되어 있다. 수치나 기관명을 새로 주장하지 않고 이 증거 자체를 보여준다.
- **WHY PAY:** Lite는 매주의 수업 찾기와 운영을 지속 가능하게 하고, Premium은 기록·안내·다음 수업 기억과 SPOMOVE까지 연결해 준비가 다시 처음으로 돌아가지 않게 한다.

Approved external definition:

> **SPOKEDU MASTER는 유아·초등 체육수업을 찾고, 수업반과 일정에 담아 현장에서 운영하고, 기록을 다음 수업까지 이어가는 교사·강사용 수업 운영 서비스다.**

## 10. Message Architecture

This is a hierarchy, not final sales copy.

| Message role | Direction |
|---|---|
| Hero eyebrow | `유아·초등 체육 교사와 강사를 위한 수업 운영` |
| Hero headline | Outcome-first: “수업을 찾는 데서, 다음 수업을 준비하는 데까지.” Keep to two Korean lines at 390px. |
| Hero support | Find an activity, attach it to a class/date, use attendance/tools on site, and leave context for next time. |
| Primary CTA | `Free로 시작하기` → login with onboarding return. |
| Secondary CTA | `실제 화면으로 보기` → product overview anchor; login remains in nav. |
| Library value | “오늘 조건에 맞는 활동을 빨리 찾고, 준비 방법까지 확인.” |
| Class building value | “고른 활동을 수업반과 날짜에 담아 오늘 수업으로 구성.” |
| Operations value | “명단·출석·활동·타이머와 팀 나누기를 현장에서 이어서 사용.” |
| Records value | “메모와 관찰, 다음 수업 노트를 남겨 다음 준비가 처음부터 되지 않게.” |
| SPOMOVE value | “화면 신호를 보고 몸으로 반응하는 디지털 움직임 활동을 수업에 확장.” |
| Special-education value | “난이도와 반복을 조절하고 시각 자극과 다양한 움직임을 수업 수준에 맞게 활용.” |
| Field proof | “현장에서 만든 활동과 도구가 실제 MASTER 화면 안에서 연결된다.” Avoid unverified scale stats. |
| Free | Browse the Library, use Class Tools, and experience one designated lesson in full. |
| Lite | Full Library plus classes, schedule, attendance, and live tools—the weekly operating base. |
| Premium | Lite plus records, observations/notices/next-class continuity, SPOMOVE, and Premium SPOMAT member benefit. |
| Final CTA | “다음 수업 하나부터 Free로 확인.” Separate returning-user login and Center inquiry. |

Forbidden/limited customer language: 플랫폼, 솔루션, Session, Operating Loop, AI, 자동 추천, 개인화, 실시간, 스마트. Use `수업`, `수업반`, `일정`, `출석`, `활동`, `기록`, `다음 수업` instead.

## 11. Proposed Landing IA

| # / section | Goal and user question | Message/evidence/CTA | Desktop | Mobile | Keep/remove condition |
|---|---|---|---|---|---|
| 01 Hero | “나를 위한 제품인가, 무엇이 달라지는가?” | Audience eyebrow, outcome headline, support, Free CTA, actual Home/UI crop over restrained field image. | 5:4 copy/UI split; one primary. | Copy first, focused UI crop below; CTAs stacked; no proof-card tower. | Must pass 5-second audience/product test. |
| 02 Product overview | “자료 사이트가 아니라는 증거는?” | Six plain verbs across one screenshot-backed route: 찾기→담기→일정/출석→진행→기록→다음. | Horizontal progression plus UI fragments. | Vertical numbered sequence; no tiny montage. | Remove any step unsupported by actual route. |
| 03 Find & prepare | “오늘 쓸 활동을 빨리 찾고 준비할 수 있나?” | Library filter capture + program detail/setup capture. CTA `Free에서 수업 보기`. Plan: Free browse/one preview; Lite+. | Two large alternating crops. | Search/filter crop then detail crop. | Keep only current captures. |
| 04 Build your class | “고른 활동을 내 반과 날짜에 어떻게 연결하나?” | Session/class/schedule capture, truthful add-to-session transition. Plan: Lite+. | UI workspace with short annotations. | One step per screen; avoid full desktop shrink. | Recapture required before launch. |
| 05 Run the class | “현장에서 무엇을 바로 쓰나?” | Attendance + Session + Class Tools real captures. Plan: Lite for operating flow; Class Tools Free. | 2/3 live UI + compact evidence rail. | Tabs/carousel or stacked focused crops, 44px controls. | Never imply activity completion = Session completion. |
| 06 Remember → next class | “수업 후 기록이 실제로 어디에 쓰이나?” | Memo/observation, parent notice save/copy, next-session note/import. Plan: Premium. | Before/after continuity pair. | Sequence cards with readable text. | Never claim automatic parent delivery or copied attendance. |
| 07 SPOMOVE | “MASTER만의 움직임 확장은?” | Field image + Hub/Start/runtime product captures. CTA to learn/plan; Premium. | Controlled deep-navy chapter, not a second hero. | One strong field frame + one UI state; no autoplay. | 10–15% narrative mass; must not outrank Library. |
| 08 Inclusive use context | “다양한 수행 수준에 적용 가능한가?” | Inclusive/adapted field image; difficulty/repetition/visual-stimulus examples supported by real content. | Editorial image/text; no separate product branding. | Short section after SPOMOVE. | Remove any therapeutic/outcome claim. |
| 09 Field proof | “왜 SPOKEDU를 믿을 수 있나?” | Actual authored program/setup, field scenes, SPOMAT object. No fake metrics or unapproved logos/testimonials. | Image-led editorial grid. | Swipe/stack with captions. | If consent/provenance is not clear, use only owned product/setup images. |
| 10 Plans | “Free로 무엇을 하고, 왜 결제하나?” | Free/Lite/Premium outcome cards from public contract; comparison rows; separate Center inquiry. | Three cards + compact matrix; Premium not artificially dominant by unsupported popularity. | Recommended order Free→Lite→Premium; sticky comparison labels or accordions. | All commercial facts from SSOT. |
| 11 FAQ | “시작·결제·해지·기기·플랜 질문은?” | Free scope, Lite/Premium, monthly billing, first charge, cancellation/end date, SPOMOVE equipment, Center, special-use caveat. | 2-column or single 760px accordion. | Single accordion with 44px targets. | Answers must link to code/legal truth. |
| 12 Final CTA | “지금 무엇을 하면 되나?” | Free CTA, login, Center inquiry; concise trust line. | Centered outcome + two paths. | One dominant Free CTA, text login/inquiry. | Preserve state-aware re-entry. |
| 13 Business/legal | “판매자와 정책을 확인할 수 있나?” | Full business info, terms, privacy, contact, recurring billing summary. | Structured footer. | Stacked readable definitions. | Mandatory for Toss/customer trust. |

## 12. Visual Direction

- Combine the MASTER application’s cool-neutral surfaces, accent blue, restrained green, type, radius, spacing, and genuine UI with the public site’s large type, whitespace, image strength, and editorial scroll.
- Landing may use darker framing, but product screenshots should retain their real light/dark surfaces. Do not recolor or fabricate UI.
- The hero visual is a real UI crop, supported—not replaced—by a real field image.
- Follow media integrity: authored program/setup plates remain fully visible; do not `object-cover` away spatial/equipment information (`MASTER_VISUAL_SYSTEM.md`, Program Media Integrity).
- Use blue only for actual primary actions, green for positive/field support, and deep navy only for the bounded SPOMOVE chapter.
- Remove decorative uppercase, 10px pseudo-stat labels, nested cards, generic feature icons, and unsupported badges such as “가장 인기.”
- Create marketing crops from current product captures, not AI-generated interface imagery.

## 13. Responsive Strategy

Treat 1440, 1024, 834, and 390 as separate compositions:

- **1440:** editorial max width around 1120; 5:4 hero split; large product crops remain readable; pricing shows three plans and comparison context without excessive side whitespace.
- **1024:** reduce crop width, not text legibility; Hero UI may overlap lightly but cannot obscure task labels. Two-column chapters remain only where both panels exceed readable width.
- **834:** switch most chapters to vertical claim→proof; pricing may remain two-up only if Premium/Free comparison is not split; otherwise stack.
- **390:** two-line headline, one dominant Free CTA, no desktop screenshot scaled to illegibility. Every product chapter gets an intentional mobile crop. Plan cards stack Free→Lite→Premium; comparison becomes grouped accordions/rows. SPOMOVE shows one field frame plus one Start/runtime crop. FAQ controls are at least 44px. Footer uses stacked `<dl>` groups.

Required Phase 1 rendered QA: populated screenshots at all four widths; side-by-side desktop/mobile review; verify hero crop, Library detail, class-building proof, Attendance/Class Tools, records continuity, SPOMOVE, pricing, FAQ, and final CTA. Static checks alone are not a visual PASS.

## 14. Commercial / Toss Requirements

| Requirement | Current evidence | Phase 1 action |
|---|---|---|
| Service description | Landing metadata/body | Rewrite to the approved teacher-facing definition. |
| Product prices | Catalog-backed Lite/Premium cards | Continue SSOT consumption; add Free from public contract. |
| Monthly automatic billing | Landing and `payment/page.tsx` | State near pricing and checkout CTA. |
| First payment structure | `payment/page.tsx`: card billing auth and monthly plan; Lite→Premium server quote | FAQ must distinguish new purchase from prorated Lite upgrade; do not calculate client-side. |
| Cancellation available | `subscription/page.tsx`, cancel API | State “언제든 해지 예약.” |
| Access until paid period end | Subscription cancellation modal and Landing line | Preserve exact meaning. |
| Seller/business information | `lib/businessInfo.ts` | Render business name 스포키듀, representative 최지훈, registration 311-63-00356, mail-order status 신고 완료, address, phone, email. |
| Terms/privacy | `/spokedu-master/terms`, `/spokedu-master/privacy` | Keep conspicuous footer/checkout links. |
| Center | `publicProductContract.ts` inquiry only | No price or direct checkout. |
| SPOMAT | Premium eligibility, public price intentionally unpublished | Say member benefit/member price only; link to shop/guide. |

The Landing can support customer sales and Toss review simultaneously if the persuasive narrative remains product-led while pricing, recurring billing, cancellation, business identity, and legal links stay explicit and inspectable. Do not market a trial; the current public model is Free scope plus paid monthly plans. Do not claim that the card itself is stored on SPOKEDU servers; current copy says card information is not stored there.

## 15. SEO / Sharing

Current page override:

- Title: `SPOKEDU MASTER — 체육교육 수업 운영 서비스`
- Description: accurate but contains internal “Session” concept in source wording and is not audience-specific enough.
- Robots: Landing override is `index, follow`; parent layout is `noindex`, so the override is essential and confirmed in Production.
- Open Graph/Twitter: present, pointing to `/api/spokedu-master/og` at 1200×630.
- Canonical: **missing** in the Production HTML response; add an explicit canonical for `/spokedu-master/landing`.
- OG quality: current generated graphic is dark, text-led, uses generic feature chips, and contains no actual product proof. The fallback SVG also depends on Korean font rendering. It is technically valid but commercially weak.

Phase 1 metadata direction:

- Title should include audience/outcome, e.g. `유아·초등 체육수업 준비와 운영 | SPOKEDU MASTER` (final copy review required).
- Description should name teachers/instructors, activity discovery, schedule/attendance, records/next class, and avoid “platform.”
- Add `alternates.canonical` using `getSpokeduSiteUrl()`.
- Replace or revise `/api/spokedu-master/og` with a real sanitized Home/Library product crop plus short Korean outcome and brand. Verify actual rendering at 1200×630, not code only.
- Verify previews in Kakao, email/social debuggers, and image fetch with the Production URL. Instagram does not expose link previews consistently, so the image should also work as a share card asset.

## 16. P0 Implementation Scope

Authorized only after the next-turn Phase 1 implementation request/brief:

1. Rebuild `app/spokedu-master/landing/page.tsx` around the IA in §11; remove `HERO_PROOF`, `STATS`, and generic `FEATURES` arrays.
2. Add focused Landing components under `app/spokedu-master/landing/components/`: `LandingHero`, `ProductLoop`, `ProductProofChapter`, `SpomoveShowcase`, `InclusiveUseCase`, `FieldProof`, `PlanComparison`, `LandingFaq`, `LandingFooter`.
3. Add a server-safe Landing product view-model using `getPublicProductContract()`; continue importing `MASTER_BUSINESS_INFO` and public handoffs. Do not duplicate prices/features.
4. Preserve/refine `LandingLoggedInBanner.tsx` state-aware re-entry.
5. Add sanitized current product captures under a dedicated path such as `public/images/spokedu-master/landing/`; start with ready assets and recapture Schedule/Attendance/Session/Records/SPOMOVE at 1440 and 390.
6. Update Landing metadata in `landing/page.tsx`; add canonical; update `app/api/spokedu-master/og/route.tsx` to a product-proof composition or stable approved image.
7. Update `landingBillingCopy.contract.test.ts` and add semantic contracts for SSOT use, Free/Lite/Premium/Center separation, required legal links, and no unsupported claims. Do not lock DOM/Tailwind structure.
8. Update `MASTER_SURFACE_MATRIX.md` only with rendered evidence/status after populated 390 and 1440 review; do not declare PASS from static work.

Out of scope: pricing/entitlement/payment/auth changes, DB migrations, new product features, recurrence, automated parent send, product-flow SSOT cleanup, Center self-serve decisions.

## 17. P1 Enhancement Scope

- Produce purpose-built current mobile and desktop marketing captures with deterministic sanitized fixtures.
- Add approved field testimonials, institution/customer logos, or verified usage statistics only after consent and evidence are recorded.
- Add a lightweight interactive crop/scroll sequence if it improves comprehension without faking the product.
- Create a dedicated share-card asset pipeline and validate Kakao/social cache refresh.
- Consider a Center detail page or lead form only after DC-003 is approved.
- Consider richer special-education case content only with source, consent, and exact claims reviewed.
- Separately resolve stale `masterProductTruth.ts` loop and DC-004 Free journey through product governance; do not bundle into Landing visual work.

## 18. Risks / Unknowns

Only unresolved items that code, Production response, repository assets, and public research could not establish:

1. **Image consent/provenance for marketing reuse:** repository presence and `SOURCES.internal.md` identify assets, but this audit cannot prove every depicted person’s current public marketing consent. Confirm internally before publication.
2. **Verified quantitative proof:** no approved current customer, teacher, class, activity, or institution number was found that is suitable for the Landing. Therefore P0 uses no numeric stats.
3. **Current clean captures for Schedule/Attendance/Session/Records/SPOMOVE at 390/1440:** not present as ready marketing assets; recapture is required with non-identifying data.
4. **Institutional sales detail:** Center/Team is inquiry-only and DC-003 remains pending; exact packaging and terms cannot be stated.
5. **Public testimonial/logo permissions:** the repository contains field/record imagery but no approval ledger for named external endorsements.

These do not block Phase 1 P0 because the page can launch without numeric claims, testimonials, or Center package details, provided consent-approved assets and sanitized captures are used.

## 19. Exact Next-Turn Implementation Plan

1. Confirm the next-turn Sprint Brief references this Phase 0 document, lists P0 files, explicitly authorizes targeted rendered QA at 1440/1024/834/390, and keeps all product/commercial logic out of scope.
2. Build the server-side Landing view model from `getPublicProductContract()` and `MASTER_BUSINESS_INFO`.
3. Create the component shell and section order without styling detail; wire exact CTAs and anchors.
4. Implement Hero and Product Overview with `home-master-ui.png`; verify Free/onboarding and returning-user destinations.
5. Implement Library/Prepare and Run chapters with ready repository captures; create explicit placeholders only for recapture slots, never fake UI.
6. Capture and replace slots for Class/Schedule/Attendance/Session/Records and SPOMOVE at desktop/mobile using sanitized fixtures.
7. Implement continuity, SPOMOVE, inclusive-use, and field-proof chapters with claims constrained by §§2 and 10.
8. Implement Free/Lite/Premium comparison and separate Center inquiry entirely from the public contract/catalog.
9. Implement FAQ, recurring-billing notice, and full legal/business footer.
10. Update canonical metadata and OG composition; verify real 1200×630 output and Production paths.
11. Update semantic contract tests within the approved brief; run only the explicitly authorized targeted verification.
12. Perform populated rendered QA at 1440, 1024, 834, and 390; record evidence/status in `MASTER_SURFACE_MATRIX.md`; report any product-meaning conflict instead of silently changing it.

## Phase 0 Exit Gate

1. **What is MASTER?** A teacher-facing PE class operating service spanning discovery, preparation, live operation, memory, and follow-up.
2. **Who first?** Individual teachers/instructors directly preparing and running kindergarten/elementary PE.
3. **Why not a materials site?** Activities connect to classes, dates, attendance, live tools, records, notices, and next-class preparation.
4. **What screens to show?** Home, Library/filter, lesson detail/setup, Class/Schedule/Attendance/Session/Class Tools, records/notice/next class, SPOMOVE Hub/Start/runtime.
5. **What to discard?** Abstract hero proof cards, pseudo-stats, generic icon feature grid, unsupported “most popular,” and brand-only hero hierarchy.
6. **Which external patterns?** Teacher-simple Free entry, coach workflow/field proof, actual-interface hero, action-led scroll chapters, separate institution path, FAQ/final CTA.
7. **How to explain plans?** Free = browse/tools/one full preview; Lite = weekly content+operations; Premium = memory/follow-up+SPOMOVE; Center = inquiry.
8. **SPOMOVE weight?** One differentiated chapter, roughly 10–15% narrative mass, after core product comprehension.
9. **Special educators?** A truthful use context based on difficulty, repetition, visual stimuli, varied movement, and SPOMOVE; no separate product or clinical claim.
10. **Toss and sales?** Yes: product-led narrative plus exact price/billing/cancel/business/legal truth.
11. **Mobile reconstruction?** Intentional crops, vertical evidence sequence, stacked plan logic, one dominant CTA, readable FAQ/footer—not a scaled desktop page.
12. **Next files/order?** Defined in §§16 and 19.

**Phase 0 verdict: PASS.**
