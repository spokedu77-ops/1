-- AI 리포트 히스토리: student_id별 최신순 100건 조회에 유리
CREATE INDEX IF NOT EXISTS idx_spokedu_pro_ai_reports_student_created
  ON spokedu_pro_ai_reports (student_id, created_at DESC);
