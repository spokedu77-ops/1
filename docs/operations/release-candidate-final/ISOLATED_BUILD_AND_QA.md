# Isolated build and QA

## Worktrees

| Path | Role |
|------|------|
| `C:\Users\joker\Documents\GitHub\1-release-candidate-isolated` | Build + test + `next start` QA |
| `C:\Users\joker\Documents\GitHub\1-release-candidate-patch-verify` | Second apply of text patch + binaries |

Source repo branch `spokedu-security-audit-20261018` @ `f02d542` was **not** reset; only worktrees at `c1a7ec52` were modified.

## Apply steps

1. `git apply --check MAIN_BASE_INTEGRATION_DIFF.patch` → PASS  
2. `git apply MAIN_BASE_INTEGRATION_DIFF.patch` → PASS  
3. Copy binaries per `MAIN_BASE_INTEGRATION_BINARY_APPLY.md` → PASS  
4. All 18 paths match `f02d542` blobs (see `RELEASE_FILE_MANIFEST.md`)

## Automated gates (fresh on isolated tree)

| Gate | Result |
|------|--------|
| `npm ci` | PASS |
| `npm run typecheck` | PASS |
| `npm run lint:ci` | PASS |
| Vitest (4 release files, 39 tests) | PASS |
| `npm run build` | PASS |
| CSS modules contract | PASS (`missingCount: 0`) |
| DB E2E re-run | Skipped; contract alignment PASS |
| E15 admin UI | BLOCKED_MISSING_CREDENTIALS |

## Browser QA (isolated `BUILD_ID=HhPxjwKy-dtg0eUThobrh`)

- `/spomove/catalog`: HTTP 200, first-party copy, no iframe, six activity titles present → PASS  
- `/spokedu`: SSR preload `home-hero-coaching.jpg` and expected H1 copy in HTML → PASS  
- Full Playwright DOM hero script: not executed (Chromium bundle missing in runner); see `qa-evidence/ISOLATED_BROWSER_QA.json`

Runtime used operator `.env.local` mirrored into the isolated tree **only for local server QA**; not included in ZIP.

JSON evidence: `qa-evidence/ISOLATED_BUILD_VERIFICATION.json`, `ISOLATED_BROWSER_QA.json`, `DB_E2E_CONTRACT_ALIGNMENT.json`.
