# Home tablet Hero issue (941px) — diagnostic only

**Phase 1-B3B:** Hero code/CSS **not modified**. This document is input for a future Hero sprint.

## Reported symptoms (user 941×861)

- Primary CTA not in first viewport
- Copy left-weighted, excess right margin
- English display type vs Korean H1 balance
- Hero image starts below fold

## Reproduction (Playwright probe, fresh build port 3004)

| Width | Hero height (px) | First CTA `top` (px) | CTA in first viewport (861px)? |
|-------|------------------|----------------------|--------------------------------|
| 768 | ~955 | ~964 | **No** |
| 834 | ~1016 | ~1025 | **No** |
| **941** | **~1115** | **~1124** | **No** |
| 1023 | ~1190 | ~1199 | **No** |
| 1024 | ~603 | ~577 | **Yes** |

At 941px, horizontal overflow: **false**.

## DOM / layout cause

Hero uses `section.hero` → `.heroGrid` (see `home-hero.tsx`).

**Breakpoint `@media (max-width: 1023px)`** in `home-web.module.css`:

```css
.heroGrid {
  grid-template-areas: 'copy' 'visual' 'actions';
}
.heroText { display: contents; }
```

Order inside copy: eyebrow → English display → H1 → lead. **Actions grid area is after full-width visual**, so CTA necessarily sits below the 16/10 hero image — typically **below 861px viewport** on tablet widths.

At **1024px+**, two-column `.heroGrid` returns; CTA can sit beside copy (`ctaInFirstViewport: true` in probe).

## Customer impact

Tablet users (common iPad / small laptop widths) may scroll through large typography + full-bleed image before any primary action — friction for “what do I do next?” and weak first-screen conversion **without claiming measured rate impact**.

## Improvement directions (for approval — not implemented)

### Option 1 — Actions before visual (tablet only)

Within `max-width: 1023px`, set areas to `'copy' 'actions' 'visual'` or duplicate compact CTA row under H1 inside `copy` area.

- **Pro:** CTA in first screen at 941px.
- **Con:** Visual punch moves down; needs design sign-off.

### Option 2 — Split tablet band (768–1023)

Use a two-column grid at ≥768 with copy+CTA left, smaller visual right (similar to 1024 layout with tighter columns).

- **Pro:** Balances type and image; CTA visible.
- **Con:** More CSS complexity; must not break 390px stack.

## Files for future change

- `app/spokedu/components/home-web/home-hero.tsx`
- `app/spokedu/components/home-web/home-web.module.css` (Hero block only — **out of B3B scope**)

## Evidence captures

- `captures/home-full-941.png` (full page, includes Hero)
