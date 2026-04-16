-- public.consultations RLS 활성화
-- 목적: PostgREST 노출 스키마(public)에서 직접 접근 차단
-- 참고: 현재 앱은 서버 API에서 service role(getServiceSupabase)로 읽기/쓰기 하므로 동작 유지됩니다.

ALTER TABLE IF EXISTS public.consultations ENABLE ROW LEVEL SECURITY;

-- 기본 정책: 일반 클라이언트(anon/authenticated) 직접 접근 불가
-- (정책을 만들지 않으면 RLS 활성화 시 기본 거부)

