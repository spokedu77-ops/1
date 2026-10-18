# 06 Case data migration

**Status: PARTIAL**

- `/records` SSOT remains `field-records-catalog.ts` (unchanged this pass).
- `cases.ts` still feeds redirect-only program landings (`camp-program-landing`, `oneday-event-program-landing`) via `getCaseBySlug`.
- 서대문·다사랑 등 연도 통합: **원본 증빙 없이 병합하지 않음** — existing slugs `dasarang-oneday`, `seodaemun-event-booth` retained as separate catalog entries.

Next safe step (not blocking this remediation): map program landing proof cards to `FIELD_RECORD_CATALOG` entries and retire duplicate `cases.ts` rows.
