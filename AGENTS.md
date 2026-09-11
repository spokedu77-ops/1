# Repository Agent Rules

## SPOKEDU MASTER

SPOKEDU MASTER is the canonical product for work involving `app/spokedu-master` and its related APIs, server access layer, persistence, and tests.

For any SPOKEDU MASTER task, enter through this file, then read the canonical documents in this order:

1. [Product Contract](docs/SPOKEDU_MASTER_PRODUCT_CONTRACT.md) — product meaning, approved decisions, and change governance.
2. [Visual System](app/spokedu-master/MASTER_VISUAL_SYSTEM.md) — UI work only; the default visual system and sole visual SSOT.
3. [Surface Matrix](app/spokedu-master/MASTER_SURFACE_MATRIX.md) — surface role and rendered-QA ledger, not a visual philosophy or work gate.
4. The relevant domain contract, including the [SPOMOVE Product Contract](app/spokedu-master/spomove/SPOMOVE_PRODUCT_CONTRACT.md) for SPOMOVE work.
5. A completed [Sprint Brief](docs/SPOKEDU_MASTER_SPRINT_BRIEF_TEMPLATE.md) — required for implementation work unless the user's explicit request itself supplies an equally clear approved scope.

Code owns executable truth where the Product Contract identifies a code SSOT. Do not copy pricing, entitlement, navigation, route, or persistence truth into prose.

Think globally. Decide explicitly. Implement only approved scope.

Within an approved scope, resolve decisions in this order:

1. Product, data, and security invariants
2. The user's current explicit request and approved Product Decisions
3. A user-approved Target Reference, when one is named for the affected surface
4. The surface role and user journey
5. Visual System defaults
6. Existing implementation
7. Existing tests

Existing implementation and tests are evidence of the current state, not a veto over an approved change. Preserve product semantics, data meaning, persistence, owner/tenant isolation, security, entitlement, pricing, authentication/authorization, session lifecycle, navigation meaning, SPOMOVE runtime semantics, approved Product Decisions, and user-visible capabilities not approved for removal. Within an explicitly approved UI scope, layout, DOM/component structure, panel/card composition, spacing, type hierarchy, responsive composition, CSS architecture, and expanded/collapsed presentation may change. Preserve behavior, not accidental implementation.

- Do not create another MASTER product or visual SSOT.
- Do not treat archived or superseded documents as authority.
- Do not change product behavior merely for consistency, cleanup, or elegance. Do not use this rule to freeze visual implementation inside an approved design scope.
- Do not infer runtime behavior from a pathname or component name alone; trace callers, consumers, state, destination, entitlement, and persistence.
- Global analysis does not authorize global refactoring. Edit only the user-requested or approved Sprint Brief scope.
- Stop and report if implementation exposes an unapproved change to product meaning, navigation, entitlement, pricing, persistence, session lifecycle, or SPOMOVE runtime semantics.

## Verification

Do not run `npm`, `npx`, test, TypeScript, ESLint, or build verification commands unless the user explicitly requests them or an approved Sprint Brief explicitly requires them. Use file inspection, static reasoning, available diagnostics, link checks, and changed-file review by default.

An approved implementation scope may authorize the verification it needs, including targeted unit or contract tests, TypeScript checks, lint for changed files, rendered QA, and responsive screenshot comparison. Keep verification targeted to that approval.

Static verification is not a rendered visual PASS. A visual PASS requires populated desktop and mobile review and, when a Target Reference exists, side-by-side review. Rendered visual status is governed by the Visual System and Surface Matrix.

## Git publishing

- Do not stage, commit, push, create a branch, or open a pull request unless the user explicitly requests that exact action.
- Authorization for one Git action does not authorize any other Git action. For example, permission to commit does not include permission to push.
- After making code changes, stop with the changes uncommitted and report verification results unless the user explicitly instructs otherwise.
- Before any authorized commit, show and verify the exact file scope. Never include unrelated user changes.
- Before any authorized push, verify the target remote and branch and report local CI results.
