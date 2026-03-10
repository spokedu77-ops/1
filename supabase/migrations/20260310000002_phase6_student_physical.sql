-- Phase 6: spokedu_pro_students에 physical JSONB 컬럼 추가
-- 신체 기능 데이터(협응력, 순발력, 지구력, 균형감, 근력)를 DB에 저장하기 위한 스키마 변경.
-- 기존 데이터 없음 → DEFAULT으로 전체 2(중) 세팅.

ALTER TABLE spokedu_pro_students
  ADD COLUMN IF NOT EXISTS physical JSONB NOT NULL DEFAULT '{"coordination":2,"agility":2,"endurance":2,"balance":2,"strength":2}'::JSONB;

-- AI 리포트 content 컬럼을 JSONB로 확장 (기존 TEXT → 리포트 구조체 저장)
-- 기존 TEXT 컬럼을 유지하되 jsonb 컬럼을 별도 추가
ALTER TABLE spokedu_pro_ai_reports
  ADD COLUMN IF NOT EXISTS report_json JSONB;

-- 생성일 기준 최신 리포트 조회 최적화
CREATE INDEX IF NOT EXISTS idx_spokedu_pro_reports_created
  ON spokedu_pro_ai_reports(center_id, created_at DESC);
