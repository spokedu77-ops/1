# Final release decision

**Verdict: `RELEASE_PACKAGE_READY_E15_BLOCKED`**

| Criterion | Status |
|-----------|--------|
| Integration patch + binaries on `c1a7ec52` | PASS |
| Second worktree patch verify | PASS |
| Isolated `npm ci`, typecheck, ESLint, Vitest, production build | PASS |
| CSS modules integrity | PASS |
| SPOMOVE catalog SSR/content QA | PASS |
| Home B5 SSR hero asset/copy probe | PASS |
| Contact API contract / fault-injection tests on isolated source | PASS |
| C01–C05 DB E2E re-run | Not repeated; blob parity with closure evidence PASS |
| E15 QA admin authenticated inbox | **BLOCKED_MISSING_CREDENTIALS** |

## Not in scope / excluded

Camera removal, center criminal-check migrations, security audit docs — see `EXCLUDED_CHANGES.md`. No `SECURITY_DEPENDENCY_BLOCKED`.

## Operator actions to reach `RELEASE_CANDIDATE_READY`

1. Configure local-only `CONTACT_E2E_*` including admin credentials on an approved non-production Supabase project.  
2. Run E15 closure script; attach evidence.  
3. Deploy integrated patch + binaries using normal release process (commit/push/deploy **not** performed in this task).

## Deliverables

- Folder: `docs/operations/release-candidate-final/`  
- ZIP: `SPOKEDU_RELEASE_CANDIDATE_FINAL.zip` (repo root)

This package supersedes `SPOKEDU_INTEGRATED_RELEASE_REVIEW.zip` as the **source-integrated** release candidate; it is not a rename of the prior 11-file review bundle.
