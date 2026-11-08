# 09. Phase 3 — 읽기 검증과 구현 설계

2026-11-08. 코드·색인·운영 DB·모델·n8n은 변경하지 않았다. Phase 2에서 호출한 `get_current_datetime`, `search_rag_knowledge`, `get_sessions_by_date`는 다시 검증 대상으로 삼지 않았다. 수업 ID를 얻기 위해 같은 날짜 조회 함수를 한 번 호출한 것은 `get_session_details`의 입력 확보이며, 그 도구의 재검증이 아니다.

## 1. 25개 분류

| 도구 | 분류 | 이번 조치 |
|---|---|---|
| get_current_datetime | READ 로컬 | Phase 2에서 호출 완료. 재호출 안 함 |
| save_memory | WRITE 로컬 | 코드만. SQLite insert |
| search_memory | READ 로컬 | 호출 |
| list_memories | READ 로컬 | 호출 |
| add_task | WRITE 로컬 | 코드만 |
| list_tasks | READ 로컬 | 호출 |
| complete_task | WRITE 로컬 | 코드만. 상태 변경 |
| list_calendars | READ EXTERNAL | 호출. OAuth 갱신 실패 |
| get_calendar_events | READ EXTERNAL | 호출. 같은 실패 |
| create_calendar_event | WRITE EXTERNAL | 코드만. `user_approved=true`일 때만 insert |
| update_calendar_event | WRITE EXTERNAL | 코드만. false여도 기존 일정을 읽어 미리보기를 만들므로 호출하지 않음. true면 patch |
| delete_calendar_event | WRITE EXTERNAL | 코드만. true면 삭제 |
| search_gmail_messages | READ EXTERNAL | 호출. 토큰 갱신 실패. 읽음 처리 없음 |
| read_gmail_thread | READ EXTERNAL | 호출 안 함. 검색이 실패해 thread_id가 없음 |
| create_gmail_draft | WRITE EXTERNAL | 코드만. 임시보관 생성 |
| update_gmail_draft | WRITE EXTERNAL | 코드만. 로컬 승인 파일 필요 |
| send_gmail_draft | WRITE EXTERNAL | 코드만. 발송 |
| get_sessions_by_date | READ EXTERNAL | Phase 2 완료 |
| get_session_details | READ EXTERNAL | 호출 |
| search_drive_files | READ EXTERNAL | 호출. Drive 토큰 갱신 실패 |
| read_drive_document | READ EXTERNAL | 호출 안 함. 검색 실패로 file_id 없음 |
| list_spreadsheet_tabs | READ EXTERNAL | 호출 안 함. 시트 id 없음 |
| read_spreadsheet_range | READ EXTERNAL | 호출 안 함 |
| aggregate_spreadsheet_range | READ EXTERNAL | 호출 안 함. 시트 읽기이며 셀을 쓰지 않음 |
| search_rag_knowledge | READ 로컬+임베딩 | Phase 2 완료. 품질 측정은 같은 `search_index`를 직접 호출 |

## 2. 이번에 호출한 읽기

개인 내용, 메일 제목, 문서 본문, 기억 문장은 기록하지 않았다.

| 도구 | 시간 | 결과 | 데이터 | 업무 활용 |
|---|---|---|---|---|
| search_memory | 111ms | 성공 | `ok`, 건수 1. 질의는 `SPOKEDU` | 기억 1건 검색은 됨. 내용 품질은 평가하지 않음 |
| list_memories | 2ms | 성공 | 건수 1 | 목록 조회 가능 |
| list_tasks | 1ms | 성공 | 건수 1 | 할 일 목록 가능 |
| list_calendars | 499ms | 실패 | OAuth 토큰 갱신 실패 | 재인증 전에는 불가 |
| get_calendar_events | 490ms | 실패 | 같은 사유. 날짜 `2026-11-08` | 불가 |
| search_gmail_messages | 486ms | 실패 | Gmail 토큰 갱신 실패. `newer_than:2d`, limit 1 | 불가 |
| get_session_details | 533ms | 성공 | `ok`. 키에 `teacher_id`, `group_id`, `location_id`, 등록자 필드 있음. 강사 이름 필드는 없음 | 단건 읽기 가능. 강사 이름 업무에는 부족 |
| search_drive_files | 487ms | 실패 | Drive 토큰 갱신 실패. 질의 `SPOKEDU`, limit 5 | 불가 |

MCP 목록에는 위 도구가 모두 있었다. 실패 시 기존 서버가 `logs/tool_errors.log`에 한 줄 남긴다. 이것은 호출의 기존 동작이며, 로그 형식은 바꾸지 않았다.

## 3. 호출하지 않은 도구와 이유

- 쓰기 9개: `save_memory`, `add_task`, `complete_task`, `create_calendar_event`, `update_calendar_event`, `delete_calendar_event`, `create_gmail_draft`, `update_gmail_draft`, `send_gmail_draft`. 승인 없는 외부 변경과 로컬 행 변경을 하지 않기 위해 호출하지 않았다. 구현과 승인 분기는 코드에 있다.
- 읽기 5개: `read_gmail_thread`, `read_drive_document`, `list_spreadsheet_tabs`, `read_spreadsheet_range`, `aggregate_spreadsheet_range`. 상위 검색이 토큰 갱신에서 멈춰 대상 ID가 없었다. 코드는 읽기 전용이다. 인증이 살아 있기 전에는 업무 활용 불가다.

Calendar·Gmail·Drive는 서로 다른 토큰 파일이다. 셋 다 “파일 없음”이 아니라 “갱신 실패”다. 모델 교체나 패키지 설치로 해결되지 않는다.

## 4. RAG 품질 (색인 변경 없음)

측정 DB: `rag_index.db`. 문서 347, 청크 1,147. 청크 없는 문서 0, 문서 없는 청크 0. 문서당 임베딩 모델은 모두 `text-embedding-qwen3-embedding-0.6b`, 차원 1024. `rag_meta`도 같다. 코드 기본값과 현재 로드된 임베딩 모델과 일치한다. 모델 불일치로 이번 검색이 틀린 것은 아니다.

부분 색인은 1건이다. `indexed_chars` 최대값 50,000은 `MAX_CHARS_PER_DOC`와 같고, 그 상한에 닿은 문서도 1건이다. 원인은 본문이 상한보다 길어 `fetch_document_text`가 앞부분만 넣고 `partial_index`를 세우는 경로다. 한 번 색인 실행의 문서 수 상한은 20이다. 347은 여러 번 쌓인 결과다. Drive 인벤토리 21,683건 전체가 색인된 것은 아니다.

제목이 같은 문서 그룹이 10개다. 같은 문서 안에서 본문이 완전히 같은 청크 중복은 0이다.

정확도: 문서를 균등한 15곳으로 골라, 제목 앞 40자를 질의로 `search_index(..., top_k=5)`를 호출했다. 기대 문서가 Top-1인 경우 4/15, Top-3도 4/15, Top-5도 4/15다. 맞을 때는 1위였고, 틀릴 때는 5위 밖이었다. 제목 문자열 검색이 아니다. 지연은 8.5초에서 10.2초, 평균 9.0초다. 매 질의마다 1,147개 벡터를 프로세스 안에서 모두 비교한다.

대안 비교 (구현하지 않음):

| 안 | 기대 | 비용 |
|---|---|---|
| 1. 벡터만 유지 | 이번 15문항에서 제목 재현 27%가 유지됨. 지연 9초 | 변경 없음 |
| 2. 제목·키워드 검색을 앞에 둠 | 제목이 질의와 같으면 1위로 올릴 수 있음. 본문만 관련된 질문은 놓침 | `rag_index.py` 조회 한 갈래. 재색인 불필요 |
| 3. 하이브리드 | 제목 일치에 가산하고, 없으면 벡터 순위를 유지. 이번 실패 11건을 가장 직접 보완 | 같은 파일. 점수 해석이 달라짐 |
| 4. 재정렬만 | 상위 5개 안에서 제목을 다시 정렬. 5위 밖인 11건은 그대로 실패 | 효과가 이번 측정에서는 없음 |

권하는 순서는 3이다. 1은 현황 유지, 4는 이번 실패 형태에 맞지 않고, 2만 쓰면 의미 검색이 약해진다. 재색인은 상한 5만 자에 잘린 1건을 고칠 때만 별도 승인으로 한다.

## 5. 수업 조회 확장 설계

기존 `get_sessions_by_date`는 `public.sessions`를 하루 구간으로 읽고, `users`는 `created_by`(등록자)에만 붙인다. 응답에서 담당 강사 이름은 비운다. `get_session_details`는 `teacher_id`는 주지만 강사 이름은 주지 않는다. 상세에는 `group_id`, `location_id`가 있다.

관리자 수업 목록 `app/admin/classes/list/lib/fetchAllClassListSessions.ts`는 `id, group_id, title, start_at, end_at, status, created_by, round_total, round_index`를 읽는다. 강사 이름은 `app/admin/classes/list/page.tsx`가 `users`에서 `id, name`을 따로 읽어 맵으로 붙인다. 이 읽기 조합을 비서에 재사용할 수 있다. 수업 관리 화면 코드는 수정 대상이 아니다.

가능 여부:

| 기능 | 가능 | 방법 |
|---|---|---|
| 기간 조회 | 가능 | 하루 경계 대신 `start_at`의 시작·끝을 받는 읽기. 기존 페이지 크기 500을 유지 |
| 월간 집계 | 가능 | 그 구간의 건수를 상태별로 셈. 새 테이블 없음 |
| 기관별 현황 | 부분 | 상세의 `group_id`·`location_id`로 건수를 나눌 수는 있다. 기관 이름 열은 세션 조회에 없다. 이름까지 필요하면 관리자가 그룹 이름을 읽는 경로를 읽기 전용으로 한 번 더 확인해야 한다. 이번엔 그 조회를 하지 않음 |
| 담당 강사 이름 | 가능 | `teacher_id`로 `users.name`을 읽음. 목록 화면과 같은 소스. 등록자 이름과 섞지 않음 |
| 강사별 일정 | 가능 | 기간 조회 뒤 `teacher_id`로 묶음 |
| 중복 | 가능 | 같은 `teacher_id`와 `start_at` 건수. 관리자 가드가 보는 축과 같게 읽기만 함 |
| 누락 | 불가에 가깝다 | 빠져야 할 기준 시간표가 세션 테이블에 없음. 기준 없이 “없다”고 말하면 안 됨 |

새 테이블과 마이그레이션은 쓰지 않는다.

## 6. 실행 로그 최소안

실패는 이미 `logs/tool_errors.log`에 시각·도구·사유가 남는다. 성공은 없다.

추가 제안: 같은 폴더에 `tool_runs.jsonl` 한 줄. 필드만 둔다.

- `at`, `tool`, `ok`, `ms`, `result_count`, `target`, `error`

`target`은 날짜, 건수, 대상 종류만 둔다. 질의 문장, 메일, 기억 본문, 토큰, 사람 이름은 넣지 않는다. `error`는 기존 예외 문자열을 200자 안에서 자른다. 인증 헤더와 경로는 빼는 편이 안전하다.

호출 위치는 `server.py`의 각 도구가 아니라, 이미 실패를 모으는 `storage.py` 옆의 함수 하나다. 성공·실패가 같은 파일이 된다. 기존 실패 로그 파일은 지우지 않는다.

## 7. 먼저 구현할 기능 세 가지

인증 갱신은 코드 기능이 아니다. Calendar·Gmail·Drive 9개 읽기·쓰기는 토큰을 다시 받기 전에는 구현해도 호출이 실패한다. 그 작업은 사용자가 기존 인증 스크립트를 실행할 일인이지, 이번 승인 범위의 코드 변경이 아니다.

1. 수업 기간 조회와 강사 이름. 업무 가치가 가장 크고, 관리자 읽기 방식을 그대로 쓴다.
2. 검색 하이브리드(제목 가산). 재색인 없이 제목 재현 4/15와 9초 전수 비교를 동시에 다룬다. 전수 비교를 줄이는 것은 제목 후보를 먼저 거르는 쪽에 포함한다.
3. 성공·실패 한 줄 로그. 이후 도구 검증의 근거가 파일로 남는다.

## 8. 수정 파일·영향·복구 (아직 수정하지 않음)

| 기능 | 파일 | 영향 | 복구 |
|---|---|---|---|
| 기간·강사 이름 | `C:\Users\joker\SPOKEDU-Assistant\supabase_sessions.py`와 `server.py`의 세션 도구 설명 | 읽기 인자 추가. 운영 테이블 스키마 변경 없음. 관리자 수업 화면 파일은 수정하지 않음. 응답에 강사 이름이 생겨 채팅에 사람 이름이 나올 수 있음 | 해당 함수를 하루 조회·이름 공란으로 되돌림 |
| 하이브리드 검색 | `rag_index.py`의 `search_index` | 순위와 지연만 바뀜. `rag_index.db`는 쓰지 않음. 임베딩 모델 유지 | 가산 로직 제거. 색인 파일은 그대로 |
| 실행 로그 | `storage.py`, `server.py`에서 그 함수를 호출 | 로컬 jsonl만 증가. Supabase·Drive·메일 없음 | 호출 제거. 생긴 로그 파일은 삭제해도 기능은 돌아감 |

사용자 승인 전에는 이 세 가지를 구현하지 않는다.
