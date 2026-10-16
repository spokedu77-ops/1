# Phase 1-B4A — Change Scope Audit

## Git

| Item | Value |
|------|--------|
| Branch | toss-review |
| HEAD | 9b370e2e3b798d6518dc7fdcac0dec6f18da0c82 |
| Commit / push / deploy | **None** |

## Service files changed (this phase)

1. `app/spokedu/components/home-web/home-web.module.css`  
2. `app/spokedu/components/home-web/home-hero.tsx`  

Diff: `phase-1b4a-source.diff`

## Hero CSS selectors touched

`.heroH1`, `.heroEnglish`, `.heroLead`, `.heroActions`, `.heroEyebrow` (tablet), `.heroGrid`, `.heroCopy`, `.heroVisual`, `.heroVisual .media` — plus removal of Hero rules from `@media (max-width: 1023px)` block (non-Hero rules in that block unchanged)

## TSX

**Modified** — Korean H1 + English display split (§7 위계; CSS-only 불가)

## Preserved

- Other uncommitted work outside these two paths not reverted by this task  
- CTA labels and paths unchanged  
- `HOME_HERO_IMAGE` path/alt unchanged  

## Out of scope

No edits to SPOMOVE/LAB/Gateway/Method/Records/FinalCTA service files in this phase.
