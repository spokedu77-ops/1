# Gate A review package

## Final verification identity

- Git HEAD: `f4e468dcd8eabbc046a968913a02e24c536b7bc9`
- Build ID: `27mdFegm9DcU--QCsVvp9`
- Representative matrix: 15/15 PASS (`WIDTH_QA_SPOT.json`)
- Full matrix: 154/154 PASS (`WIDTH_QA.json`)
- Process record: exit code 0 (`WIDTH_QA_RUN.json`)

## Re-run

Build once, run the representative matrix, and run the full matrix only when the representative result is clean. The runner refuses an occupied port and records partial route progress separately from the final JSON.

```powershell
npm run build
$env:GATE_A_HEAD = git rev-parse HEAD
$env:GATE_A_PORT = '3072'
$env:GATE_A_SPOT = '1'
node docs/operations/public-website-refactor/layout-foundation/scripts/gate-a-width-qa.mjs
Remove-Item Env:GATE_A_SPOT
node docs/operations/public-website-refactor/layout-foundation/scripts/gate-a-width-qa.mjs
```

## Required shared helper

`docs/operations/public-website-refactor/scripts/capture-page-utils.mjs`

The final ZIP includes this helper at the same relative path, so the script imports resolve after extraction.

The historical BEFORE/AFTER runner does not replace working-tree CSS. Preserved manifests and Hero metrics remain historical evidence; they are not regenerated during the final width run.
