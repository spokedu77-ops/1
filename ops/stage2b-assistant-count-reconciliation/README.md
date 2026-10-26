# Stage 2B assistant-count reconciliation

Production snapshot: 2026-10-27, read-only transaction.

- Automatic-log definition: `reason = '트리거: sessions.status sync'`.
- 25 sessions differ under the automatic-log-only audit: 22 missing pairs and 6 stale pairs.
- 14 of the 22 missing automatic pairs already have a manual/historical log and are protected.
- 3 missing pairs contain malformed legacy metadata (blank teacher id) and are excluded.
- The proposed correction is therefore exactly 5 inserts and 6 deletes across 10 sessions (one session has both actions).
- No session row, manual/historical log, or user count is directly changed by this package.

`apply.sql` is intentionally unexecuted. It locks the log table and aborts on snapshot drift. `verify.sql` is read-only. `rollback.sql` restores the exact six deleted rows and removes only the five package-owned IDs. Re-run `scripts/stage2b-assistant-count-dry-run.mjs` and review drift immediately before any separately approved execution.
