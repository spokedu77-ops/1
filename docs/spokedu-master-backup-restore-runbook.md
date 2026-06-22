# SPOKEDU MASTER Backup and Restore Runbook

This runbook covers SPOKEDU MASTER operational data only. It is based on repository code and migrations as of 2026-06-21. Do not treat unverified Supabase dashboard settings as complete.

## Backup Scope

Back up these public schema tables together:

- `spokedu_master_students`
- `spokedu_master_class_records`
- `spokedu_master_class_record_students`
- `spokedu_master_explanations`
- `spokedu_master_subscriptions`
- `spokedu_master_payment_orders`
- `spokedu_master_payment_webhook_events`

Back up this MASTER catalog/content table with the same recovery set when the goal is full product recovery rather than only owner-scoped operational data:

- `spokedu_master_program_meta`

Observed ownership columns:

- `owner_id`: students, class records, class record child rows, explanations
- `user_id`: subscriptions, payment orders
- `event_key`: webhook idempotency events
- `curriculum_id`: program meta catalog row identity, not an owner-scoped user-data key

Observed relationships:

- `spokedu_master_students.owner_id` references `auth.users(id)` with `on delete cascade`.
- `spokedu_master_class_records.owner_id` references `auth.users(id)` with `on delete cascade`.
- `spokedu_master_class_record_students.owner_id` references `auth.users(id)` with `on delete cascade`.
- `spokedu_master_class_record_students.record_id` references class records with `on delete cascade`.
- `spokedu_master_class_record_students.student_id` references students with `on delete set null`.
- `spokedu_master_explanations.owner_id` references `auth.users(id)` with `on delete cascade`.
- `spokedu_master_subscriptions.user_id` references `auth.users(id)` with `on delete cascade`.
- `spokedu_master_payment_orders.user_id` references `auth.users(id)` with `on delete cascade`.

Storage:

- Current SPOKEDU MASTER operational student, record, explanation, subscription, and payment flows do not write a MASTER-specific Supabase Storage bucket.
- Public program images and admin assets may use storage elsewhere in the product, but they are not part of the owner-scoped SPOKEDU MASTER operational-data restore scope unless a future feature stores user-owned files.

Auth:

- These tables reference `auth.users(id)`. A table-only backup does not by itself recreate missing auth users.
- If restoring into a temporary verification database, restore or map auth users before verifying owner relationships.
- Do not print full auth user IDs, DB URLs, service-role keys, or user emails in incident reports.

## Recommended Backup Cadence

Repository code cannot confirm the production Supabase backup schedule. Mark this as `confirmation required` until verified in the Supabase dashboard or infrastructure documentation.

Minimum commercial readiness target:

- Daily automated database backups.
- Point-in-time recovery availability confirmed for the paid production plan.
- Monthly restore rehearsal into a temporary database.
- Named owner for restore approval and execution.

## Migration Reproducibility

The current repository contains migrations for the MASTER operational schema:

- `20260605090000_spokedu_master_subscriptions.sql`
- `20260519120000_spokedu_master_program_meta_lesson_detail.sql`
- `20260603180000_spokedu_master_program_meta_images.sql`
- `20260615120000_spokedu_master_program_meta_content_fields.sql`
- `20260616120000_spokedu_master_operational_data.sql`
- `20260616123000_optimize_spokedu_master_operational_rls.sql`
- `20260616124000_fix_spokedu_master_updated_at_search_path.sql`
- `20260619120000_spokedu_master_explanations.sql`
- `20260621120000_spokedu_master_payment_webhook_events.sql`

`supabase/config.toml` was not present in this repository at the time of this runbook update, so local Supabase project reproducibility is not fully proven from repository configuration alone.

`spokedu_master_program_meta` is referenced by MASTER admin/program APIs, but this repository search found only `alter table` migrations for it, not the original `create table` migration. Treat that as a migration reproducibility gap until the table creation migration or baseline schema is confirmed.

Use a temporary or local database for rehearsal. Never run reset, drop, truncate, or restore commands against production without an explicit incident plan.

## Program Meta Schema Inspection

Use this read-only SQL before writing any baseline migration for `public.spokedu_master_program_meta`:

```text
scripts/sql/spokedu-master-program-meta-schema-inspect.sql
```

Execution steps:

1. Open the Supabase Dashboard.
2. Confirm the target project is the intended production, QA, or temporary project.
3. Open SQL Editor and paste the inspection script.
4. Run the script and save each result block as CSV or text.
5. Confirm the saved result does not contain passwords, API keys, DB URLs, cookies, or service-role keys.
6. Use the result as evidence for a future baseline migration.
7. Do not write a baseline migration until the real table schema result has been captured and reviewed.

The inspection script reports:

- Table existence and table type.
- Column definitions.
- Primary key and unique constraints.
- Foreign keys and referential rules.
- Index definitions.
- RLS state.
- RLS policies.
- Triggers.
- Table privileges.

Current code expectations to compare after the SQL result is available:

- Identity/key column expected by code: `curriculum_id`.
- Admin/program GET reads: `curriculum_id`, `sm_tags`, `sm_theme`, `sm_grade`, `sm_space`, `sm_duration`, `sm_is_pro`, `sm_is_new`, `sm_is_hot`, `sm_display_order`, `sm_objective`, `sm_development_focus`, `sm_coach_script`, `sm_parent_note`, `sm_related_spomove_ids`, `sm_thumbnail_url`, `sm_hero_image_url`, `sm_setup_image_url`, `sm_gallery_image_urls`, `sm_briefing_notes`, `sm_variation_method`.
- Admin/program save writes: `curriculum_id`, `sm_theme`, `sm_grade`, `sm_tags`, `sm_space`, `sm_duration`, `sm_setup_image_url`, `sm_coach_script`, `sm_briefing_notes`, `sm_variation_method`.
- Home featured route reads/writes: `curriculum_id`, `sm_is_hot`, `sm_display_order`.
- Sync/seed helpers expect conflict handling on `curriculum_id` and may seed `sm_tags` and `sm_gallery_image_urls`.
- Existing alter migrations add lesson-detail columns: `sm_objective`, `sm_development_focus`, `sm_coach_script`, `sm_parent_note`, `sm_related_spomove_ids`.
- Existing alter migrations add image/content columns: `sm_thumbnail_url`, `sm_hero_image_url`, `sm_setup_image_url`, `sm_gallery_image_urls`, `sm_briefing_notes`, `sm_variation_method`.

Do not mark this schema gap as resolved until the SQL result confirms the table definition, constraints, indexes, RLS, policies, triggers, and privileges.

## Restore Order

1. Confirm incident scope and affected owner IDs or payment records.
2. Pause writes or put the affected workflow into maintenance mode if needed.
3. Select the backup point.
4. Restore into a temporary database first.
5. Verify schema, RLS, indexes, and constraints.
6. Verify data integrity with `npm.cmd run qa:spokedu-master:data-integrity`.
7. Verify access, student, class record, explanation, subscription, and payment flows against the temporary database.
8. Decide whether to perform production repair or full restore.
9. If production repair is needed, prepare a separate reviewed SQL plan. This runbook's integrity script is read-only and does not repair data.
10. Write a post-incident report with scope, timeline, verification results, and remaining risk.

## Required Post-Restore Checks

- Login and `/api/spokedu-master/access` status.
- Student list by owner.
- Class record list by owner.
- `spokedu_master_class_record_students.record_id` connection.
- Linked student child rows by `student_id`.
- Orphan snapshot child rows where `student_id is null` but `student_name_snapshot` is present.
- Saved explanations list.
- Active subscription state and `period_end`.
- Payment order ownership and payment key uniqueness.
- Webhook duplicate prevention by `event_key`.
- Owner isolation across two test users.
- Browser smoke: `npm.cmd run qa:spokedu-master`.

## Stop Restore If

- Owner IDs cannot be trusted or mapped.
- Child rows exist without a class record.
- A child row owner differs from its class record owner.
- A linked student owner differs from the child row owner.
- Duplicate `spokedu_master_subscriptions.user_id` rows exist.
- Duplicate `spokedu_master_payment_orders.order_id` rows exist.
- Duplicate `spokedu_master_payment_webhook_events.event_key` rows exist.
- RLS is disabled on a MASTER operational table.
- Required RLS policies are missing for owner-scoped user-facing tables.
- Temporary DB and production DB cannot be clearly distinguished.

## Read-Only Integrity Check

Run only against a database URL that has been confirmed as local, QA, temporary restore, or explicitly approved read-only production.

```powershell
$env:SPOKEDU_MASTER_DATABASE_URL="postgresql://..."
npm.cmd run qa:spokedu-master:data-integrity
```

The script:

- Uses `psql`.
- Sets the transaction as read-only.
- Checks required tables and columns.
- Checks RLS enablement and policy presence.
- Checks orphan child rows.
- Checks owner mismatches.
- Checks subscription, payment order, and webhook duplicate risks.

It does not:

- Insert, update, delete, drop, truncate, or run migrations.
- Print the raw database URL.
- Repair data.

## Production Backup Status

Current repository status: `confirmation required`.

Before paid launch, confirm and document:

- Supabase production backup schedule.
- PITR availability.
- Restore retention window.
- Who can initiate a restore.
- Where restore rehearsal logs are stored.
