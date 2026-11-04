# Test maintenance policy

Test counts are observations, not targets. A green suite does not establish rendered visual quality.

## Keep

- Authentication, authorization, tenant/owner isolation, and entitlement boundaries.
- Payment, refund, idempotency, concurrency, and persisted data integrity.
- Session lifecycle, attendance scope, recovery, cancellation, and error handling.
- SPOMOVE stimulus generation, timing, repetition completion, pause/stop cleanup, and bonus transitions.
- Nontrivial calculations, parsing, migrations, and routing decisions.
- Accessibility behavior such as keyboard interaction, focus restoration, and modal isolation.

A test should fail for a meaningful user-visible defect. Prefer calling the real function or rendering/interacting with the component. Source inspection remains useful for architectural/security boundaries that cannot reasonably be exercised otherwise; do not remove it solely because it uses readFileSync.

## Remove or consolidate

- Exact CSS classes, spacing, typography strings, breakpoint choices, decorative composition, or internal component names.
- Assertions that duplicate literals or merely confirm their own implementation.
- Repeated historical design snapshots for the same surface.
- Fixed catalog counts without a publication or compatibility invariant. Preserve explicit Lab publication boundaries, identity, order, and metadata completeness checks.

Use populated local desktop/mobile review for visual changes. Add rendered automated coverage only when it verifies a concrete regression worth maintaining. Do not replace deleted CSS-string assertions with equivalent DOM-shape assertions.

## Commands and limits

- `npm run test:full`: all retained `app/**/*.test.ts` tests.
- Use a targeted Vitest file selection while working, then the full suite when the approved scope requires it.
- Respect AGENTS.md: verification commands require user authorization or an approved Sprint Brief.
- The two refund database integration cases require a disposable non-production database and their explicit write guard. Skipped cases are unverified, not passed.

## Reviewed cleanup (2026-11-05)

Removed 44 presentation/source-shape test cases after inspecting their assertions. Mixed files retain session, error/recovery, navigation, and accessibility checks. No production UI or execution behavior was changed for this cleanup. The remaining suite has not been exhaustively certified as minimal; this cleanup does not justify retaining every other test indefinitely.

Full-suite result: 3,291 passed, 0 failed, 2 skipped (3,293 total).

Removed cases:

- `app/spokedu-master/masterUiUnity.contract.test.ts`: it('routes filter chips through masterUiClasses (no slate-950 chip hardcode)', () => {
- `app/spokedu-master/masterUiUnity.contract.test.ts`: it('exposes shared chip/seg helpers', () => {
- `app/spokedu-master/masterUiUnity.contract.test.ts`: it('uses spm-btn-primary for subscription gate and payment success primary CTAs', () => {
- `app/spokedu-master/operationalResponsive.contract.test.ts`: it('limits mobile tab-bar clearance to the mobile shell family', () => {
- `app/spokedu-master/operationalResponsive.contract.test.ts`: it('keeps membership controls touchable and mobile-first', () => {
- `app/spokedu-master/tabBarClearance.contract.test.ts`: it('renders a fixed TabBar for authenticated mobile chrome', () => {
- `app/spokedu-master/tabBarClearance.contract.test.ts`: it('reserves shared TabBar + safe-area clearance on authenticated main content', () => {
- `app/spokedu-master/uiFoundationV3.contract.test.ts`: it('declares one visual authority and keeps required semantic primitives in code', () => {
- `app/spokedu-master/uiFoundationV3.contract.test.ts`: it('uses inline states and row-based operational collections', () => {
- `app/spokedu-master/uiFoundationV3.contract.test.ts`: it('gives reports a document surface', () => {
- `app/spokedu-master/uiFoundationV3.contract.test.ts`: it('converges representative editorial surfaces', () => {
- `app/spokedu-master/visualFinish.contract.test.ts`: it("keeps Home editorial and media-first without strong content shadows", () => {
- `app/spokedu-master/visualFinish.contract.test.ts`: it("keeps Library search-led with saved content and no outer shelf elevation", () => {
- `app/spokedu-master/manage/scheduleResponsive.contract.test.ts`: it('limits compact and desktop cells to two one-line event summaries plus overflow count', () => {
- `app/spokedu-master/manage/scheduleResponsive.contract.test.ts`: it('uses the product breakpoint for the desktop workspace transition', () => {
- `app/spokedu-master/components/ui/classToolsResponsive.contract.test.ts`: it('keeps all eight tools on screen without a scrolling tab strip', () => {
- `app/spokedu-master/components/ui/classToolsResponsive.contract.test.ts`: it('fits the scoreboard by measured columns instead of auto-fit', () => {
- `app/spokedu-master/components/ui/classToolsResponsive.contract.test.ts`: it('reflows tournament rounds and gives dense ladders a contained scroll area', () => {
- `app/spokedu-master/components/ui/classToolsResponsive.contract.test.ts`: it('relies on AppShell for mobile tab-bar clearance', () => {
- `app/spokedu-master/spomove/spomoveMediaFit.contract.test.ts`: it('keeps a shared media module: square clean-fill discovery thumbs, 16:9 contained video frame', () => {
- `app/spokedu-master/spomove/spomoveMediaFit.contract.test.ts`: it('routes Hub CardVisual thumbs through SpomoveLayeredThumb, not a page-local crop', () => {
- `app/spokedu-master/spomove/spomoveMediaFit.contract.test.ts`: it('renders guide video preview with contain + aspect-video (no column stretch crop)', () => {
- `app/spokedu-master/spomove/spomoveMediaFit.contract.test.ts`: it('does not route Hub image thumbs through video preview helpers', () => {
- `app/spokedu-master/spomove/spomoveMediaFit.contract.test.ts`: it('shares one clean square image branch between Home and Hub without blur or contain', () => {
- `app/spokedu-master/spomove/spomoveUxFriction.contract.test.ts`: it('keeps one card column through 430px and uses a mobile Family preview rail', () => {
- `app/spokedu-master/spomove/spomoveUxFriction.contract.test.ts`: it('does not truncate prep values and always exposes a footer close action', () => {
- `app/spokedu-master/library/LibraryDetailLayout.contract.test.ts`: it('documents Library Detail as an editorial preparation page', () => {
- `app/spokedu-master/library/LibraryDetailLayout.contract.test.ts`: it('keeps both content rows two-column from 900px with intrinsic height', () => {
- `app/spokedu-master/library/LibraryDetailLayout.contract.test.ts`: it('keeps shared heading baseline without stretching panels to equal height', () => {
- `app/spokedu-master/library/LibraryDetailLayout.contract.test.ts`: it('keeps the precision pass free of nested decorative media cards', () => {
- `app/spokedu-master/library/LibraryDetailLayout.contract.test.ts`: it('uses numbered method steps and numbers only when there are multiple variations', () => {
- `app/spokedu-master/library/LibraryDetailLayout.contract.test.ts`: it('keeps mobile actions sticky while moving desktop actions and favorite into the hero', () => {
- `app/spokedu-master/dashboard/homeCardSystem.contract.test.ts`: it("uses count-aware grids at every Dashboard breakpoint", () => {
- `app/spokedu-master/dashboard/homeCardSystem.contract.test.ts`: it("keeps Home media proportional and brings all four recommendations into regular desktop view", () => {
- `app/spokedu-master/dashboard/homeCardSystem.contract.test.ts`: it("uses a stable SPOMOVE heading row and delegates mobile tab clearance to AppShell", () => {
- `app/spokedu-master/dashboard/homeCardSystem.contract.test.ts`: it("uses one CTA system for all operational states", () => {
- `app/spokedu-master/dashboard/homeCardSystem.contract.test.ts`: it("gives mobile Hero actions an explicit one-plus-two hierarchy", () => {
- `app/spokedu-master/dashboard/homeCardSystem.contract.test.ts`: it("overlays Weekly play affordance inside the media stage", () => {
- `app/spokedu-master/dashboard/homeCardSystem.contract.test.ts`: it("aligns SPOMOVE card actions to one compact bottom row", () => {
- `app/spokedu-master/dashboard/homeCardSystem.contract.test.ts`: it("keeps urgent follow-up compact with a touch-safe action instead of rendering a Home hero", () => {
- `app/spokedu-master/craftSelectionReasons.contract.test.ts`: it('keeps recommendation cards on one fixed space and participant metadata grammar', () => {
- `app/spokedu-master/lib/masterVisualSystem.contract.test.ts`: it('keeps primary, secondary, quiet, and destructive actions semantically distinct', () => {
- `app/spokedu-master/lib/masterVisualSystem.contract.test.ts`: it('keeps standard collection and support surfaces neutral and compact', () => {
- `app/spokedu-master/lib/masterVisualSystem.contract.test.ts`: it('publishes a restrained typography foundation without forcing one universal card', () => {

## Second reviewed cleanup (2026-11-05)

Removed 88 additional cases (132 across both cleanups). Removed the regex API import-path checker because the existing `.github/workflows/typecheck.yml` runs the actual TypeScript resolver. Removed historical presentation wiring, literal-copy duplication, and tests asserting the presence of a not-yet-implemented feature plan. Kept explicit Lab publication boundaries and metadata completeness checks, API authorization, persistence, billing, engine timing and repetition completion, and keyboard/focus behavior guards.

Removed obsolete paths from the focused MASTER core configuration rather than leaving silent empty selections. No tests were moved into a skipped or excluded suite.

Final validation: full suite 3,203 passed, 0 failed, 2 skipped (3,205 total); MASTER core suite passed. The skipped tests remain the two guarded refund database integration cases. Parameterized engine/input cases count individually; this total is not a count of separate features or test files. Further removals require evidence of redundancy or replacement coverage, not a numerical quota.

Additional removed cases and reasons:

### `app/spokedu-master/foundationReset.contract.test.ts`

Historical source-shape/presentation duplication; no runtime execution

- Foundation Reset user-facing contracts keeps Home editorial order and strict resume
- Foundation Reset user-facing contracts composes Schedule and attendance without repeating Classes in Manage
- Foundation Reset user-facing contracts makes Favorites the retrieval surface and opens shared Preview
- Foundation Reset user-facing contracts removes discovery favorites modes and preserves contextual payment

### `app/spokedu-master/informationGrammar.contract.test.ts`

Historical source-shape/presentation duplication; no runtime execution

- MASTER information and action grammar separates static content, system decisions, and personalized memory
- MASTER information and action grammar keeps explicit memory behind core lesson understanding and preparation
- MASTER information and action grammar keeps one dominant action per local decision context

### `app/spokedu-master/masterUiUnity.contract.test.ts`

Historical source-shape/presentation duplication; no runtime execution

- MASTER product UI unity bans 「바로 실행」 as a CTA label while allowing descriptive copy
- MASTER product UI unity shares collection geometry and loading/empty/error grammar across operational lists

### `app/spokedu-master/uiFoundationV3.contract.test.ts`

Historical source-shape/presentation duplication; no runtime execution

- MASTER Visual SSOT (not rendered PASS) makes Manage the canonical operational reference with one contextual primary action
- MASTER Visual SSOT (not rendered PASS) closes the equal-tab IA leak while preserving deep route implementations

### `app/spokedu-master/visualFinish.contract.test.ts`

Historical source-shape/presentation duplication; no runtime execution

- MASTER representative visual finish (pre-reset snapshot; not Art Direction PASS) keeps SPOMOVE discovery cards separate from Preview-owned execution actions

### `app/spokedu-master/tabBarClearance.contract.test.ts`

Historical source-shape/presentation duplication; no runtime execution

- SPOKEDU MASTER TabBar clearance architecture does not render TabBar on login chrome-hidden routes

### `app/spokedu-master/components/lesson/ProgramPreviewModal.contract.test.ts`

Historical source-shape/presentation duplication; no runtime execution

- ProgramPreviewModal responsive preview shell uses the detached mobile footer without duplicating the desktop CTA
- ProgramPreviewModal responsive preview shell splits english subtitles and allows the primary title to wrap to two lines

### `app/spokedu-master/spomove/lowSpecSupport.test.ts`

Historical source-shape/presentation duplication; no runtime execution

- 저사양 모드 계획 LOW_SPEC_PLAN.md가 존재하고 WebGL 대상 프리셋을 문서화한다
- 저사양 모드 계획 WebGL 저사양 계획 대상 공식 프리셋이 라이브러리에 존재한다

### `app/spokedu-master/craftSelectionReasons.contract.test.ts`

Historical source-shape/presentation duplication; no runtime execution

- SPOKEDU MASTER craft + selection reasons bans tag-only SPOMOVE selection reasons
- SPOKEDU MASTER craft + selection reasons routes onboarding/class-tools/record empty CTAs through spm-btn-primary
- SPOKEDU MASTER craft + selection reasons keeps Today Sessions ahead of discovery content

### `app/api/spokedu-master/apiRouteImports.contract.test.ts`

Regex relative-import existence checker duplicated by the existing TypeScript CI

- SPOKEDU MASTER API route import contract indexes every spokedu-master API route file
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\access\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\class-records\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\classes\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\classes\[classId]\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\classes\[classId]\schedule-rules\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\classes\[classId]\schedule-rules\[ruleId]\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\classes\[classId]\students\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\classes\[classId]\students\[studentId]\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\client-errors\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\explanations\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\favorites\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\funnel-events\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\operational-data\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\payment\billing\cancel\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\payment\billing\health\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\payment\billing\issue\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\payment\billing\renew\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\payment\billing\upgrade-quote\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\payment\confirm\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\payment\create-checkout\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\payment\portal\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\payment\webhook\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\profile\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\program-favorites\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\programs\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\promotions\redeem\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\session-captures\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\sessions\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\sessions\[sessionId]\attendance\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\sessions\[sessionId]\next\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\sessions\[sessionId]\parent-notice\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\sessions\[sessionId]\programs\carryover\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\sessions\[sessionId]\programs\reorder\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\sessions\[sessionId]\programs\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\sessions\[sessionId]\programs\[sessionProgramId]\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\sessions\[sessionId]\start\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\shop\spomat\purchase\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\spomove\guide-video\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\students\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\students\[id]\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\subscription\route.ts
- SPOKEDU MASTER API route import contract resolves relative imports in app\api\spokedu-master\value-summary\route.ts
- SPOKEDU MASTER API route import contract uses the shared operational-data module from nested student routes

### `app/spokedu-master/deepOperationalV32.contract.test.ts`

Reviewed presentation, literal-copy, or source-wiring-only assertions

- uses operational page grammar for Class detail without a student card grid
- presents Student detail as guidance and linked history rows
- uses the simple operational Session sequence without runtime workspaces

### `app/spokedu-master/favoriteEntryParity.contract.test.ts`

Reviewed presentation, literal-copy, or source-wiring-only assertions

- keeps card favorite targets at least 44px on mobile
- uses one Favorites-only 4:3 cover presentation for both content families
- keeps retrieval cards compact at three columns on regular desktop and four on wide screens

### `app/spokedu-master/lib/masterCohesion.contract.test.ts`

Reviewed presentation, literal-copy, or source-wiring-only assertions

- sells outcomes instead of a stale feature count
- uses one destructive vocabulary across Class, Student, and Session
- keeps operational primary CTAs on the brand token

### `app/spokedu-master/lib/masterOsConsistency.journey.test.ts`

Reviewed presentation, literal-copy, or source-wiring-only assertions

- assign copy uses 수업에 추가 grammar

### `app/spokedu-master/programs/programGateway.contract.test.ts`

Reviewed presentation, literal-copy, or source-wiring-only assertions

- keeps equal 16:9 responsive cards with badges outside the image

### `app/spokedu-master/landing/commercialLanding.contract.test.ts`

Reviewed presentation, literal-copy, or source-wiring-only assertions

- keeps the approved section sequence

### `app/spokedu-master/spomove/session/spomoveTypography.contract.test.ts`

Reviewed presentation, literal-copy, or source-wiring-only assertions

- uses body typography at the MASTER and Session roots and 800 display typography for stimuli
- has no legacy brand fonts or 900-weight branding in MASTER/SPOMOVE sources
- keeps semantic typography roles in the shared MASTER SSOT

### `app/spokedu-master/spomove/spomovePublicNaming.test.ts`

Reviewed presentation, literal-copy, or source-wiring-only assertions

- stores the exact v2 cardTitle for every public id
- applies both hidden-color titles immediately
- applies all four Stroop public titles immediately
- applies the 3X3 instant-memory public title while exposing cardCore
- does not leak previous subtitle composition into Hub cards
- uses the public display resolver across MASTER session-facing surfaces

### `app/spokedu-master/library/ctaHierarchy.contract.test.ts`

Reviewed presentation, literal-copy, or source-wiring-only assertions

- keeps favorite in the mobile header and desktop hero action group

### `app/spokedu-master/components/ui/BottomSheet.contract.test.ts`

Reviewed presentation, literal-copy, or source-wiring-only assertions

- keeps one content scroll owner between detached header and optional footer

### `app/spokedu-master/components/layout/appShellTabPerf.contract.test.ts`

Reviewed presentation, literal-copy, or source-wiring-only assertions

- uses cached home program load on route change and defers forced reload to focus
