# Stitch Phase C — direct public integration

Stitch ZIP `code.html` bodies live in `bodies/*.html` (ingest from `docs/.../stitch-unpacked`; ZIP sources are not edited).

## Enable Stitch on the six public routes

Set at **dev/build start** (restart required):

```env
NEXT_PUBLIC_SPOKEDU_STITCH_C0=1
```

Unset or `0` → legacy marketing pages (production-safe default).

`/records/[slug]`, `/contact`, `/spokedu-lab`, `/spomove/catalog`, etc. are unchanged.

## Re-ingest

```bash
node docs/operations/public-website-refactor/contract-draft/scripts/stitch-c0-ingest-html.mjs
```

## Fidelity QA (static HTML vs Next)

```bash
npm run dev
node docs/operations/public-website-refactor/contract-draft/scripts/run-stitch-c0-fidelity-gate.mjs
```

## Change scope (Phase C touch set)

- `app/spokedu/stitch/c0/**`
- `app/(spokedu-public)/layout.tsx`
- `app/(spokedu-public)/{page,education,private,spomove,records,about}/page.tsx`
- `app/layout.tsx` (Stitch route body/html isolation only)
- `next.config.ts` (lh3 image host)

Legacy implementations remain under `app/spokedu/**` for rollback (`STITCH_C0=0`).
