# Stage7 검수 ID 중복 — 독립 해결 기록 (B1)

**정책:** 원본 crosswalk의 `검수 ID` 값은 변경하지 않음. 행 병합 없음.

| 검수 ID | 반복 횟수 | 구분 키 | 비고 |
|---------|----------|---------|------|
| META-01 | 3 | `archive_row_number` + `route` + `kind` | SEO/META title variants |
| META-02 | 3 | 동일 | SEO/META description variants |

**계약 export:** `CONTENT_CROSSWALK.csv` → `duplicate_review_id_in_914=YES`, 복합키 `baseline_text_id` + `archive_row_number`.

**검증:** `V1c_STAGE7_REVIEW_ID_DUPES` PASS (META-01/META-02 패턴만 허용).
