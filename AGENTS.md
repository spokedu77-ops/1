# Repository Agent Rules

## SPOKEDU MASTER

SPOKEDU MASTER is the canonical product for work involving `app/spokedu-master` and its related APIs, server access layer, persistence, and tests.

For any SPOKEDU MASTER task, read and apply these authorities in order:

1. [Product Contract](docs/SPOKEDU_MASTER_PRODUCT_CONTRACT.md) — product meaning, approved decisions, and change governance.
2. [Visual System](app/spokedu-master/MASTER_VISUAL_SYSTEM.md) — UI work only; the sole visual authority.
3. [Surface Matrix](app/spokedu-master/MASTER_SURFACE_MATRIX.md) — surface role and rendered-QA ledger, not a visual philosophy.
4. [SPOMOVE Product Contract](app/spokedu-master/spomove/SPOMOVE_PRODUCT_CONTRACT.md) — SPOMOVE work only.
5. A completed [Sprint Brief](docs/SPOKEDU_MASTER_SPRINT_BRIEF_TEMPLATE.md) — required for implementation work unless the user's explicit request itself supplies an equally clear approved scope.

Code owns executable truth where the Product Contract identifies a code SSOT. Do not copy pricing, entitlement, navigation, route, or persistence truth into prose.

Think globally. Decide explicitly. Implement only approved scope.

- Do not create another MASTER product or visual SSOT.
- Do not treat archived or superseded documents as authority.
- Do not change existing behavior merely for consistency, cleanup, or elegance.
- Do not infer runtime behavior from a pathname or component name alone; trace callers, consumers, state, destination, entitlement, and persistence.
- Global analysis does not authorize global refactoring. Edit only the user-requested or approved Sprint Brief scope.
- Stop and report if implementation exposes an unapproved change to product meaning, navigation, entitlement, pricing, persistence, session lifecycle, or SPOMOVE runtime semantics.

## Verification

Do not run `npm`, `npx`, test, TypeScript, ESLint, or build verification commands unless the user explicitly requests them or an approved Sprint Brief explicitly requires them. Use file inspection, static reasoning, available diagnostics, link checks, and changed-file review by default.

Static verification is not a rendered visual PASS. Rendered visual status is governed by the Visual System and Surface Matrix.

## Git publishing

- Do not stage, commit, push, create a branch, or open a pull request unless the user explicitly requests that exact action.
- Authorization for one Git action does not authorize any other Git action. For example, permission to commit does not include permission to push.
- After making code changes, stop with the changes uncommitted and report verification results unless the user explicitly instructs otherwise.
- Before any authorized commit, show and verify the exact file scope. Never include unrelated user changes.
- Before any authorized push, verify the target remote and branch and report local CI results.
