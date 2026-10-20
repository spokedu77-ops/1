# Gate A — failure resolution (50 → 0)

## Final execution state

| Field | Value |
|---|---|
| Git HEAD | `f4e468dcd8eabbc046a968913a02e24c536b7bc9` |
| Preserved baseline | `WIDTH_QA_BASELINE_104_50.json` — 104 PASS / 50 FAIL |
| Final run | `WIDTH_QA.json` — 154 PASS / 0 FAIL |
| Build ID | `27mdFegm9DcU--QCsVvp9` |
| Process result | `WIDTH_QA_RUN.json` — 154 completed, exit code `0` |
| Working-tree CSS swap | Disabled; `gate-a-run-evidence.mjs` does not replace CSS |

The preserved baseline is SHA-identical to `WIDTH_QA_HISTORY_104x50_2026-10-19.json`.

## Root-cause disposition

| Route | Prior failures | Classification | Resolution |
|---|---:|---|---|
| `/contact` | 14 | `HARNESS_ERROR` | Test the real type-selection → form → submit-control flow; do not expect a submit button on initial render. No fields are filled and no form is submitted. |
| `/partners` | 4 | `HARNESS_ERROR` | Scope to the visible `#cta` customer CTA and verify its post-scroll box; ignore hidden navigation links. |
| `/education` | 14 | `HARNESS_ERROR` | Measure the Hero H1 text anchor against the page's responsive inset, not the first full-width container. |
| `/spomove` | 8 | `HARNESS_ERROR` | Measure the Hero H1 against the page's clamp gutter and centered text rail. |
| `/spokedu-lab` | 8 | `HARNESS_ERROR` | Validate the LAB navigation's actual 18 / 24 / 40px responsive padding tiers. |
| `/records` | 2 | `HARNESS_ERROR` | Measure the Hero title against the 1024–1199 rail inset without double-counting parent padding. |

No product UI CSS was changed to force these checks to pass. Each final row records its selected DOM, class, rectangle, computed padding/margin/max-width, expected coordinate, measured coordinate, CTA target, and outcome.

## Verification

- Representative matrix requested by the brief: 15/15 PASS in `WIDTH_QA_SPOT.json`.
- Full matrix: 154/154 PASS in `WIDTH_QA.json`.
- No horizontal overflow, missing visible H1, pending visible image, unusable required CTA, or browser page error was recorded.
- The final full run used the same HEAD and Build ID as the representative run.

## Final verdict

`LAYOUT_TECHNICAL_PASS_PO_PENDING`
