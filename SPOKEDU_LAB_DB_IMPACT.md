# SPOKEDU LAB DB 영향

> Stage 2 후속 DB 변경안이 추가되었다. 상세는 `STAGE2_P0_IMPLEMENTATION_REPORT.md`와 분리된 Expand/Contract migration을 참조한다. Expand는 두 version 컬럼과 세 v2 RPC를 추가하고, Contract는 legacy 네 RPC 권한을 회수한다. Production에는 적용하지 않았다. 아래 “변경 없음”은 최초 22항목 감사 수정 시점에 한정된다.

## 이번 변경

DB 변경 없음. 신규 migration, RPC, table, index, RLS 변경이 없으며 Production DB 적용도 수행하지 않았다.

## 감사된 구조

- `spokedu_master_students`: UUID 식별, owner scope, soft-delete `deleted_at`, owner+legacy_id unique index.
- `spokedu_master_class_students`: 현재 반 소속. 학생 보관 시 이 매핑만 hard delete된다.
- `spokedu_master_session_attendance`: 학생 UUID와 `student_name_snapshot`으로 과거 출석을 보존한다.
- `spokedu_master_class_records` / `_students`: 관찰 기록 및 snapshot; `capture_version >= 1`, record/student partial unique index.
- `spokedu_master_save_session_capture_v2`: session row lock, expected version 검사, version 증가, observation upsert/delete.
- `spokedu_master_program_favorites`: 단계 migration상 `content_type` backfill 후 NOT NULL/typed unique 예정. 운영 적용 상태 미확인.
- `think_asset_packs`: 관리자 콘텐츠 pack 저장. 현재 감사 범위에서 pack version/compare-and-swap 컬럼은 확인되지 않았다.
- refund request/event: `docs/sql-drafts`에만 존재하며 적용 migration이 아니다.

## 잠재 migration 후보(미작성/미적용)

- 환불 workflow 승인 후 request/event schema, provider operation state, idempotency, two-person approval, reconciliation job.
- SPOMOVE pack 동시 편집을 위한 revision 또는 path-level RPC.
- 명시적 학생 restore 정책이 승인되는 경우 restore RPC와 membership 복구 범위.

모든 후보는 기존 데이터 영향 분석과 별도 승인 전 구현하지 않는다.
