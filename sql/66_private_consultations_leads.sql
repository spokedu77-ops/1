-- Private 랜딩(/info/private) 상담 신청 저장용 (서비스 롤 insert)
-- Supabase SQL Editor에서 한 번 실행 후 사용하세요.
-- 테이블명을 바꾸면 환경변수 PRIVATE_LEADS_TABLE 로 맞춥니다.
-- 상담 스키마 확장(이름→parent_name, 상태 등)은 sql/67_consultations_parent_admin.sql 을 이어서 실행하세요.

CREATE TABLE IF NOT EXISTS public.consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.consultations IS '스포키듀 private 랜딩 상담 신청';

CREATE INDEX IF NOT EXISTS consultations_created_at_idx ON public.consultations (created_at DESC);
