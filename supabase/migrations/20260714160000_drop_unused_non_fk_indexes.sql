-- Drop Unused Index candidates safely.
-- Keep an index if dropping it would leave any foreign key without a covering index.
-- Unique / PK / constraint-backed indexes are never dropped.

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private._index_covers_fk(p_index oid, p_fk oid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM pg_index x
    JOIN pg_constraint c ON c.oid = p_fk
    WHERE x.indexrelid = p_index
      AND c.contype = 'f'
      AND x.indrelid = c.conrelid
      AND (
        SELECT array_agg(attnum ORDER BY ord)
        FROM unnest(x.indkey::smallint[]) WITH ORDINALITY AS u(attnum, ord)
        WHERE ord <= cardinality(c.conkey)
          AND attnum > 0
      ) = c.conkey
  );
$$;

DO $$
DECLARE
  r RECORD;
  would_uncover_fk boolean;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schemaname,
      i.relname AS indexname,
      x.indexrelid,
      x.indrelid
    FROM pg_stat_user_indexes s
    JOIN pg_index x ON x.indexrelid = s.indexrelid
    JOIN pg_class i ON i.oid = x.indexrelid
    JOIN pg_class t ON t.oid = x.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE s.schemaname = 'public'
      AND s.idx_scan = 0
      AND x.indisunique = false
      AND x.indisprimary = false
      AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        WHERE c.conindid = x.indexrelid
      )
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM pg_constraint c
      WHERE c.contype = 'f'
        AND c.conrelid = r.indrelid
        AND private._index_covers_fk(r.indexrelid, c.oid)
        AND NOT EXISTS (
          SELECT 1
          FROM pg_index x2
          WHERE x2.indrelid = r.indrelid
            AND x2.indexrelid <> r.indexrelid
            AND private._index_covers_fk(x2.indexrelid, c.oid)
        )
    ) INTO would_uncover_fk;

    IF would_uncover_fk THEN
      CONTINUE;
    END IF;

    EXECUTE format('DROP INDEX IF EXISTS %I.%I', r.schemaname, r.indexname);
  END LOOP;
END
$$;

DROP FUNCTION IF EXISTS private._index_covers_fk(oid, oid);
