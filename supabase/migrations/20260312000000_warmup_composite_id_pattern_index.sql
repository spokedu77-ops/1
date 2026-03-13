-- 챌린지 목록 조회(.like('id', 'challenge_%')) 속도 개선
-- useChallengePrograms 등에서 사용
CREATE INDEX IF NOT EXISTS idx_warmup_composite_id_pattern
  ON warmup_programs_composite (id text_pattern_ops);
