# 14. Phase 8 — LM Studio 채팅 검증

2026-11-09 02:16 전후. 코드, DB, 색인, 모델, 토큰, n8n은 바꾸지 않았다. HTTP 채팅 API로 질문을 보내지 않았다.

## 환경

| 항목 | 확인 |
|---|---|
| LM Studio 창 | 제목 `LM Studio - 0.4.25`. 작업 표시줄의 보라색 아이콘으로 앞으로 가져왔다. |
| `qwen3.5-9b` | 창 상단 모델 표시가 `qwen3.5-9b`였다. |
| 임베딩 모델 | 이번 화면에서는 로드 목록을 열지 않았다. 이전 API 확인을 채팅 성공으로 쓰지 않는다. |
| `spokedu-assistant` | Integrations에서 `mcp/spokedu-assistant` 스위치가 켜져 있었다. `rag-v1`도 켜져 있고 `mcp/photocraft`, `js-code-sandbox`는 꺼져 있었다. 입력창에 `spokedu-assistant` 칩이 보였다. |
| 서버 | 설정은 기존 `server.py`. 이번 채팅이 그 프로세스를 불렀는지는 로그로 확인하지 못했다. |
| 도구 27개 | `server.py`의 `@mcp.tool`은 27개다. 채팅 화면에서 도구 목록을 펼쳐 27개를 세지는 못했다. |

## 채팅 다섯 질문

열려 있던 대화는 `AI Capabilities Overview`였다. 새 채팅 버튼을 누르려다 좌표가 Cursor 창에 들어가 채팅이 바뀌지 않았고, 그 뒤 Cursor가 LM Studio를 다시 가렸다. 다섯 질문 중 어느 것도 입력하지 않았다.

| 질문 | 도구 선택 | MCP 호출 | 결과 전달 | 최종 답 | 로그 | 판정 |
|---|---|---|---|---|---|---|
| 2026년 11월 수업은 총 몇 건이야? | 미확인 | 없음 | 없음 | 없음 | 없음 | UNVERIFIED |
| 2026년 11월 8일 수업이 몇 건이야? | 미확인 | 없음 | 없음 | 없음 | 없음 | UNVERIFIED |
| SPOKEDU 센터 수업 가이드라인을 찾아줘. | 미확인 | 없음 | 없음 | 없음 | 없음 | UNVERIFIED |
| 현재 등록된 할 일을 알려줘. | 미확인 | 없음 | 없음 | 없음 | 없음 | UNVERIFIED |
| 2026년 11월 수업에서 담당 강사와 등록자를 구분해서 알려줘. | 미확인 | 없음 | 없음 | 없음 | 없음 | UNVERIFIED |

PASS, PARTIAL, FAIL은 없다. 도구 없이 만든 문장은 성공으로 세지 않았고, 이번 시도에는 문장도 없다.

`C:\Users\joker\SPOKEDU-Assistant\logs\tool_runs.jsonl` 마지막 줄은 `2026-11-08T15:32:24+00:00`의 `list_tasks`다. 02:16 이후에 늘어난 줄은 없다. 그 앞의 `summarize_sessions_by_month` 205, `get_sessions_by_date` 8, `search_rag_knowledge`는 이번 채팅이 아니다.

## 수동 절차

1. LM Studio를 화면 맨 앞으로 두고 새 채팅을 만든다. 기존 `AI Capabilities Overview`에 이어 쓰지 않는다.
2. 상단 모델이 `qwen3.5-9b`인지, Integrations의 `mcp/spokedu-assistant`만 채팅에 붙었는지 확인한다. 플러그인 상세에서 도구가 27개인지 센다.
3. 질문을 하나씩 보낸다. 답 앞에 도구 이름이 보여야 한다.
4. 기대 도구는 `summarize_sessions_by_month`, `get_sessions_by_date`, `search_rag_knowledge`, `list_tasks`, `get_sessions_by_range`다.
5. 이전에 직접 조회로 본 값은 11월 205건, 11월 8일 8건, 할 일 1건, 담당 강사 지정 0건, 미지정 205건, 등록자 이름이 있는 수업 205건, 보조 강사 42건이다. 이 숫자는 채팅 답을 재는 기준이다. 이번 채팅이 그 답을 했다는 뜻이 아니다.
6. 강사 질문에서 등록자를 담당 강사라고 말하면 실패다.
7. 가이드라인 답은 도구가 돌려준 제목과 출처만 있어야 한다.
8. `tool_runs.jsonl`에서 그 질문 시각의 `tool`과 `result_count`를 찾는다. 11월 8일 15:32 UTC 줄은 이번 테스트가 아니다.

도구 이름이 화면에 없으면 그 질문은 FAIL이다.
