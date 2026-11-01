# Phase B1 source inputs

Place the formal input archive here:

- `SPOKEDU_PHASE_B0_SOURCE_INPUTS.zip` (must contain `SOURCE_INPUT_MANIFEST.json`, Stage7 files, and `stitch_editorial_website_redesign.zip` or extracted stitch tree)

Stage7 copies (already ingested from attachments):

- `stage7/SPOKEDU_COPY_AUDIT_STAGE7_*.csv|md`

After adding the zip, run:

```bash
node docs/operations/public-website-refactor/contract-draft/scripts/generate-contract-draft.mjs
```

Do not commit secrets. Phase C code changes remain forbidden.
