# 10. Phase 4 구현 결과

2026-11-09. 운영 DB, 색인 DB, 모델, n8n, 관리자 화면, OAuth 토큰 파일은 바꾸지 않았다.

## 1. 수정 파일

| 파일 | 내용 | 상태 |
|---|---|---|
| `C:\Users\joker\SPOKEDU-Assistant\rag_index.py` | 제목 완전 일치를 1순위로 두고, 그 다음 `0.45×코사인 + 0.35×제목 토큰 + 0.20×본문 키워드`. 문서당 청크 1개만 남김. 벡터는 프로세스 메모리 캐시. `score`는 코사인 유지, `hybrid_score`를 따로 둠 | IMPLEMENTED, 정확도 VERIFIED, 속도는 개선되지 않음 |
| `supabase_sessions.py` | 기간 조회, 월 집계, 같은 시각 중복 후보, `users` 이름 조회(같은 JWT) | 기간·월·일별 VERIFIED. 강사 이름 매핑은 BLOCKED |
| `server.py` | 도구 `get_sessions_by_range`, `summarize_sessions_by_month`. 등록 후 실행 로그 래핑. 기존 25개 이름·필수 인자 유지. RAG 응답에 `hybrid_score` 추가, `similarity_score`는 코사인 | VERIFIED (도구 27개, 시계·할 일 호출) |
| `storage.py` | `logs/tool_runs.jsonl`. 2MB마다 회전, 3개 유지. 기록 실패는 무시 | VERIFIED |
| `README.md`, `LM_STUDIO_ASSISTANT_INSTRUCTIONS.md` | 도구 수를 27로 맞춤 | 문서만 |

## 2. RAG 전후

같은 방식의 제목 앞 40자 15문항이다. 전체 업무 정확도가 아니다.

| | 이전 | 이후 |
|---|---|---|
| Top-1 | 4/15 | 14/15 |
| Top-3 | 4/15 | 14/15 |
| Top-5 | 4/15 | 14/15 |
| 첫 호출 | 약 9.2초 | 8.9초 |
| 이후 평균 | 약 9.0초 | 8.7초 |

문서 347, 청크 1,147은 그대로다. 결과 안에 같은 `file_id`가 두 번 나오지 않았다.

문장형 3개에서는 가중치를 바꾸지 않았다. “가이드라인” 문장은 1위 제목에 가이드라인이 있었다. “계약” 문장은 계약 문서가 4위였다. “강의계획서 양식” 문장은 1위 제목에 계획·양식이 있었다. 제목 평가셋 점수만 보고 가중치를 올리지 않았다.

속도가 거의 같은 이유는 매 질의마다 임베딩 API를 호출하기 때문이다. 벡터를 메모리에 올려 둔 효과는 이번 측정에서 0.2초 수준이다.

## 3. 수업 조회

보이는 행만 읽었다. 쓰기는 없었다.

| 검사 | 결과 | 상태 |
|---|---|---|
| 2026-11-08 일별 | `ok`, 8건, `truncated=false` | VERIFIED. Phase 2와 같은 건수 |
| 2099-01-01 | `ok`, 0건, `truncated=false` | VERIFIED |
| 같은 날 기간 조회 | 8건, 잘림 없음, 중복 후보 0 | VERIFIED |
| 2026-11 월 집계 | 205건, 잘림 없음. postponed 7, finished 17, verified 39, opened 142. 목록 본문 없음 | VERIFIED |
| 11월 기간 목록 | 205건, `truncated=false` | VERIFIED |
| 단건 조회 | `ok`. 표본의 `teacher_id`는 비어 있음 | VERIFIED (조회). 이름 매핑은 해당 없음 |
| 강사 ID·이름 | 11월 205건 모두 `teacher_id`가 비어 `teacher_name_status=empty` | BLOCKED. RLS `hidden`은 아님. 매핑할 ID가 데이터에 없음 |
| 강사별 필터 | 필터에 넣을 ID가 없어 호출하지 않음 | BLOCKED |

기관 이름과 수업 누락 판정은 만들지 않았다.

## 4. MCP 회귀

등록 도구 27개. 기존 이름 `get_current_datetime`, `get_sessions_by_date`, `get_session_details`, `search_rag_knowledge`, `list_tasks`가 목록에 있다.

stdio 호출: 시계 `2026-11-09` 월요일, 할 일 목록 `ok` 건수 1, 빈 기억 검색은 `ToolError`로 거절. Qwen3.5-9B와 임베딩 0.6B는 동시에 `loaded`였다.

Google 읽기 도구는 토큰을 건드리지 않으려고 다시 호출하지 않았다. 그 22개 중 쓰기는 여전히 미호출이다.

## 5. 실행 로그

실제 호출 3줄의 필드는 `at`, `tool`, `tool_ok`, `business_ok`, `ms`, `result_count`, `target_kind`, `error_code`뿐이다. 질의·본문·토큰은 없다.

- 시계: `tool_ok true`, `business_ok true` (날짜가 있어 결과를 확인함), `result_count null`
- 할 일: `tool_ok true`, `business_ok true`, `result_count 1`
- 빈 검색: `tool_ok false`, `business_ok false`, `error_code ToolError`

회전은 임시 파일에서만 확인했다. 200바이트 상한으로 `tool_runs.jsonl`, `.1`, `.2`가 생겼다. 기록 함수가 디스크 오류를 삼키는 것도 그 임시 경로에서 확인했다. 운영 로그 파일은 회전시키지 않았다. 기존 `tool_errors.log`는 그대로다.

## 6. OAuth

토큰 내용은 읽지 않았고 파일을 덮어쓰지 않았다. 존재만 확인했다.

- `%LOCALAPPDATA%\SPOKEDU-Assistant\secrets\token.json` 있음 (Calendar 읽기)
- `gmail_read_token.json` 있음
- `drive_token.json` 있음 (Sheets도 이 파일을 씀)

Phase 3에서 셋 다 갱신이 거절됐다. 갱신 성공 시 클라이언트가 토큰 파일을 다시 쓰므로, 이번 단계에서는 Google API를 호출하지 않았다. 상태: **BLOCKED**. 브라우저 로그인이 필요해 여기서 멈춘다.

읽기 재인증 스크립트는 `gmail_auth_read.py`만 있다. Calendar 읽기와 Drive 읽기 토큰을 다시 받는 스크립트는 이 폴더에 없다. `calendar_auth_write.py`와 `gmail_auth_send.py`는 쓰기 범위라 실행하지 않았다.

## 7. 남은 문제

1. 검색 지연은 임베딩 API가 대부분이다. 캐시만으로 줄지 않는다. 다음 후보는 질의 임베딩을 건너뛰지 않는 범위에서 API 지연을 따로 재는 것이다. 가중치는 유지한다.
2. 제목 15문항 중 1건은 여전히 Top-5 밖이다.
3. 문장형 “계약” 질의는 1위가 계약 문서가 아니었다.
4. `teacher_id`가 비어 있으면 강사 이름과 강사별 일정을 검증할 수 없다. 컬럼을 채우는 작업은 운영 데이터 변경이라 하지 않았다.
5. Calendar·Drive 읽기 재인증 스크립트가 없다. 토큰을 임의로 교체하지 않았다.

## 8. 롤백

| 변경 | 되돌리기 |
|---|---|
| 검색 | `rag_index.py`의 `search_index`를 코사인 정렬로 되돌린다. `rag_index.db`는 그대로다 |
| 수업 | `get_sessions_by_range`, `summarize_sessions_by_month`와 이름 조회 호출을 제거한다. 일별 도구 이름은 남긴다 |
| 로그 | `_install_run_logs` 호출을 제거한다. `tool_runs.jsonl`은 지워도 도구는 동작한다 |
| 문서 | README의 도구 수를 구현과 맞춘다 |

모델 언로드, 색인 삭제, Supabase 쓰기는 롤백 절차에 넣지 않는다.
