# Release file manifest

Integration base: `c1a7ec52691f0f710e51a15aeb359e8eb7b55e76`  
Integration target (B5 + 2B + 2C scope): `f02d54274b970a8bbf5a3bf7bf4c63f2e12b3d60`  
Isolated verification tree: `../1-release-candidate-isolated` @ base + patch + binaries

| Path | Base blob (c1a7ec52) | Target blob (f02d542) | Isolated blob | Match |
|------|----------------------|------------------------|---------------|-------|
| `.env.example` | `7a37c7d8…` | `9ac94cdf…` | `9ac94cdf…` | yes |
| `app/api/curriculum/leads/route.ts` | `6a4c60ac…` | `b5c7b117…` | `b5c7b117…` | yes |
| `app/api/dispatch/leads/route.fault-injection.test.ts` | absent | `783d73a4…` | `783d73a4…` | yes |
| `app/api/private/leads/route.fault-injection.test.ts` | absent | `d05b3b69…` | `d05b3b69…` | yes |
| `app/spokedu/components/home-web/home-hero.tsx` | `df80921c…` | `231bbecb…` | `231bbecb…` | yes |
| `app/spokedu/components/home-web/home-web-assets.ts` | `c7f44ace…` | `3061e53c…` | `3061e53c…` | yes |
| `app/spokedu/components/home-web/home-web.module.css` | `0a1a6bee…` | `0bf484a3…` | `0bf484a3…` | yes |
| `app/spokedu/components/spomove-catalog-tabs.tsx` | `3c174aaa…` | `81460482…` | `81460482…` | yes |
| `app/spokedu/components/spomove-public-catalog.tsx` | absent | `03f813ad…` | `03f813ad…` | yes |
| `app/spokedu/contact/contact-page-data.ts` | `4640dbad…` | `f153732d…` | `f153732d…` | yes |
| `app/spokedu/contact/inquiry-submit.test.ts` | `256de55f…` | `5769e846…` | `5769e846…` | yes |
| `app/spokedu/contact/inquiry-submit.ts` | `54a6a7f9…` | `e43adc80…` | `e43adc80…` | yes |
| `app/spokedu/data/site-ia.test.ts` | `de4e1ba8…` | `1bdf6e58…` | `1bdf6e58…` | yes |
| `app/spokedu/data/spomove-program-page.ts` | `3bc8bb65…` | `7cd0570b…` | `7cd0570b…` | yes |
| `app/spokedu/data/spomove-public-catalog-page.ts` | absent | `c7e2d0c6…` | `c7e2d0c6…` | yes |
| `app/spokedu/programs/spomove/catalog/page.tsx` | `c299c666…` | `f4bb42af…` | `f4bb42af…` | yes |
| `public/images/.../home-hero-ai-20261018.png` | absent | `dd535fa2…` | `dd535fa2…` | yes |
| `public/images/.../home-hero-coaching.jpg` | absent | `76900a20…` | `76900a20…` | yes |

Artifacts in this folder:

- `MAIN_BASE_INTEGRATION_DIFF.patch`
- `MAIN_BASE_INTEGRATION_BINARY_APPLY.md`
- `included-assets/public/images/spokedu/home/field-editorial/*`
- `qa-evidence/*.json`
