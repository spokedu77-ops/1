# Stage 2A single-migration apply package

This package is a controlled exception to the normal Supabase migration workflow. It exists because the production migration ledger and GitHub migration timestamps are not aligned, while Supabase CLI 2.122.0 has no flag that selects exactly one migration.

It must not be used before separate production approval.

## Fixed target

- Project ref: `mwgvserdyflsqyhcqecp`
- Version: `20261026163542`
- Name: `stage2a_sync_assistant_teacher_counts`
- SHA-256: `6c78464825c2ba038a960cdda663428011ede592a552eb983e904fe9c6fd5f1d`

`20261026115102_stage2_session_writes_expand` is not a dependency. It only changes `spokedu_master_*` objects; this package only requires the legacy class-operations `sessions`, `session_count_logs`, counting functions, trigger, and unique index.

## Safety model

The runner:

1. Requires the exact project ref and an explicit `-Execute` flag.
2. Verifies the canonical migration SHA-256.
3. Rejects embedded transaction-control statements.
4. Uses `psql --no-psqlrc --single-transaction --set ON_ERROR_STOP=1`.
5. Verifies the target version is absent and the production prerequisite fingerprints match.
6. Locks `sessions`, `session_count_logs`, and the migration ledger against concurrent writes.
7. Executes only the canonical Stage 2A SQL.
8. Inserts exactly one migration-history row, with the exact migration SQL stored as one `statements` array element.
9. Verifies history, data counts, trigger definition, helper, and ACLs before commit.

Any error aborts the transaction, including the SQL changes and history insertion.

## Approved execution shape

Run `preflight.sql` first using a read-only credential or read-only transaction. After a separate production approval, invoke:

```powershell
.\ops\stage2a-single-apply\apply.ps1 `
  -DatabaseUrl $env:STAGE2A_DATABASE_URL `
  -ProjectRef mwgvserdyflsqyhcqecp `
  -Execute
```

Do not use `supabase db push`, `supabase migration up`, or `--include-all` for this deployment.

## Backup and rollback

Before execution, export `pg_get_functiondef`, `pg_get_triggerdef`, function owner/ACL/config, the full migration ledger, and aggregate automatic/manual log counts. Hash the exports and store them outside the repository.

If the apply command fails, its transaction rolls back automatically. If a post-commit functional rollback is approved, create a new rollback migration that restores the backed-up trigger function and trigger definition, drops `session_count_teacher_ids(uuid,text)`, restores ACLs, and records the rollback as a new migration. Do not delete or rewrite the `20261026163542` history row and do not automatically reverse legitimate count events that occurred after deployment.
