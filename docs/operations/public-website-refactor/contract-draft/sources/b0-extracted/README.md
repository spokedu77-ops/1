# SPOKEDU Phase B0 — SOURCE INPUT BUNDLE

Contains SIX original source files copied byte-for-byte. The filenames have been normalized to remove `(1)` upload suffixes; `manifest.json` records their original names and SHA-256 hashes. These are source inputs, NOT approved execution contracts.

Unzip the package under:
`docs/operations/public-website-refactor/contract-draft/`

This will create:
- `sources/stage7/` — five source audit files
- `sources/stitch/stitch_editorial_website_redesign.zip` — original Stitch ZIP (six HTML, six screens, one design specification)
- `SOURCE_INPUT_MANIFEST.json` — source checksums

Do not modify the source assets. Expand the draft generator to actually parse 914 baseline rows, all 1289 reviews, all 24 root issues, and Stitch's six HTML files and design specification. Re-run only the generator/verification, leaving Phase C blocked and approval flags PENDING_APPROVAL.

No production changes, commits, pushes, deployments, or DB writes are authorized by this bundle.
