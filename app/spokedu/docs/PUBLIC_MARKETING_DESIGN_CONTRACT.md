# SPOKEDU Public Marketing Design Contract

## Typography

This contract applies only to the public marketing website. Product UI under `/spokedu-master`, authenticated screens, admin tools, and class/player UI are outside this phase.

| Semantic role | Family | Weight | Synthesis | Canonical utility |
| --- | --- | ---: | --- | --- |
| Page title (H1) | Cafe24SsurroundAir | 400 | none | `marketingHeroDisplay` |
| Major section title (H2) | Cafe24SsurroundAir | 400 | none | `marketingSectionDisplay` |
| Compact display title | Cafe24SsurroundAir | 400 | none | `marketingCompactDisplay` |
| KPI / visual metric | Cafe24SsurroundAir | 400 | none | `marketingMetricDisplay` |
| H3 / card title | Pretendard | 400–700 | normal | inherited body family |
| Body / lead / caption | Pretendard | 400–700 | normal | `marketingBody`, `marketingSectionLead`, `marketingCaption` |
| Button / nav / eyebrow / label / chip / form | Pretendard | 400–700 | normal | inherited body family and UI utilities |

The single source of truth is the `.spokedu-marketing` foundation in `app/globals.css`: `--spokedu-marketing-font-display` and `--spokedu-marketing-font-body`. `--spokedu-marketing-font-metric` is a semantic alias of the display token. Display utilities must not add `font-bold`, `font-black`, `font-extrabold`, or synthetic weight.

Responsive type sizes may use scale-only companion utilities where a compact existing composition must be preserved. Those utilities must not redefine family, weight, or synthesis. Do not enforce the contract with broad `h1`/`h2` selectors, `!important` font patches, inline font styles, or page-specific font-family overrides.

## Reference

`SubscriptionV17Page` is the visual source reference: display type uses Cafe24SsurroundAir at weight 400 with `font-synthesis: none`, while reading and UI copy use Pretendard. Public marketing pages must follow the same philosophy without copying or redesigning the V17 layout.

## Color

All public semantic colors are owned by `.spokedu-marketing` in `app/globals.css`. The canonical palette is deep navy, navy, athletic blue, blue hover, pale blue, mint, paper, white, ink, body, muted, border, dark body, and dark eyebrow. Public primitives use `--spokedu-marketing-color-*` instead of maintaining parallel hexadecimal palettes in React.

`#245DFF` is the canonical public action blue; V17's nearby blue values remain internal to the reference implementation. SPOMAT red/yellow/green/blue and SPOMOVE activity colors are product-specific data colors and must not be reused as general CTA or surface colors.

## Radius and shadow

| Role | Token | Value | Use |
| --- | --- | ---: | --- |
| Small | `--spokedu-marketing-radius-small` | 14px | CTA, compact control |
| Medium | `--spokedu-marketing-radius-medium` | 22px | card, panel, media frame |
| Large | `--spokedu-marketing-radius-large` | 32px | hero, major surface |
| Pill | `--spokedu-marketing-radius-pill` | 9999px | chip, tag, status only |

Shadows have only three semantic levels: `subtle` for a resting surface, `interactive` for hover or CTA emphasis, and `media` for major visual frames. A component may intentionally have no shadow.

## Container and spacing

Public content shares a 77.5rem (1240px) axis through `marketingSectionInner` and `.site-container`. Full-bleed Home imagery is an explicit exception, but its text and CTA content aligns to that axis. V17 keeps its internal 1180px composition as the source reference.

`marketingSectionPad` is the standard section rhythm; `marketingSectionPadCompact` is the only compact variant. `marketingMajorGridGap` and `marketingCardPadding` own major grid and card-internal spacing.

## Button

The canonical CTA family is `marketingButtonPrimary`, `marketingButtonSecondary`, `marketingButtonPrimaryOnDark`, and `marketingButtonSecondaryOnDark`. It uses Pretendard, 15–16px type, weight 600, a 52px minimum height, the 14px small radius, one focus-ring language, and restrained fine-pointer lift. Primary and secondary CTAs are not pills.

## Surface

Use `marketingSurface`, `marketingCardStatic`, `marketingCardInteractive`, `marketingMediaFrame`, `marketingPanelEmphasized`, or `marketingDarkSurface` for shared border/radius/shadow language. Components remain separate when their layout or behavior differs; only their visual primitive is shared.

## Exceptions

- Home may retain its full-bleed field-photo hero composition.
- Subscription V17 remains structurally unchanged as the visual source reference.
- SPOMOVE activity colors and SPOMAT four-color product tokens remain product-specific.
- Scale-only H1 companions may change size and line-height, but never family, weight, or synthesis.

## Legacy disposition

| Status | Primitive | Decision |
| --- | --- | --- |
| Delete | `btnPrimary`, `btnSecondary`, `siteBtn*` | Removed after migration to the four canonical CTA variants. |
| Delete | `landingCardFrame`, `cardInteractive` | Replaced by `marketingCardStatic` and `marketingInteractiveTransition`. |
| Delete | `siteContainer`, `homeSectionPad*` | Replaced by `marketingSectionInner` and the two canonical section rhythms. |
| Delete | `homeGateCard` | Removed after Education and SPOMOVE gate cards migrated to `marketingCardInteractive` plus layout-only classes. |
| Keep | `landingHeroShell` | Shared hero composition primitive; its visual values now consume public tokens. |
| Keep | `homePathNavItem` | Home audience-navigation composition, not a competing global surface system. |
| Keep | `landingCardShell` | Variant behavior for image, glass, and gradient cards; semantic colors are tokenized. |

## Component composition

Components own layout and behavior: grid, flex direction, ordering, dimensions, content padding, and product-specific presentation. Canonical marketing primitives own shared visual grammar: color, border, radius, shadow, and interaction.

The Phase 3 composition inventory is resolved as follows:

| Classification | Examples | Decision |
| --- | --- | --- |
| Pure visual duplicate | `homeGateCard`, `premiumPanel*`, form shells, generic `*CardShell` helpers | Migrate to a canonical surface and delete the alias. |
| Layout composition | Private review accent, Dispatch row layout, program card content padding | Keep as layout-only classes composed with a canonical surface. |
| Semantic variant | `landingCardShell` image, dark, glass, and gradient modes | Keep the variant behavior; consume semantic foundation tokens. |
| Product-specific visual | SPOMOVE activity screens, SPOMAT four colors, product mockups | Keep product meaning; canonicalize only surrounding marketing chrome. |

`landingHeroShell`, the full-bleed Home hero composition, and Subscription V17 remain separate compositions. Sharing a visual contract does not require merging them into one React component.
