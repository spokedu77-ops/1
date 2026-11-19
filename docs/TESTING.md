# Current test and QA maintenance policy

Execution authorization comes from [AGENTS.md](../AGENTS.md), not this document. The user's current approved request governs scope. Commands below describe available checks; they are not instructions to run every check for every change.

## Choose evidence for the actual change

| Change | Relevant evidence when authorized |
|---|---|
| Documentation or agent rules | Read changed text, verify links and authority references, review diff. No browser or full application build needed. |
| Calculation, parsing, state or stimulus timing | Target the affected behavior tests, including failure and boundary cases. |
| UI or responsive behavior | Review populated local desktop/mobile. Check the affected interaction. Compare an approved reference when present. |
| Permission, ownership, payment or saved data | Target the protected boundary and affected failure/recovery paths. Preserve write guards and disposable-environment requirements. |
| Broad release | Explicitly select applicable core/full/type/lint/build and environment checks. Routine changes do not invoke the commercial release chain. |

Do not create tests that merely copy the implementation. Retire assertions for unused pages, former CSS classes, pixel sizes, decorative DOM order or fixed catalog counts unless a current semantic/accessibility contract requires them. If an old assertion conflicts with an approved change, update the assertion rather than reverting the approved product. Preserve meaningful authentication, data, payment, lifecycle, runtime timing and accessibility coverage, even when mixed into an old file.

## Current command map

package.json and the workflow/config files own executable command truth. This table explains scope only.

| Command | Scope |
|---|---|
| `npm run test:public` | Current public page/handoff behavior and field-record catalog integrity. Not a typography or visual approval. |
| `npm run test:spokedu-master:core` | Explicit core allowlist in vitest.spokedu-master-core.config.mts. |
| `npm run test:spokedu-master:legacy` | Historical imports/archives and old customer-data compatibility only. |
| `npm test` / `npm run test:full` | Retained app tests; broad regression, not the default for a small change. |
| `npm run typecheck` | Next route type generation followed by repository TypeScript checking. |
| `npm run lint` / `npm run lint:all` | Maintained repository scope defined by eslint.config.mjs. |
| `npm run lint:gym` | Explicit legacy Gym-only scope; never represents whole-app coverage. |
| `npm run lint:ci` | Repository CI lint with its configured warning budget; typecheck.yml runs both TypeScript and this lint. |
| `npm run qa:public-shell` | Current local public route, heading, overflow and mobile navigation smoke. |
| `npm run qa:public-typography` | Compatibility alias for the same current public smoke; does not lock font/pixel values. |

Public browser QA accepts `--route=/`, `--route=/education`, `--width=390`, `--width=1440`, `--capture` and `--list`. A positional loopback URL or SPOKEDU_QA_ORIGIN selects the local server. Default selection is seven public routes at mobile/desktop. Reports and failure screenshots remain under .qa-spokedu/public-current; screenshots for successful runs are opt-in. Browser QA never submits forms or changes customer data. LAB authentication/entitlements and specialist interactions require their own targeted checks; the public smoke does not replace them.

The former public typography/visual source-string suites were retired: they fixed obsolete Home files, CSS literals and internal names. Current public behavior remains in website/public-v2.contract.test.ts and domain tests. Do not recreate retired assertions to restore a historical test count.

## Honest results

State exactly what ran, in which environment, and what passed, failed, skipped or remains unverified. Do not present an old report, successful HTTP request, build, automated screenshot or arbitrary score as current visual approval, actual payment validation or durable persistence evidence. Missing configuration is blocked/unverified; a skipped check is not passed.

Commercial verification is an explicit release tool. It checks existing files, reports actual check counts without a fabricated starting score, and does not rebuild when the release runner has already completed the build in that invocation. Toss real payments, restore integrity and human visual approval require separate evidence. Existing environment/write guards remain in force.

## History

[The 2026-11-05 cleanup report](archive/maintenance-20261120/testing-history-20261105.md) preserves previous results. Its pass counts and removed-case lists are dated history, not today's baseline or instructions.
