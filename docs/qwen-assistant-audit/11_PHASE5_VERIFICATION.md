# 11. Phase 5 — 읽기 검증과 원인

2026-11-09. 코드, 색인, 운영 DB, 토큰 파일, n8n, 관리자 화면은 수정하지 않았다.

## 1. Qwen 자연어와 MCP

LM Studio HTTP `POST /v1/chat/completions`는 `mcp.json`에 등록된 서버를 자동으로 붙이지 않았다. 도구 없이 11월 건수를 물었을 때 `tool_calls`는 없었고 본문만 425자였다. 데스크톱 채팅창의 MCP 세션은 이번 검증에 포함하지 않았다.

`MODEL_TOOL_E2E`는 모델 `qwen3.5-9b`에 도구 4개의 스키마를 주고, 모델이 고른 호출만 실제 `server.py` MCP로 실행한 뒤 건수 요약만 다시 넣은 루프다. 본문·사람 이름은 모델에게 돌려주지 않았다.

| 질문 | 모델이 고른 도구 | 최종 답 판정 | 구분 |
|---|---|---|---|
| 2026년 11월 수업은 총 몇 건이야? | `summarize_sessions_by_month` 1회 | 답에 205가 있음 | MODEL_TOOL_E2E 성공 |
| 2026년 11월 8일 수업을 조회해줘. | `get_sessions_by_date` 1회 | 답에 8건이 있음 | MODEL_TOOL_E2E 성공 |
| SPOKEDU 센터 수업 가이드라인을 찾아줘. | `search_rag_knowledge` 1회 | 답에 “가이드”가 있음. 도구 제목 전문은 모델에게 주지 않아 문서 제목 재진술은 확인하지 못함 | 도구 선택은 성공, 제목 정확도는 이 루프에서 미확인 |
| 현재 등록된 할 일을 알려줘. | `list_tasks` 1회 | 답 길이 7자. 205나 가이드는 없음 | 도구 선택은 성공. 제목 전달을 하지 않아 할 일 문장 일치는 미확인 |

도구 선택 4/4. 건수 해석은 월·일 2/2. 전체 답변 문장 정확도를 4/4로 쓰지 않는다.

`DIRECT_MCP_TEST` (모델 없음):

| 도구 | 결과 |
|---|---|
| `summarize_sessions_by_month` 2026-11 | ok, 205, truncated false |
| `get_sessions_by_date` 2026-11-08 | ok, 8 |
| `search_rag_knowledge` | ok, 3건, 1위 제목에 가이드라인 포함 |
| `list_tasks` | ok, 1 |

이 직접 호출 성공을 모델의 자율 실행으로 적지 않는다.

`logs/tool_runs.jsonl`에 위 도구들의 `tool_ok=true`와 건수 205, 8, 3, 1이 남아 있다.

## 2. 수업·RAG 정확도

직접 조회 건수는 Phase 4와 같다. RAG 1위는 가이드라인 문서다. 모델은 월 205, 일 8을 도구 숫자 그대로 말했다.

## 3. 강사 ID가 빈 이유

2026-11 수업 205건을 사용자 JWT로 `id, teacher_id, created_by, memo`만 집계했다. 본문은 저장하지 않았다.

| 필드 | 건수 |
|---|---|
| `teacher_id` 있음 | 0 |
| `created_by` 있음 | 205 |
| memo에 `EXTRA_TEACHERS:` | 67 |

관리자 수업 목록 `fetchAllClassListSessions`도 `teacher_id`를 읽지 않는다. 일정에 쓰는 강사 집합은 `public.session_schedule_teacher_ids(created_by, memo)`이며, 첫 원소가 `created_by`이고 memo의 보조 강사 id를 더한다. 이 함수는 `authenticated`에서 실행 권한이 거절돼 있고, MCP는 이 함수를 호출하지 않는다. MCP는 컬럼 `sessions.teacher_id`만 본다. 그 컬럼이 비어 있으므로 이름 조회는 `empty`다. RLS가 `users`를 막은 상태가 아니다. 같은 계정으로 11월 `created_by` 25명을 조회하면 이름 25명이 반환됐다. 이름은 보고서에 적지 않는다.

## 4. 강사 연결 개선 가능성

조회만으로 가능하다. 새 테이블은 필요 없다. 다만 MCP 주석과 관리자 일정 함수의 의미가 다르다. MCP는 등록자를 담당 강사로 말하지 말라고 하고, 일정 함수는 `created_by`를 강사 id 목록의 첫 값으로 쓴다.

승인 전에는 코드를 고치지 않는다. 승인 시 수정 후보는 `supabase_sessions.py` 한 파일이다.

- `teacher_id`가 있으면 그 값을 담당 강사로 둔다.
- 없을 때만 `created_by`를 주 일정 계정으로 두고, `EXTRA_TEACHERS`의 id를 보조로 분리한다.
- 이름은 지금과 같이 같은 JWT의 `users` 조회로 붙인다.
- 등록자 이름을 담당 강사 이름 칸에 몰래 복사하지 않고, 필드 이름을 구분한다.

영향: 채팅에 사람 이름이 나온다. 운영 행은 바꾸지 않는다. 되돌리기는 그 조회 함수만 제거하면 된다. 관리자 화면은 수정 대상이 아니다.

## 5. OAuth

브라우저 로그인은 시작하지 않았고 토큰은 덮어쓰지 않았다.

| 서비스 | 읽기 스크립트 | 상태 |
|---|---|---|
| Gmail 읽기 | `gmail_auth_read.py`가 있다. 범위는 `gmail.readonly`. 실행하면 `gmail_read_token.json`을 바로 덮어쓴다 | 준비됨. 실행은 승인 전 |
| Calendar 읽기 | `token.json`을 받는 읽기 전용 스크립트가 없다. `calendar_auth_write.py`는 쓰기라 실행하지 않음 | 스크립트 없음 |
| Drive·Sheets 읽기 | `drive_token.json`을 받는 스크립트가 없다 | 스크립트 없음 |

덮어쓰기 전에 할 일은 기존 파일을 `*.bak`으로 복사하고, 그 다음에만 읽기 스크립트를 실행하는 것이다. 그 복사와 로그인 시작은 별도 승인이 필요하다.

## 6. RAG 지연

질의 “SPOKEDU 센터 수업 가이드라인을 찾아줘”. 가중치·색인·모델은 그대로다.

| 구간 | 콜드 |
|---|---|
| 전체 | 9075ms |
| 임베딩 API 왕복 | 148ms |
| 인덱스 로드 | 28ms |
| 코사인 1064회 | 81ms |
| 토큰 분해 2129회 | 22ms (별도 측정) |
| 결과 JSON | 0ms |
| 접근 정책 검사 1064회 | 4956ms (별도 측정) |
| 그중 인벤토리 행 조회 | 1673ms |
| 그중 위험 목록 갱신 확인 | 1521ms |

워밍 후에도 전체 9324ms, 임베딩 116ms, 인덱스 로드 0ms다. 캐시는 벡터 로드만 없앤다. 느린 구간은 청크마다 `workspace_access.is_rag_base_blocked`가 인벤토리 DB를 다시 여는 부분이다.

실효 있는 최적화는 가중치를 건드리지 않고, 차단 집합을 프로세스 안에서 한 번만 읽어 청크 루프에서는 메모리 조회만 하는 것이다. 대상은 `workspace_access.py`의 반복 조회와 `rag_index.py`의 호출이다. 차단 결과가 지금과 같아야 한다. 색인 재생성은 필요 없다.

## 7. 승인 전 변경 후보

| 순서 | 파일 | 효과 | 위험 |
|---|---|---|---|
| 1 | `workspace_access.py`, `rag_index.py` | 검색 수 초 단축 가능 | 차단 누락 시 민감 문서가 검색될 수 있음. 같은 차단 집합 테스트가 필요 |
| 2 | `supabase_sessions.py` | 강사 이름을 `created_by`와 보조 강사 id로 표시 | 등록자와 담당 강사 의미가 답변에 드러남 |
| 3 | 새 읽기 인증 스크립트와 기존 토큰 백업 | Calendar·Drive 읽기 복구 | 승인 없이 토큰을 덮어쓰지 않음. 브라우저 로그인에서 중단 |

## 8. 우선순위

1. 검색 정책 조회의 반복 DB 접근을 없애는 설계를 먼저 확정한다. 지금은 제안만이다.
2. 강사 표시 의미를 승인받은 뒤 `teacher_id` 공란을 `created_by`+보조 강사로 읽는다.
3. OAuth는 백업 승인 다음에 Gmail 읽기부터 하고, Calendar·Drive는 읽기 스크립트를 만든 뒤 로그인 직전에 다시 멈춘다.
