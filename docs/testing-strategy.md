# Test suites

Tests are grouped by the risk they protect. File or assertion counts are not a
quality target; each release-blocking test must represent a current product
rule or a high-cost failure.

## SPOKEDU MASTER core

Run `npm run test:spokedu-master:core` for the fast release gate. Its explicit
allowlist covers:

- access and entitlement boundaries;
- payment ownership, idempotency, webhook, issue, and renewal behavior;
- Session-based operational reads and narrow mutations;
- Session roster, program, attendance, status, and Seoul-time invariants;
- navigation and terminology rules that prevent the legacy record workflow
  from returning.

Add a file to this suite only if failure should block a SPOKEDU MASTER release.
Prefer behavioral assertions over checks of source text or file layout.

## SPOKEDU MASTER legacy

Run `npm run test:spokedu-master:legacy` only when changing historical import,
archive, migration, or ClassRecord compatibility code. This suite protects old
customer data; it is not an active runtime contract and must not receive new
product behavior.

## Full repository regression

Run `npm run test:full` before broad releases or after shared-library changes.
It includes independent products such as Admin Note, SPOMOVE, and the public
site, so its file count must not be presented as the size of the SPOKEDU MASTER
test suite.

`npm test` remains an alias of the full suite for backward compatibility with
existing local and external automation.

## Repository typecheck

`npm run typecheck` (`tsc --noEmit --pretty false`) is the repository TypeScript
gate. GitHub Actions runs it from `.github/workflows/typecheck.yml`. The MASTER
`master-gate` job does not run typecheck.

## Lint execution authority

There is no single canonical repository-wide lint command.

- `eslint.config.mjs` owns ESLint **rule** configuration, not CI path scope.
- MASTER CI lint scope is `.github/workflows/spokedu-master-qa.yml` /
  `master-gate` (targeted `npx eslint … --max-warnings 0`).
- `npm run lint` currently lints `app/info/gym` only (legacy/manual). It is not
  the MASTER CI lint gate.
- `npm run lint:all` is a manual whole-repository lint (`eslint .`).
- `npm run lint:ci` is `eslint . --max-warnings 102` and is not invoked by
  GitHub Actions.
- `npm run lint:spomove` is a manual scoped command. Its current paths are
  `app/admin/spomove` and `app/api/spokedu-master` with `--max-warnings 0`.
