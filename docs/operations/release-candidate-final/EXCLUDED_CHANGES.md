# Excluded changes (not in release patch)

The following differ between `c1a7ec52` and `f02d542` but are **out of scope** for this public release candidate:

## Product / admin (not approved for this package)

- `app/admin/camera/**` deletions and related API routes
- `app/admin/centers/**`, criminal-check file actions, center security tests
- `app/lib/centers/criminalCheckFiles*`, schema/type changes for center security
- `supabase/migrations/202610181*`, rollback SQL, center migration scripts
- `app/admin/layout.tsx`, `iiwarmup`, `spomove/training` incidental edits

## Documentation / ops noise

- Phase design capture ZIPs, integrated-release-review bundle, repomix-output.xml

## Dependency note

**No `SECURITY_DEPENDENCY_BLOCKED`:** B5, 2B catalog, and 2C contact paths do not import excluded center/camera/migration code. Release builds and tests pass without those files.

## Missing from package (intentional)

- Operator `.env.local` values (including `CONTACT_E2E_*` and admin credentials)
- E15 admin QA scripts under `docs/operations/phase-2c-contact-e2e/closure/` (reference only; not required to apply patch)
