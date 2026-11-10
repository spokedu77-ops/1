-- Split only explicit legacy "남 · 8세" / "여 · 9세" prefixes.
-- Preserve any already-confirmed gender and all age/grade detail after the separator.
WITH candidates AS (
  SELECT id, regexp_match(age_grade, '^[[:space:]]*(남|여)[[:space:]]*·[[:space:]]*([0-9].*)$') AS parts
  FROM public.admin_private_units
  WHERE deleted_at IS NULL AND gender = 'unknown'
)
UPDATE public.admin_private_units AS student
SET gender = CASE candidates.parts[1] WHEN '남' THEN 'male' ELSE 'female' END,
    age_grade = btrim(candidates.parts[2]),
    revision = student.revision + 1,
    updated_at = now()
FROM candidates
WHERE student.id = candidates.id
  AND student.gender = 'unknown'
  AND candidates.parts IS NOT NULL;
