# SPOKEDU MASTER — Surface Matrix (L3)

**Authority:** none for tokens. Visual SSOT: [MASTER_VISUAL_SYSTEM.md](./MASTER_VISUAL_SYSTEM.md)

Roles only — no per-page design philosophy. This table is also the **live rendered QA ledger**. Do not add a second audit document.

Statuses record QA evidence, not implementation permission:

- **PENDING:** rendered visual approval has not occurred.
- **PASSED:** required rendered evidence has been approved.
- **FAILED:** the current render does not meet the governing criteria.
- **BLOCKED:** required data, fixture, or environment is unavailable, so evaluation cannot occur.

A user request or approved Sprint Brief may implement or improve a surface in any status. Rendered PASS requires populated mobile and desktop evidence; when a Target Reference exists, it also requires side-by-side review. Static tests are not PASS. Archived Foundation audit PASSes are void.

| Surface | Role | Character | Canonical reference | 390 | 1440 |
|---------|------|-----------|---------------------|-----|------|
| HOME | Discover + Re-enter | Editorial | Canonical | RENDERED — REVIEW REQUIRED | RENDERED — REVIEW REQUIRED |
| LIBRARY DETAIL | Understand + Prepare | Editorial preparation | Canonical | PENDING | PENDING |
| SPOMOVE HUB | Browse | Digital sports content | Canonical | PENDING | PENDING |
| SPOMOVE START | Confirm then run | Digital execution gate | Canonical | PENDING | PENDING |
| SPOMOVE RESULT | Reflect + review + retry | Shared child/instructor feedback | User-approved Stitch result reference | RENDERED — REVIEW REQUIRED | RENDERED — REVIEW REQUIRED |
| PROGRAMS | Discover programs | Editorial gateway | Surface role | PENDING | PENDING |
| LIBRARY | Find activities | Catalog discovery | Surface role | PENDING | PENDING |
| FAVORITES | Retrieve saved | Retrieval | Surface role | PENDING | PENDING |
| MANAGE | Operate the week | Operational | Surface role | PENDING | PENDING |
| CLASSES / STUDENTS | Operate roster | Operational | Surface role | PENDING | PENDING |
| SESSION / ACTIVITY | Run the class | Live instrument | Surface role | BLOCKED | BLOCKED |
| CLASS TOOLS | Utility now | Live instrument | Exception | PENDING | PENDING |
| REPORT | Record / send | Document reading | Surface role | PENDING | PENDING |

**WHY CLASS TOOLS IS DIFFERENT:** live utility needs 900-weight numerals; not a discovery surface.

SPOMOVE Result (2026-11-10, direction records and educational feedback): Admin/LAB opt in to direct direction-presentation evidence, acknowledged after the stimulus paint and deduplicated per run. Flanker records response targets; simultaneous Simon targets count separately. Only the run's valid directions appear; historical results are not backfilled. Non-color reports place the read-only summary on the right at desktop/tablet widths, with actual records beside three educational experiences and open questions. Local component fixtures reviewed at 390/1024/1440; 24 cases include pixel-identical color and excluded teacher reports against HEAD, plus targeted layout review. Actual MemoryGameApp and EngineRouter fixtures each returned five presented cues with a matching direction sum; retry/stop returned a fresh one-cue record, and relative-direction runtime returned matching totals. Targeted tests: 48 passed. Evidence: `artifacts/direction-result-20261110/` (`report.json`, `layout-report.json`, screenshots). Fixtures do not verify authenticated Admin/LAB route E2E; human rendered approval remains pending. No generation, database, persistence, or teacher-authored flow changes.

SPOMOVE Result (2026-11-10): current implementation follows the user-approved `stitch_spomove_visual_search_result_ui.zip` (`screen.png` + `code.html`). Demo program/status switchers are excluded from production. The final content refinement uses compact section spacing, omits empty statistics and unmeasured-performance notices, and forwards resolved LAB preset descriptions with 2–3 educational keywords. All 72 public IDs have naming entries; three existing Stroop public names imply jumping while their engines use verbal responses, so names remain unchanged and descriptions follow actual execution. Non-distribution activities show available progress without filler; teacher-entered glass-bridge results retain their recorded meaning. Runtime, persistence, terminal states and callbacks are unchanged. Current revision has not undergone rendered desktop/mobile or side-by-side review; the evidence below belongs to the previous revision.

SPOMOVE Result (2026-11-09, Stitch transplant, corrected after user review): populated local shared-component fixtures at 390/768/1126/1440/1600 in light/dark; reference side-by-side review, SPOMAT 2×2 positions, zero-count color identity, all four terminal states, list/retry/footer callbacks and horizontal overflow checked. The original balloon omission was a View Model identity error (`balloon` runtime versus canonical `balloon-pop`); regression coverage now includes both legacy and explicit activity inputs. Actual unmodified balloon runtime at 390/1440 completed five cues, retried, then stopped after a cue; resulting lane counts match all four displayed color counts. Visual search, balloon, color-choice glass bridge, DIVE, sequence/instant memory, directional and missing-data cases covered. Local font assets are served in fixtures; typography no longer inherits the heavy Paperlogy display font. Feeling controls and instructor disclosure removed under the explicit approved scope. Evidence: `artifacts/result-stitch-20261109/` (`report.json`, `reference-comparison.png`, `balloon-live-complete-1440.png`). Authenticated Admin, Teacher and MASTER/LAB end-to-end flows are not verified by these component fixtures; human rendered review remains required. Earlier runtime evidence in `artifacts/result-feedback-20261109/` predates this transplant.

**WHY SESSION IS BLOCKED:** no populated PREP/TEACH/CAPTURE fixture in this cycle; lifecycle mutation is out of visual scope.
