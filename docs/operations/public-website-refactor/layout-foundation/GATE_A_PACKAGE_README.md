# Gate A review package

## Re-run QA (current build)

```powershell
npm run build
$env:GATE_A_HEAD = git rev-parse HEAD
$env:GATE_A_PORT = '3072'
node docs/operations/public-website-refactor/layout-foundation/scripts/gate-a-width-qa.mjs
node docs/operations/public-website-refactor/layout-foundation/scripts/gate-a-summarize.mjs
```

Spot (19 checks):

```powershell
$env:GATE_A_SPOT = '1'
node docs/operations/public-website-refactor/layout-foundation/scripts/gate-a-width-qa.mjs
```

## Shared helper (repo path)

`docs/operations/public-website-refactor/scripts/capture-page-utils.mjs`

## Full PNG tree

`BEFORE_AFTER/` on disk (not all included in slim ZIP).
