# 12. Phase 6 결과

2026-11-09. 운영 DB, 색인 파일, 모델, n8n, 관리자 화면, 토큰 파일은 바꾸지 않았다. 브라우저 로그인은 시작하지 않았다.

## 1. RAG 시간

같은 제목 15문항. 점수 가중치와 정렬은 그대로다.

| | Phase 5 | 이번 |
|---|---|---|
| 평균 | 약 9.1초 (한 질의) | 3938ms |
| 중앙값 | — | 3932ms |
| 최악 | — | 4126ms |
| Top-1 | 14/15 | 14/15 |

문장 “센터 수업 가이드라인은 어디에 있나”는 3928ms, 1위 제목에 가이드라인이 있다.

접근 판정 동일성: 문서 347개의 `(file_id, title)`에 대해 기존 `is_rag_base_blocked`와 새 일괄 판정을 비교했다. 불일치 0. 차단으로 나온 키 35. 권한 검사를 빼지 않았다. 판정 맵은 검색 함수가 끝나면 버리고, 프로세스에 남기지 않는다. 다음 검색은 DB를 다시 읽는다.

남은 시간은 검색마다 한 번 도는 `load_blocked_rag_base_ids` 전체 목록 조회다. 청크마다 DB를 열던 구간은 제거했다.

## 2. 강사·등록자·보조 강사

11월 기간 조회 205건. 이름은 기록하지 않는다.

| 구분 | 결과 |
|---|---|
| `assignment_status=assigned` (`teacher_id` 있음) | 0 |
| `unassigned` | 205 |
| `assigned_teacher`가 채워진 건 | 0. 등록자로 채우지 않음 |
| `created_by_user.id` | 205 |
| `created_by_user.name` 조회 | 205. `teacher_name_status=resolved` |
| `extra_teachers` id | 42 |
| 그 이름 조회 | 42 |
| 보조 강사를 주강사로 올린 건 | 0 |

일별 2026-11-08은 8건, 상태 `unassigned`. 월 집계는 205, `truncated=false`. 단건 조회도 `unassigned`이고 `created_by_user`만 있다. 기존 건수와 도구 이름은 유지된다.

## 3. MCP 회귀

도구 추가·삭제 없음. 등록 수는 27 그대로다. 일별·월간·단건 건수는 Phase 4와 같다.

## 4. OAuth 준비

| 파일 | 범위 | 대상 토큰 | 실행 |
|---|---|---|---|
| `gmail_auth_read.py` | `gmail.readonly` | `gmail_read_token.json` | 플래그 없이 실행. 기존 파일이 있어 종료 코드 2. 덮어쓰지 않음 |
| `calendar_auth_read.py` | `calendar.readonly` | 읽기 `token.json`만. 쓰기 토큰 아님 | 실행하지 않음 |
| `drive_auth_read.py` | `drive.readonly` | `drive_token.json` | 실행하지 않음 |

세 스크립트 모두 기존 파일이 있으면 `--approve-replace` 없이는 브라우저를 열지 않고, 그 플래그가 있을 때만 `.bak` 복사 후 교체한다. 쓰기 스크립트와 쓰기 토큰은 수정하지 않았다. 로그인과 교체는 추가 승인 전이다.

## 5. Qwen과 MCP

HTTP API는 `mcp.json`을 자동으로 쓰지 않는다. LM Studio 설정에는 이미 `spokedu-assistant`가 `server.py`로 등록돼 있다. 자연어에서 도구까지 가는 최소 경로는 그 데스크톱 MCP 호스트다. 새 브리지는 만들지 않았다. API로 같은 루프를 붙이려면 별도 프로세스가 필요하므로 이번 파일 변경에 넣지 않았다.

## 6. 수정 파일과 롤백

| 파일 | 롤백 |
|---|---|
| `workspace_access.py` | `block_map_for_search` 제거. `is_rag_base_blocked`는 그대로 |
| `rag_index.py` | 검색 루프를 청크별 `is_rag_base_blocked` 호출로 되돌림. 색인 DB는 그대로 |
| `supabase_sessions.py` | 역할 필드를 제거하면 기존 `assigned_teacher_*`만 남음. `teacher_id`를 등록자로 채운 적은 없음 |
| `gmail_auth_read.py` | `--approve-replace` 강제를 빼면 이전처럼 바로 덮어씀 |
| `calendar_auth_read.py`, `drive_auth_read.py` | 파일을 지우면 됨. 토큰은 쓰지 않았음 |

## 7. 다음 순서

1. `load_blocked_rag_base_ids`가 검색마다 인벤토리 전체를 다시 분류하는 나머지 약 3초대.
2. OAuth는 `--approve-replace` 승인 뒤에만 Gmail부터. Calendar·Drive는 그 다음이고, 브라우저가 열리기 직전에 다시 확인.
3. LM Studio 채팅창에서 MCP가 켜진 상태의 자연어 검증. HTTP API만으로는 도구가 자동 연결되지 않는다.
