# B2_COPY_REVIEW

**256** Stage7 `수정 제안` rows → `B2_COPY_REVIEW.csv`

| Field | Source |
|-------|--------|
| baseline_text_id | Stage7 검수 ID (unchanged) |
| stitch_element_id | CONTENT_CROSSWALK (usually NONE — no forced Stitch link) |
| original / proposed | crosswalk archive + proposed_copy_draft |
| reason | review_reason |
| fact_basis | stage7_publication_state (not final fact approval) |
| related_stage7_issues | ROOT_ISSUES token map |

**No proposed text is finalized.** Rows without ROOT_ISSUES link: `NONE`.
