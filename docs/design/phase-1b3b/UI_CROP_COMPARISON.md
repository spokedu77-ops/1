# LAB mobile UI crop — comparison (Phase 1-B3B)

**Asset:** `/images/spokedu/subscription/library-program-cards-20261008-final.png` (1536×1004)  
**Image file:** not modified.

## A. Prior (B1/B2B baseline CSS, ≤767px)

Applied to **all** `.productFrame img`:

| Property | Value |
|----------|--------|
| Frame `aspect-ratio` | 4 / 5 |
| `width` | 230% |
| `left` | -34% |
| `top` | -4.2% |

**Pros:** Cards enlarged; filters partially visible.  
**Cons:** Heavy crop; hard to read as full library; risk of looking like a different product slice (B3A finding).

## B. Alternative considered (moderate zoom)

Example: `width: 160%`, `left: -15%`, 16/10 frame — not shipped; would still art-direct without showing full chrome.

## C. Selected (B3B) — structure-first on mobile

Scoped: `.masterStage .productFrame` only (Hero/Method unaffected).

| Property | Value @ 390px (computed) |
|----------|---------------------------|
| Frame `aspect-ratio` | 16 / 10 |
| `object-fit` | contain |
| `object-position` | top center |
| Image `width` | 100% of frame (348px) |
| `naturalWidth` | 1536 (loaded) |

**Capture:** `captures/lab-mobile-crop-after-390.png`, `captures/lab-390.png`

### Evaluation (§9 checklist)

| Question | After (C) |
|----------|-----------|
| Library screen recognizable? | Yes — filter row + card grid visible |
| ≥1 program card / nav element? | Yes |
| Misleading extreme crop? | Reduced vs 230% |
| 390px text/image balance? | Acceptable; letterboxing in frame |
| Page length | No extra slider/modal |

Desktop/tablet ≥768px keeps existing 16/9 art-directed `.productFrame img` rules (unchanged).
