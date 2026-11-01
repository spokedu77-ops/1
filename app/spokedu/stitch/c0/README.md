# Stitch Phase C0 (isolated public preview)

Stitch ZIP `code.html` body is ingested into `bodies/*.html` (sources under `docs/.../stitch-unpacked` are not edited).

## Enable locally (does not change production until env is set on deploy)

```env
NEXT_PUBLIC_SPOKEDU_STITCH_C0=1
```

Restart `next dev`, then open `/`, `/education`, `/private`, `/spomove`, `/records`, `/about`.

With the flag **unset**, public routes keep the existing SPOKEDU marketing pages.

## Re-ingest from Stitch ZIP

```bash
node docs/operations/public-website-refactor/contract-draft/scripts/stitch-c0-ingest-html.mjs
```

## Fidelity QA vs static Stitch HTML

```bash
# Terminal 1: NEXT_PUBLIC_SPOKEDU_STITCH_C0=1 npm run dev
node docs/operations/public-website-refactor/contract-draft/scripts/run-stitch-c0-fidelity-gate.mjs
```

## Git worktree (recommended)

Current `main` has unrelated WIP; create an isolated worktree when clean:

```bash
git worktree add ../1-stitch-c0 -b phase-c0/stitch-six-pages
```
