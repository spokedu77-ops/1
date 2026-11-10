-- Admin acknowledgement only: does not change a teacher's tier, fees or points.
CREATE TABLE public.teacher_tier_acknowledgements (
  teacher_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tier_id text NOT NULL CHECK (tier_id IN ('silver', 'gold', 'diamond', 'partner')),
  acknowledged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (teacher_id, tier_id)
);

ALTER TABLE public.teacher_tier_acknowledgements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.teacher_tier_acknowledgements FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.teacher_tier_acknowledgements TO service_role;

COMMENT ON TABLE public.teacher_tier_acknowledgements IS
  'Shared admin acknowledgement per teacher and achieved tier; next tier remains unacknowledged.';
