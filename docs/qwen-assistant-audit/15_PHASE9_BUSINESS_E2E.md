# 15. Phase 9 — 업무 실사용 검증

2026-11-09 21:03 전후. 코드, DB, 색인, 모델, 토큰, n8n은 바꾸지 않았다. 쓰기 도구는 호출하지 않았다. HTTP 채팅 API로 질문을 보내지 않았다.

Phase 8 보고는 채팅 MCP를 성공으로 닫지 않았다. 이번 창에서 확인한 호출만 아래에 적는다.

## 환경

보이는 창 제목 `LM Studio`는 PID 28632(`LM Studio.exe --run-as-service`) 소유다. 자식 renderer PID 8904가 있다. 실행 파일은 `C:\Users\joker\AppData\Local\Programs\LM Studio\LM Studio.exe`다. 프로세스는 종료하지 않았다.

Developer → Local Server:

- 서버 `Running`, `http://127.0.0.1:1234`
- 로드된 모델 `qwen3.5-9b`, READY, GGUF Q6_K, 8.28GB, API 식별자 `qwen3.5-9b`
- 채팅 상단 모델 표시도 `qwen3.5-9b`
- 임베딩 모델 로드 여부는 이 화면에서 다시 열지 않았다

Integrations, 채팅이 앞에 있을 때:

- `mcp/spokedu-assistant` 켜짐
- `mcp/photocraft` 꺼짐
- `rag-v1` 꺼짐
- `js-code-sandbox` 꺼짐

`mcp.json`의 명령은 `Python312\python.exe`와 `C:\Users\joker\SPOKEDU-Assistant\server.py`다. 채팅 플러그인 상세에서 도구 27개와 호출 승인 설정은 펼치지 못했다. `server.py` 선언 27개와 채팅에 전달된 목록은 아직 별개다.

Developer 로그 `2026-11-09 20:59:18`에 `[Client=plugin:installed:mcp/spokedu-assistant] Client disconnected`가 있다. 그 직전 도구 호출은 성공했다.

## 1. 여섯 시나리오

기대값(이전 직접 조회): 11월 205건, 11월 8일 8건, 담당 강사 지정 0, 미지정 205, 등록자 이름 205, 보조 강사 42, 할 일 1건.

| 시나리오 | 판정 | 근거 |
|---|---|---|
| 월간 수업 건수 | PASS | 채팅 `November 2026 Sessions Count`. 질문: “2026년 11월 SPOKEDU 수업 건수를 summarize_sessions_by_month 도구로 조회해줘. 조회된 숫자만 답해줘.” 화면에 `summarize_sessions_by_month`, `mcp/spokedu-assistant`, 답 `205`. 로그 `2026-11-09T11:59:02+00:00`, `result_count` 205, `tool_ok` true. |
| 날짜별 수업 | UNVERIFIED | 질문을 넣지 못함 |
| 담당 강사·등록자·보조 강사 | UNVERIFIED | 질문을 넣지 못함 |
| 운영 가이드라인 검색 | UNVERIFIED | 질문을 넣지 못함 |
| 할 일·기억 | UNVERIFIED | 질문을 넣지 못함 |
| 수업 현황과 운영 지식 결합 | UNVERIFIED | 아래 복합 질문과 같음. 보내지 못함 |

월간 건수는 모델 기억으로 205를 쓴 경우가 아니다. 도구 행과 같은 시각의 로그가 있다. 다만 사용자가 도구 이름을 질문에 넣었고, “숫자만”이라고 해서 조회 월을 답에 다시 적지는 않았다. 인자 패널(연·월)은 펼치지 못했다.

## 2. 복합 업무

질문 “2026년 11월 SPOKEDU 수업 현황을 정리하고 관련 센터 수업 운영 가이드라인을 찾아 핵심 내용을 요약해줘.”는 보내지 않았다.

`summarize_sessions_by_month`와 `search_rag_knowledge`를 한 답에서 같이 호출했는지는 UNVERIFIED다.

## 3. 답과 데이터의 일치

확인된 것은 11월 건수 205뿐이다. 직접 조회 값과 같다. 나머지 시나리오는 모델 답변이 없어 일치 여부를 말하지 않는다.

## 4. 로그

`C:\Users\joker\SPOKEDU-Assistant\logs\tool_runs.jsonl`에서 이번 채팅과 맞는 새 줄은 하나다.

`2026-11-09T11:59:02+00:00` `summarize_sessions_by_month` `result_count` 205 `ms` 3089.

그 앞의 `2026-11-08T15:32` 줄은 이번 채팅이 아니다. 21:03 이후에 추가된 줄은 없다.

## 5. 문제

- 채팅 창이 Cursor·Chrome 뒤에 있어, 새 채팅을 연 뒤 다섯 질문을 이어서 넣지 못했다. `Ctrl+N`은 Chrome 새 탭에 들어갔고, 그 탭은 닫았다. ChatGPT 입력창에는 타이핑하지 않았다.
- 월간 건수 질문은 도구 이름을 사용자가 지정했다. 모델이 스스로 고른 선택은 아직 없다.
- 플러그인 도구 개수와 승인 방식은 화면에서 확인하지 못했다.
- 서버 로그에 MCP 클라이언트 disconnected가 있다. 205건 호출 자체를 깨뜨리지는 않았다.

## 6. 개선 우선순위

기능을 추가하지 않는다. 다음 확인이 먼저다.

1. LM Studio 채팅을 다른 창이 가리지 않는 상태에서 날짜, 역할 구분, 가이드라인, 할 일·기억, 복합 질문을 각 한 번씩 보낸다.
2. 복합 질문에서 수업 도구와 RAG 도구가 둘 다 찍히는지 본다.
3. 플러그인 상세에서 도구 27개와 승인 설정을 센다.
4. disconnected가 다음 질문의 도구 누락으로 이어지는지만 본다. 코드는 그때도 이 단계 범위 밖이다.

## API 기반 E2E (GUI 아님)

2026-11-09 21:11. LM Studio 창은 조작하지 않았다. `POST http://127.0.0.1:1234/v1/chat/completions`, 모델 `qwen3.5-9b`. 서버가 등록한 도구는 27개다. 모델에 넘긴 스키마는 읽기 9개다. 쓰기·Google 도구는 스키마에 넣지 않았고 호출하지 않았다. 모델이 고른 호출만 `server.py` MCP로 실행한 뒤, 세션 본문은 빼고 건수·역할 집계·문서 제목·발췌만 다시 넣었다. 질문 문장에는 도구 이름을 넣지 않았다.

이 절의 성공은 `API_E2E`다. 위의 GUI PASS 1건과 합치지 않는다.

| 항목 | 모델이 고른 도구 | 답 | 로그 | 판정 |
|---|---|---|---|---|
| 2026-11-08 수업 건수 | `get_sessions_by_date` `date=2026-11-08` 1회 | 8건 | `12:11:25Z` `result_count` 8 | API_E2E PASS |
| 11월 담당 강사·등록자·보조 강사 | `get_sessions_by_range` 11월 전체 2회 | 담당 지정 0, 미지정 205, 이름 있는 등록 205, 보조 강사 있는 수업 37, 서로 다른 보조 강사 14 | `12:11:27Z`, `12:11:29Z` 각 `result_count` 205 | API_E2E PARTIAL |
| 센터 수업 가이드라인 | `search_rag_knowledge` `수업 가이드라인` | 제목 `(25ver.)SPOKEDU 센터 수업 가이드라인` | `12:11:36Z` `result_count` 5 | API_E2E PARTIAL |
| 할 일·기억 | `list_tasks` 후 `list_memories` | 할 일 1건 `SPOKEDU 개인 AI 비서 기능 검증`. 기억 1건, 도구 문장과 같음 | `12:11:41Z` 두 줄, 각 `result_count` 1 | API_E2E PASS |
| 11월 현황과 가이드라인 | `summarize_sessions_by_month` 2026-11, 이어서 `search_rag_knowledge` | 총 205, opened 133, verified 48, finished 16, postponed 8. 가이드라인에서 안전 유의를 요약 | `12:11:45Z` 205, `12:11:46Z` 5 | API_E2E PARTIAL |

역할 집계는 도구가 돌려준 `sessions`의 `assignment_status`, `created_by_user`, `extra_teachers`만 세서 모델에 넘겼다. 모델은 그 숫자를 맞게 말했고, 등록자를 담당 강사로 올리지 않았다. 이어서 “구분 정보는 반환되지 않았다”고 해서 PARTIAL이다. `named_creator_count` 205는 수업 건수지 서로 다른 사람 수가 아닌데, 답은 “205명”이라고 했다. 같은 구간을 두 번 호출했다.

가이드라인 검색의 2위 제목이 센터 수업 가이드라인이고, 모델은 그 문서를 골랐다. 1위는 `팝스 수업 가이드라인`이다. 도구가 준 `file_id`는 답에 없다.

복합 답의 205와 상태 합은 도구 집계와 같다. 8+16+48+133=205. 안전 유의는 센터 가이드라인 발췌에 있다. “교구와 프로그램 계획서”는 같이 반환된 다른 문서 발췌 쪽에 가깝다.

상태 건수는 이전 감사의 7/17/39/142와 다르다. 이번 도구 응답이 현재 값이다. 모델이 이전 숫자를 만든 것은 아니다.

GUI로 남긴 UNVERIFIED(날짜, 역할, 가이드라인, 할 일·기억, 복합)는 실패로 바꾸지 않는다. 같은 업무의 API_E2E 판정만 위 표에 있다. 월간 GUI PASS 1건은 그대로다.
