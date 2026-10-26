# Stage 2C single-migration release package

Target `mwgvserdyflsqyhcqecp`; version `20261026171825`; SHA-256 `579b0c6d8cd712391c07446c093eb77326685b15c67661dc138d079d87b137c4`.

This is the same controlled single-migration exception used for Stage 2A. It never invokes `supabase db push` and records exactly one history row in the same `psql --single-transaction` as the canonical SQL. Any preflight, migration, history, ACL, no-backfill, data-count, or Stage 2A fingerprint failure rolls the whole transaction back.

Before a separately approved apply, run `backup.sql` and save its output outside the repository, then run `preflight.sql`. Apply only with:

```powershell
.\ops\stage2c-single-apply\apply.ps1 -DatabaseUrl $env:STAGE2C_DATABASE_URL -ProjectRef mwgvserdyflsqyhcqecp -Execute
```

Deployment order is database first, then application. The old application remains compatible because direct inserts and updates are protected by the trigger. The new application must not be deployed first because its atomic bulk endpoint requires the new RPC.

On apply failure, no action is needed: SQL and history roll back atomically. After a committed apply, roll the application back first. If database rollback is still required, turn `rollback.sql` into a newly timestamped, separately approved migration and apply it as another atomic migration. Never remove or rewrite the successful Stage 2C history row.
