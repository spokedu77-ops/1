# Rollback plan

## Code rollback

1. Revert the 18-file integration (text patch inverse + remove two hero binaries if added).
2. Redeploy the previous production build artifact from Vercel/hosting history.
3. Confirm `/spokedu` hero and `/spomove/catalog` return to pre-release behavior.

## Data rollback

This release candidate does **not** ship DB migrations. Contact lead writes use existing tables; rollback is code-only unless operators manually revert errant rows.

## E15 / QA

E15 blockage does not affect rollback. No production test admin accounts were created.

## Verification after rollback

- `npm run build` on reverted tree
- Smoke `/spokedu`, `/spomove/catalog`, `/spokedu/contact`
- Admin consult list unchanged for production traffic patterns
