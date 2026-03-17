-- 운영 DB에서 challenge_% 조회 인덱스 존재 확인
-- 대상 인덱스: idx_warmup_composite_id_pattern (warmup_programs_composite.id text_pattern_ops)
--
-- Supabase SQL Editor에서 실행하세요.

select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'warmup_programs_composite'
  and indexname = 'idx_warmup_composite_id_pattern';

-- 참고: 인덱스가 없다면 아래 마이그레이션의 CREATE INDEX를 적용해야 합니다.
-- supabase/migrations/20260312000000_warmup_composite_id_pattern_index.sql

