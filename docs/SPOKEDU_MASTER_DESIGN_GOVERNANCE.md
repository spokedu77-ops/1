# SPOKEDU MASTER — Design Governance Reset

**Status:** Binding (2026-09-06)  
**Scope:** MASTER visual/design contracts, Cursor rules, visual audits, visual-named tests  
**Not this document:** product meaning, entitlement, Engine, payment, session lifecycle

One Art Director / one system / one product. The next visual change must not pile on a fifth SSOT.

```
Phase 1–5  Governance + Art Direction + test cleanup   ← this pass
Phase 6    Canonical Home (do not start in a governance-only pass)
Phase 7    Canonical Library Detail
Phase 8    Canonical SPOMOVE Hub + Start
Phase 9    390 / 1440 human visual review
Phase 10   Propagation: Programs, Library, Favorites, Manage
```

**Do not start canonical page redesign in the same pass as a governance edit.**  
**Do not propagate before Home / Detail / SPOMOVE are visually approved at 390 and 1440.**

---

## 1. Documents a new UI task may read (maximum 4)

| # | Document | Role |
|---|----------|------|
| 1 | [Product Constitution](./SPOKEDU_MASTER_PRODUCT_CONSTITUTION.md) | What good means; product truth |
| 2 | [Decision Protocol](./SPOKEDU_MASTER_PRODUCT_DECISION_PROTOCOL.md) | Permission to change |
| 3 | [Art Direction](../app/spokedu-master/MASTER_VISUAL_SYSTEM.md) | Visual SSOT (L2) |
| 4 | [Sprint Brief](./SPOKEDU_MASTER_SPRINT_BRIEF_TEMPLATE.md) | Only when implementing |

Optional, not token authority: [Surface Matrix](../app/spokedu-master/MASTER_SURFACE_MATRIX.md) (L3 roles + 390/1440 QA ledger).

SPOMOVE behavior remains `app/spokedu-master/spomove/SPOMOVE_PRODUCT_CONTRACT.md`. That is product semantics, not a visual SSOT.

---

## 2. Inventory and verdict (2026-09-06)

### 2.1 MASTER visual / design documents

| Path | Verdict | Notes |
|------|---------|-------|
| `app/spokedu-master/MASTER_VISUAL_SYSTEM.md` | **KEEP — visual SSOT (L2)** | Full Art Direction. Absorbs former Art Direction file + this reset brief |
| `app/spokedu-master/MASTER_SURFACE_MATRIX.md` | **KEEP — L3 roles + QA ledger** | Role/character/canonical flag + 390/1440. Not a second philosophy. Not a long audit |
| `app/spokedu-master/MASTER_ART_DIRECTION.md` | **SUPERSEDE** | Pointer to Visual SSOT so old links do not fork |
| `docs/archive/spokedu-master-visual/MASTER_VISUAL_SYSTEM_v3.md` | **ARCHIVE** | Historical v3 text |
| `app/spokedu-master/UI_FOUNDATION_V3_SURFACE_AUDIT.md` | **ARCHIVE in place** | Historical evidence only. Live QA lives on the Surface Matrix. Old PASSED ≠ current visual PASS |
| `docs/SPOKEDU_MASTER_DESIGN_GOVERNANCE.md` | **KEEP** | This inventory (not a fifth UI spec) |
| `docs/SPOKEDU_MASTER_PRODUCT_CONSTITUTION.md` §7 | **MERGE** | Design paragraph points at Visual SSOT; no token duplicate |
| `docs/SPOKEDU_MASTER_PRODUCT_DECISION_PROTOCOL.md` | **KEEP** | Product behavior PDs only. PD-008 closed/superseded; **no PD-009** |
| `docs/SPOKEDU_MASTER_SPRINT_BRIEF_TEMPLATE.md` | **KEEP** | Implementation gate |
| `docs/SPOKEDU_MASTER_PRODUCT_AUDIT_BASELINE.md` | **KEEP (product)** | Not visual authority |
| `app/spokedu-master/spomove/SPOMOVE_PRODUCT_CONTRACT.md` | **KEEP (product)** | Autostart / entry / Hub vs Runtime |
| `app/spokedu-master/docs/QA_CHECKLIST.md` | **KEEP (ops)** | Not visual SSOT |
| `app/spokedu-master/spomove/LOW_SPEC_PLAN.md` | **KEEP (perf)** | Not visual SSOT |
| `app/spokedu/docs/PUBLIC_MARKETING_DESIGN_CONTRACT.md` | **KEEP (public site)** | Out of MASTER UI scope |
| `docs/archive/iiwarmup/*` | **ARCHIVE** | Pre-MASTER |

### 2.2 Cursor rules (MASTER visual-adjacent)

| Path | alwaysApply | Verdict |
|------|-------------|---------|
| `spokedu-master-product-governance.mdc` | true | **KEEP** — 4-doc list points at Visual SSOT |
| `spokedu-master-work-principles.mdc` | true | **MERGE → pointer** — no local visual philosophy |
| `spokedu-master-cta-unity.mdc` | false / globs | **MERGE → pointer** — six kinds + token names only |
| `preserve-existing-behavior.mdc` | true | **KEEP** — behavior, not look |
| `no-verify-shell.mdc` | true | **KEEP** |
| `spokedu-landing-card-shell.mdc` | (landing) | **KEEP** — public `app/spokedu`, not MASTER |
| note / RLS / admin / records rules | — | **KEEP** — unrelated to MASTER art |

### 2.3 Code tokens / primitives

| Path | Verdict |
|------|---------|
| `app/globals.css` `--spm-*` | **KEEP** — semantic tokens. New color only here |
| `lib/masterUiClasses.ts` | **KEEP as leftover mapping** until canonical remap. Art Direction table wins on conflict |
| `lib/masterActionGrammar.ts` | **KEEP** — CTA semantic names |
| `components/ui/MasterPrimitives.tsx` | **KEEP** — layout roles, not a second SSOT |
| Page-local hex / type / max-width | **SUPERSEDE on sight** during canonical work — do not add more |

### 2.4 Tests that claimed visual authority

| Path | Verdict |
|------|---------|
| `uiFoundationV3.contract.test.ts` | **REFINE** — Visual SSOT file + semantic primitives. Not rendered PASS |
| `LibraryDetailLayout.contract.test.ts` | **REFINE** — composition / media / CTA / related-max-3 invariants. Not exact grid strings |
| `lib/masterVisualSystem.contract.test.ts` | **KEEP** — action/token freeze until canonical remap. Not Art Direction PASS |
| `visualFinish.contract.test.ts` | **KEEP as pre-canonical snapshot** of Home / Library / Hub structure. Not rendered PASS |
| `activity/coreVisualGrammar.contract.test.ts` | **KEEP** session-workspace token freeze until a Session visual brief |
| `library/ctaHierarchy.contract.test.ts` | **KEEP** — CTA semantics |
| `masterUiUnity.contract.test.ts` | **KEEP** — `바로 실행` ban + chip routing |
| `spomove/spomoveMediaFit.contract.test.ts` | **REFINE** — shared 4:3 contain + 16:9 video invariants. Not rendered PASS |

Adding a new visual contract test because “the screen looked odd” is forbidden. Change Visual SSOT or the Sprint Brief first.

Do not test exact Tailwind as design truth (`grid-cols-[1.7fr_1fr]`). Test invariants: no `items-stretch` equal-height, no duplicate primary, media policy, related max 3, Favorites media required.

---

## 3. What was going wrong

- Visual v3, Art Direction file, CTA unity, work-principles, and surface audit all acted as parallel authorities.
- 2026-09-05 reset moved SSOT to `MASTER_ART_DIRECTION.md` and stubbed `MASTER_VISUAL_SYSTEM.md` — two filenames, easy to fork again.
- Audit PASS was treated as permission to ship look.
- Width, type, and `mt-*` were chosen per page.
- White card + gray box + black type became the default “safe” look.
- Exact class strings in tests froze obsolete layouts.

---

## 4. Critique rule

A request is **not** automatically right because a user asked for it.

Say **conflict** when it collides with product semantics, this Art Direction, same-role grammar, or design quality.

Say **taste** when two options both fit Visual SSOT. Do not invent fake product reasons.

---

## 5. Canonical surfaces (Phase 6–8 only)

| Surface | Family |
|---------|--------|
| Home | Editorial |
| Library Detail | Reading / preparation |
| SPOMOVE Hub + Start | Digital / live |

Phase 10 may copy grammar from these three. It may not invent a fourth visual language.
