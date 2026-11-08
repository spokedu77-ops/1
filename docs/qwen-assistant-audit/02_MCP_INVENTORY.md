# 02. MCP 인벤토리

서버 이름: `spokedu-assistant`  
실행: `Python312\python.exe C:\Users\joker\SPOKEDU-Assistant\server.py` (stdio)  
활성: LM Studio가 채팅에서 서버를 띄울 때만 프로세스가 생긴다. 이번 조사는 그 프로세스를 띄우지 않았다.  
도구 수: **25** (`server.py` `@mcp.tool` 이름 전수). 과거 “25개”와 코드 개수는 일치한다. README의 6개는 오래됐다.

상태 의미: IMPLEMENTED = 함수 존재. 오늘 CONNECTED / INVOCATION_VERIFIED / BUSINESS_VERIFIED 는 부여하지 않는다. 2026-10-11 `logs/tool_errors.log`는 과거 호출 실패 기록이다.

| 도구 | 기능 | 대상 | 권한 | 상태 | 근거 |
|---|---|---|---|---|---|
| get_current_datetime | 서울 날짜 | 로컬 시계 | 읽기 | IMPLEMENTED | server.py. 오늘 미호출 |
| save_memory | 명시 기억 저장 | assistant SQLite | 쓰기 | IMPLEMENTED | memories 1행. 과거 로그에 빈 content 거절 |
| search_memory | 부분 일치 | 동일 | 읽기 | IMPLEMENTED | 오늘 미호출 |
| list_memories | 목록 | 동일 | 읽기 | IMPLEMENTED | 행 수는 DB로 확인 |
| add_task | 할 일 추가 | SQLite tasks | 쓰기 | IMPLEMENTED | tasks 1행 |
| list_tasks | 목록 | 동일 | 읽기 | IMPLEMENTED | |
| complete_task | 완료 | 동일 | 쓰기 | IMPLEMENTED | |
| list_calendars | 캘린더 목록 | Google Calendar | 읽기 | IMPLEMENTED | 과거 로그에 토큰 없음 실패(임시 경로 테스트 포함) |
| get_calendar_events | 일정 조회 | Calendar | 읽기 | IMPLEMENTED | 과거 날짜 형식 오류 |
| create_calendar_event | 일정 생성 | Calendar | 쓰기, user_approved | IMPLEMENTED | 오늘 미호출. 승인 없이 실행하지 않음 |
| update_calendar_event | 수정 미리보기/적용 | Calendar | 쓰기+checksum | IMPLEMENTED | 코드·지침만 |
| delete_calendar_event | 삭제 미리보기/적용 | Calendar | 쓰기+checksum | IMPLEMENTED | 코드·지침만 |
| search_gmail_messages | 메일 검색 | Gmail | 읽기 | IMPLEMENTED | 오늘 미호출 |
| read_gmail_thread | 스레드 | Gmail | 읽기 | IMPLEMENTED | |
| create_gmail_draft | 임시보관 | Gmail | 쓰기 | IMPLEMENTED | |
| update_gmail_draft | 초안 수정 | Gmail | 쓰기, 로컬 승인 스크립트 | IMPLEMENTED | gmail_human_approvals 1행(내용 미열람) |
| send_gmail_draft | 발송 | Gmail | 쓰기, 로컬 승인 | IMPLEMENTED | send_approvals 0행. 오늘 발송 안 함 |
| get_sessions_by_date | 날짜별 수업 | Supabase | 읽기 | IMPLEMENTED | 과거 로그: 키 없음·로그인 필요·날짜 형식 |
| get_session_details | 수업 상세 | Supabase | 읽기 | IMPLEMENTED | 과거: 없는 session_id |
| search_drive_files | 파일 검색 | Drive | 읽기 | IMPLEMENTED | 과거: 토큰 없음과 빈 query. 인벤토리 성공 기록은 별도 |
| read_drive_document | 본문 읽기 | Drive | 읽기 | IMPLEMENTED | 과거: 이미지·스프레드시트 거절 |
| list_spreadsheet_tabs | 시트 탭 | Sheets | 읽기 | IMPLEMENTED | 오늘 미호출 |
| read_spreadsheet_range | 범위 읽기 | Sheets | 읽기 | IMPLEMENTED | |
| aggregate_spreadsheet_range | 집계 | Sheets | 읽기 | IMPLEMENTED | |
| search_rag_knowledge | 벡터 검색 | rag_index.db + LM 임베딩 | 읽기 | IMPLEMENTED, 검색은 BLOCKED 가능 | 색인 347/1147 존재. 임베딩 모델 not-loaded |

인증: Supabase는 publishable key + `supabase_auth_cli.py` 로그인(예시 JSON은 키를 플레이스홀더로 둠). Google은 로컬 OAuth 토큰 파일. 토큰 파일 존재 여부는 이번 조사에서 내용을 열지 않았다. 과거 오류 로그는 일부 실행에서 토큰이 없었다고 적는다.

호출 로그: 실패만 `logs/tool_errors.log`. 성공 호출 테이블 없음.

복구 우선순위:

1. LM Studio MCP 토글이 예시 JSON과 같은 명령인지 확인(설정 파일은 사용자 LM Studio 설정 폴더에 있으며 이번엔 그 파일을 수정하지 않음).
2. 임베딩 모델 로드 후 `search_rag_knowledge` 읽기 1회.
3. Supabase 세션 읽기 1회(`get_current_datetime` → `get_sessions_by_date`). 실패 시 로그의 로그인/키 메시지로 분기.
4. Calendar·Gmail·Drive 쓰기는 승인 설계가 있으므로 읽기 성공 뒤에만.

## 추가 (2026-11-08 읽기 호출)

위 표의 “오늘 미호출”은 감사 당시 기록이다. 아래 세 도구만 이후에 호출했다.

| 도구 | 발견 | 호출 | 결과 요약 | 이번 호출 상태 |
|---|---|---|---|---|
| get_current_datetime | 25개 목록에 있음 | 성공, 41ms, tool error 아님 | `ok=true`, 날짜 `2026-11-08`, 요일 일요일, 출처 `system_clock` | INVOCATION_VERIFIED |
| search_rag_knowledge | 있음 | 성공, 10740ms | `ok=true`, 3건. 기대 제목 `(25ver.)SPOKEDU 센터 수업 가이드라인`은 3위, 부분 색인 | INVOCATION_VERIFIED. 순위는 BUSINESS 수준 아님 |
| get_sessions_by_date | 있음 | 성공, 2626ms | `ok=true`, `2026-11-08` 8건, 잘림 없음. 출처는 Supabase `public.sessions` 읽기. 응답 키: session_id, title, status, start_at, end_at, session_type, registrar_name, assigned_teacher_id, assigned_teacher_name(값은 이 도구가 비움) | INVOCATION_VERIFIED |

나머지 22개 도구는 이번에도 호출하지 않았다. 쓰기 도구는 호출하지 않았다.
