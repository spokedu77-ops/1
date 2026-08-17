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
