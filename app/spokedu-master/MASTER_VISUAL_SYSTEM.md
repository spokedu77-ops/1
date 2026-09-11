# SPOKEDU MASTER — Art Direction (Visual SSOT)

**STATUS:** Visual SSOT  
**AUTHORITY:** L2  
**SUPERSEDES:** `MASTER_ART_DIRECTION.md`, Visual Foundation v3 (`MASTER_VISUAL_SYSTEM` archive)

**Does not own:** product meaning, locked IA, entitlement, Engine, payment, persistence, session lifecycle  
**Does not override:** [Product Contract](../../docs/SPOKEDU_MASTER_PRODUCT_CONTRACT.md), including approved Product Decisions (behavior)

Which file is Visual SSOT is a **governance** fact on this header — not a Product Decision Registry entry.

Governance: [Design Governance](../../docs/SPOKEDU_MASTER_DESIGN_GOVERNANCE.md)  
Product authority: [Product Contract](../../docs/SPOKEDU_MASTER_PRODUCT_CONTRACT.md)
Surface roles + rendered QA ledger: [MASTER_SURFACE_MATRIX.md](./MASTER_SURFACE_MATRIX.md)

This file is the only visual SSOT and supplies MASTER's default design system. It does not force identical composition, protect current implementation details, veto an approved Target Reference, or prohibit improvement of a surface. Other visual documents, Cursor rules, archived audits, and tests cannot create a competing visual philosophy. Rendered review is the only visual PASS.


---

## Authority (read this first)

| Layer | Document | Owns |
|-------|----------|------|
| L0 / L1 | `docs/SPOKEDU_MASTER_PRODUCT_CONTRACT.md` | Product truth, core loop, approved behavior, and change authority |
| L2 | **this file** | All look: character, type, color, width, rhythm, media, CTA, cards, surfaces, motion |
| L3 | `MASTER_SURFACE_MATRIX.md` | Per-page role (not a second philosophy) + live 390/1440 QA ledger |

Conflict:

- Product Contract vs this file → Product Contract
- Approved Product Decision vs visual proposal → Product Decision
- Old visual contract / test vs this file → this file (behavior semantics unchanged)
- Approved Target Reference vs Visual System default → Target Reference for the approved surface, adapted through protected product/data/security invariants
- Reference brand, data model, or feature semantics vs SPOKEDU product truth → product truth

If two options both fit this file, say **taste**. Do not invent extra visual rules elsewhere.

---

## Product visual character

**FIELD-READY SPORTS EDITORIAL PRODUCT** for 체육교사 / 체육지도자.

Must read as: professional, sports, editorial, media-first, fast, field-usable, trustworthy.

Must not read as: early SaaS, admin dashboard, Notion document, PDF handout, white card wall, badge wall, childish edtech, black B2B panel wall.

MASTER sits between a fitness content service and an operational teaching tool because the professional loop exists:

**DISCOVER → PREPARE → RUN → REMEMBER → FOLLOW-UP**

---

## Reference model

References have two authority levels:

- **Inspiration Reference:** a general reference. Learn from its problem-solving approach and design principles; reproduction is not required.
- **User-approved Target Reference:** an image or artifact the user explicitly names as the target structure or finish for a surface. For that surface and approved scope, it may directly guide composition, panel proportion, spacing, typography hierarchy, content density, alignment, control placement, default expanded/collapsed state, visual emphasis, and responsive intent.

A Target Reference outranks Visual System defaults for those visual decisions. The Visual System adapts the reference safely into MASTER identity; it is not a veto. Never copy reference branding, data models, product meaning, workflow semantics, permissions, entitlement, or unsupported functionality.

| Source | Take | Leave |
|--------|------|-------|
| Apple Fitness+ | Content hierarchy; Explore → Preview → Start; media-first; program / collection / workout roles | Glass lifestyle, consumer wellness tone |
| Nike Training Club | Sports credibility; strong workout imagery; featured collections; field-tool reading | Consumer marketing tone, lifestyle branding |
| Netflix / modern media | Editorial recommendation ≠ search; Resume ≠ recommendation; shelf hierarchy; thumbnail differentiation | Entertainment dark UI copy |

Use the table below as Inspiration References unless the user explicitly promotes one to a Target Reference.

---

## Unity

Unity is **not** “every screen is the same card.”

Default shared grammar:

- typography, spacing rhythm, width family
- media rules, CTA grammar, metadata grammar
- radius family, interaction / focus states, motion
- responsive breakpoints

Composition may differ by job (same product identity, different role):

| Family | Feel |
|--------|------|
| HOME | Editorial discovery |
| PROGRAMS | Editorial gateway |
| LIBRARY | Catalog discovery |
| FAVORITES | Retrieval |
| DETAIL | Editorial preparation |
| MANAGE | Operational |
| SPOMOVE | Digital sports content |
| RUNTIME | Live instrument |

Same content object (놀이체육 / SPOMOVE) must share core card grammar. If Favorites makes them look like two products → FAIL.

---

## Canvas and color

Default background: cool neutral / very light (`--spm-bg`).  
White (`--spm-s1`): real content surface or floating layer only.  
Navy (`--spm-t` / `--spm-acc`): text and selection — not default button fill.  
Blue (`--spm-cta`): actual primary action only.  
SPOMOVE Deep Navy (`--spm-spomove-surface`): SPOMOVE discovery / digital identity only. Not runtime Engine, Library, or Manage.

Forbidden: every section as a white card; every section bordered; every section navy; gradient as decoration; page-local hex.

New color → semantic token in `app/globals.css` `--spm-*` only.

---

## Width

No per-page improvised max-width. Three families:

| Family | Max | Use |
|--------|-----|-----|
| Editorial | ~1120 | Home, Programs, Library, Favorites, SPOMOVE Hub |
| Reading / detail | ~1080 | Library Detail, Report, document-like pages |
| Operational | ~1040 | Manage, Classes, Students |

True wide (1200+) only for real wide media / workspace. A 1220 canvas with sparse small content is a defect.

`MasterPageShell` and leftover `max-w-7xl` / `max-w-5xl` that disagree with this table are pre-canonical leftovers.

---

## Typography

Design type before cards.

| Role | Desktop | Mobile | Weight |
|------|---------|--------|--------|
| Home display | 36–40 | 30–32 | 600–700 |
| Page title | 30–32 | 28 | 600–700 |
| Section | 22–24 | 22–24 | 600–700 |
| Content title | 17–18 | 17–18 | 600–700 |
| Reading | 15–17 | 15–17 | 400–500 |
| Meta | 12–13 | 12–13 | 400–500 |
| Button | 14–15 | 14–15 | 600 |

`font-black` / 900: live score / result only. **Exception:** Class Tools large numerals (live instrument — see Surface Matrix).

Forbidden: decorative uppercase; `tracking-[0.08em]`; `text-[10px]` / `text-[11px]` except legal/footnote; page-local type invention.

`SPM_PAGE_TITLE` and friends in `masterUiClasses.ts` are code leftovers until canonical remap. This table wins.

---

## HOME VISUAL PRIORITY

Home visual hierarchy (quantity equality ≠ hierarchy equality):

1. **Weekly Lesson Discovery** — strongest content-led visual focus. The four weekly programs are Home’s primary content asset.
2. **True Continuity / Re-entry** — secondary. Compact semantic row. Only when the user has it.
3. **SPOMOVE Extension** — second discovery family. Important, never stronger than Weekly.
4. **Operational / navigation support** — quiet utility.

Hero is an **opening**, not a content block that outranks Weekly. Hero must not consume more vertical attention than the first real content.

SPOMOVE must not visually dominate Weekly. A Deep Navy identity on Home is allowed only as a **restrained** extension surface (smaller mass, quieter actions, thumbnails first). Hub may use full Deep Navy identity. Home may not use a second-hero navy slab.

---

## PROGRAM MEDIA INTEGRITY

Program activity thumbnails are **instructional media**, not generic editorial photography.

They carry participant position, equipment position, distance, spatial layout, and movement relationship.

- Preserve authored composition.
- Do not crop away information needed to understand the activity.
- Do not use `object-cover` as the default for program stills.
- Inspect source ratio first. If a shared authored ratio exists, that ratio is canonical. If ratios are mixed: foreground **full-visible** (`object-contain`) plus a restrained background treatment. Never damage the foreground plate.
- Thumbnail **selection** for Weekly 4 is curated product content. Do not relitigate which photo is chosen. The UI problem is how the chosen still is framed.

Home Weekly uses `InstructionalThumb`. Hub thumbnails use `spomoveMediaFit` + `SpomoveLayeredThumb` clean-fill presentation.

---

## SEGMENT BALANCE

Premium-strengthening content may appear on Home (including for Lite).

Lite must not read Home as “the real product is a Premium capability I cannot use.”

Home’s dominant value: **discover and prepare good lesson content.**

SPOMOVE is extension / differentiation / upgrade value. It must not overpower core lesson discovery. Conversion must not come from making the Lite lesson experience look secondary.

---

---

## Spacing rhythm

Do not sprinkle `mt-7` / `mt-13` / `72px` by feel.

| Interval | Space (px) |
|----------|------------|
| Page intro → first section | 40–48 |
| Major section | 64–72 |
| Section title → content | 16–20 |
| Content group | 12–16 |
| Micro relation | 6–8 |

Whitespace shows relationship. Context-free large empty fields are FAIL.

---

## Media

Do not re-decide thumbnail policy per page. Prefer shared media components.

| Kind | Aspect | Fit |
|------|--------|-----|
| Editorial photo | 16:9 or 16:10 | cover |
| Program / lesson instructional still | Follow the source ratio | Plate fills the frame (`object-contain` in a matching box). Do not cover-crop activity information. Do not shrink the still into a gray field. |
| Content card photo (non-instructional) | 4:3 or 16:10 | cover only when the still is not instructional |
| SPOMOVE discovery thumbnail | Square | shared clean-fill presentation; inspect authored assets so core stimulus, text, and movement cues remain visible |
| Setup image | 4:3 | contain; do not crop information |
| Video | 16:9 | — |
| Portrait / other | — | explicit exception only |

Home Weekly uses program instructional stills (`InstructionalThumb`), not editorial cover-crop. Home and Hub SPOMOVE thumbnails use the shared square clean-fill presentation.

---

## Content card grammar

Default:

1. Media  
2. Title  
3. One decision meta  
4. Optional support meta  
5. Optional bookmark  

Do not keep adding button / badge / meta / tag / footer / secondary button inside the card.

| Surface | Card character |
|---------|----------------|
| Home recommendation | Editorial card |
| Library | Catalog card |
| Favorites | Retrieval card |

Shared object → shared core grammar.

---

## CTA grammar (six kinds only)

Color unification is necessary and not sufficient.

| Kind | Height | Look | Role |
|------|--------|------|------|
| **Primary** | 44–48 | Blue `--spm-cta` / `spm-btn-primary` | Actual next core action. One per viewport. Not a giant full-width bar |
| **Secondary** | 44–48 | Neutral border | Supports the same task |
| **Quiet** | 44 hit | Text / low emphasis | Navigate / manage |
| **Inline** | text | No extra box | In reading flow |
| **Icon** | 44×44 | Icon only, `aria-label` | Header / card corner |
| **Mobile sticky** | 44–48 + safe area | Floating bottom | Same primary verb; **no** duplicate primary on the same viewport |

Selection is **not** Primary. Chips / segments: `spmChipClass` / `spmSegClass` (navy `--spm-acc`), never CTA blue.

Still forbidden in product UI:

- `바로 실행`
- Primary fill `bg-slate-950` / `--spm-acc` / inset white hairline
- A seventh CTA kind invented in a Cursor rule

Copy must name the real transition (Product Contract § Product Truth). PD-002: Today Lesson primary = 「수업 준비」.

Leftover: `SPM_OPEN_BTN` (slate-900 solid) must not look like Primary on discovery CTAs.

---

## Section grammar

Separate chapters in this order:

1. whitespace  
2. typography  
3. media  
4. subtle divider  
5. background surface  

Cards are last resort. Forbidden: outer card → inner card → media card → badge/card.  
Also forbidden: “no cards = no design.” Chapters must still be obvious.

---

## Motion, focus, geometry, responsive

- Motion: short, functional; honor `prefers-reduced-motion`; no decorative loops.
- Focus: visible ring; primary actions use CTA or acc token, not a one-off hex.
- Radius: control 10–12; media 14–16; gateway 16–20; modal 16.
- Shadow: modal, menu, popover, sticky bar only.
- 390: no overflow; 44px targets.
- 1440: empty side fields from wrong width are defects, not luxury.

---

## Surface examples

These examples express current defaults, not implementation gates. A user request or approved Sprint Brief may improve any surface, including one whose rendered status is PENDING, FAILED, or BLOCKED.

### A. HOME — editorial discovery

Inspect: Hero, Weekly 4, Recent 1, SPOMOVE 4.  
Recommendations must read as a curated lineup, not search results.  
Product lock: Home 4+4 (PD-001).

Visual priority (Home only): see **HOME VISUAL PRIORITY**, **PROGRAM MEDIA INTEGRITY**, **SEGMENT BALANCE** above.

Hero: compact opening. Weekly: strongest chapter (typography + instructional media that follows the source — no giant panel). Re-entry: one semantic row, left-clustered. SPOMOVE: same 1120 axis; hierarchy via quieter type, quieter start, and restrained navy mass — not a narrower shelf.

### B. LIBRARY DETAIL — editorial preparation

Order: Identity → Understand → Prepare → Recall (if data) → Discover Next → Action.  
Title/actions clear; video is visual anchor; method is readable; preparation is media + instruction; script is the design; related is next discovery (max 3).  
PDF / Notion = FAIL. No `items-stretch` equal-height panels. Setup = 4:3 contain. Video = 16:9. Desktop: compact Primary + Secondary near title. Mobile: Sticky.

### C. SPOMOVE HUB + START — digital sports content

Hub: media-first digital discovery, Deep Navy identity, no box-in-box, stimulus/pad visual.  
Start: one screen, one primary; settings quiet.  
Product lock: Browse open; Runtime Premium; session entry ≠ autostart (PD-006).

---

## Surface application

| Surface | Apply as |
|---------|----------|
| Programs | Editorial gateway |
| Library | Content catalog |
| Favorites | Retrieval |
| Manage | Operational |

Use the shared visual identity by default while allowing composition to follow surface purpose and any approved Target Reference. MANAGE is Operational and need not inherit HOME's Editorial composition. Explain meaningful surface-specific departures during review; no departure may change protected product semantics.

---

## Canonical implementation over CSS patches

Solve layout problems in the affected component's canonical layout. Do not use these as the default strategy:

- accumulating page-specific `!important` overrides
- controlling the same property in JSX/Tailwind and separate CSS
- arbitrary shrinking for one screenshot height
- shrinking typography to force content into a viewport
- masking an internal component structure problem with outer selectors
- accumulating page-specific `:has()` exceptions
- visual workarounds whose purpose is to preserve an implementation-string test

Evaluate responsive solutions in this order: content reflow, container resize, intentional scroll, then responsive composition. Font-size, touch-target, or hierarchy reduction is a last resort. Do not introduce a desktop-height-triggered compact mode without an explicit design requirement and rendered QA.

---

## Implementation mapping (not a second SSOT)

Until canonical CSS remap, these names remain:

`MasterPageShell`, `MasterPageHeader`, `MasterSection`, `MasterState`, `MasterAgenda`, `MasterCollectionRow`, `MasterContentCard`, `MasterDocumentSurface`

They implement layout roles. Width / type / rhythm in those files that disagree with this document are leftovers.

---

## Visual PASS vs static contract

| Kind | Meaning |
|------|---------|
| Static contract | Product semantics, behavioral contracts, accessibility hooks, and durable visual policy that can be checked without locking classes or DOM shape |
| Rendered visual PASS | Populated mobile and desktop review; when a Target Reference exists, side-by-side review against it |

Never mix them. Empty Favorites / empty Library / fixture-less Start cannot PASS.

Statuses: **PENDING** | **PASSED** | **FAILED** | **BLOCKED**. They record evidence and never grant or deny implementation permission.

Live ledger: [MASTER_SURFACE_MATRIX.md](./MASTER_SURFACE_MATRIX.md). Do not revive a long audit essay. Prior Foundation audit PASSes are void.

Human gate (all must be YES, especially 10):

1. First 3 seconds: know what to do?  
2. Strongest content is the most important?  
3. Content before chrome?  
4. Same role, same grammar across pages?  
5. Different roles feel different enough?  
6. Reads as a sports product?  
7. Trusted as a professional tool?  
8. Not a SaaS dashboard?  
9. Not Notion / PDF?  
10. Feels like one designer made it?
