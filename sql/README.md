# sql/ — 수동·운영 SQL (마이그레이션 이력 아님)

## 권한 모델

| 위치 | 역할 |
|------|------|
| [`supabase/migrations/`](../supabase/migrations/) | **정본 연대기 마이그레이션 이력.** 새 영구 스키마/RPC/RLS 변경은 기본적으로 여기에 둔다. |
| [`sql/`](.) 루트 | **수동/운영/수리 SQL.** 자동 적용되지 않는다. 파괴적일 수 있다. 실행 전 대상 프로젝트·백업·리뷰가 필요하다. |
| [`sql/archive/legacy/`](archive/legacy/) | **역사·프리-마이그레이션 증거.** 현재 스키마 권한이 아니다. 일상적으로 적용하지 말 것. 이후 마이그레이션과 겹친다는 이유만으로 삭제하지 말 것. |
| [`docs/`](../docs/) | 운영 안내. 스키마 SSOT가 아니다. |
| [`scripts/`](../scripts/) | 실행 어댑터/도구. 스키마 SSOT가 아니다. |

런타임 계약: 마이그레이션 이력이 **원본 객체를 포함할 때** → 최신 마이그레이션 + 현재 앱 코드. 일부 테이블의 `CREATE`는 이력에 없다(`sessions`, `users`, `note_documents`, `note_blocks`, `spokedu_master_program_meta`). 빈 프로젝트에 `supabase/migrations`만 적용해서 전체 DB를 재현할 수 없다.

## 루트 운영 SQL (고위험 — SQL 본문은 여기에 복제하지 않음)

실행 전에 파일을 읽고, 대상이 프로덕션인지 확인하고, 필요하면 백업한다.

| 파일 | 성격 |
|------|------|
| `64_fix_round_index_after_cancel_bug.sql` | `sessions` round-index 수리. 대량 UPDATE. |
| `65_backfill_mileage_log_session_date.sql` | mileage 백필 |
| `67_backfill_mileage_logs_session_link.sql` | mileage 백필 |
| `68_fix_all_teacher_count_mileage_dates.sql` | count/mileage 날짜 보정 |
| `99_session_count_logs_status_trigger.sql` | `sessions` 상태 트리거. **라이브 설치 여부는 저장소로 알 수 없다. 배포됨이라고 단정하지 말 것.** |
| `sync_teacher_ids_to_auth.sql`, `sync_four_teachers_to_auth.sql`, `sync_teacher_ids_bulk.sql` | 강사/Auth id 동기화 |
| `restore_chat_participants.sql` | 채팅 참가자 복구 |
| `add_users_ending_soon.sql` | 사용자 행 추가성 운영 SQL |

루트의 옛 `01_`–`77_` 부트스트랩 스크립트는 [`archive/legacy/`](archive/legacy/)로 옮겨 두었다. 새 DB는 **`supabase/migrations/`만** 적용 대상으로 본다 (베이스라인 공백은 위 표 참고).

## archive/legacy/

초기 IIWARMUP·schedules·memos·Note CREATE·RLS 일괄 등. **새 환경 부트스트랩용이 아니다.**
과거 수동 실행 이력·데이터 보정 참고에만 연다. Phase 5 FK SQL은 [`archive/legacy/36_session_count_logs_fk_to_public_users.sql`](archive/legacy/36_session_count_logs_fk_to_public_users.sql)이며, 가이드는 [`docs/PHASE5_DB_마이그레이션_가이드.md`](../docs/PHASE5_DB_마이그레이션_가이드.md)다.

같은 폴더의 `README_*.md`는 레거시 실행 안내일 수 있다. 현재 권한 모델보다 앞선 문서이므로 `supabase/migrations`와 충돌하면 마이그레이션 이력을 따른다.
