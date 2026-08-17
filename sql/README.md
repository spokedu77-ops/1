# sql/ — 수동 SQL

## 신규 환경 (기본)

**스키마 정본은 [`supabase/migrations/`](../supabase/migrations/) 만 적용합니다.**  
`sql/` 루트의 번호 매긴 `01_`~`77_` 스크립트는 **레거시**이며 [`archive/legacy/`](archive/legacy/)로 옮겨 두었습니다.

## 루트에 남긴 것

| 종류 | 예 |
|------|-----|
| README | `README_실행순서.md`, `README_schedules_일정테이블.md` 등 |
| 운영 보정 | `64_fix_round_index_after_cancel_bug.sql`, `*backfill*`, `sync_*`, `restore_*` |

## archive/legacy/

migrations에 흡수된 초기 IIWARMUP·schedules·memos·RLS 일괄 스크립트. **새 DB 부트스트랩용이 아님.**  
과거 수동 실행 이력 참고·데이터 보정 시에만 열어 보세요.

## 관련

- DB 마이그레이션 가이드: [`docs/PHASE5_DB_마이그레이션_가이드.md`](../docs/PHASE5_DB_마이그레이션_가이드.md)
