-- tenant_content 학생 id와 spokedu_pro_students 매핑 (AI 리포트 등에서 사용)
ALTER TABLE spokedu_pro_students
  ADD COLUMN IF NOT EXISTS tenant_student_id UUID NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_spokedu_pro_students_tenant_id
  ON spokedu_pro_students(center_id, tenant_student_id)
  WHERE tenant_student_id IS NOT NULL;

COMMENT ON COLUMN spokedu_pro_students.tenant_student_id IS 'spokedu_pro_tenant_content(students)의 학생 id와 1:1 매핑';
