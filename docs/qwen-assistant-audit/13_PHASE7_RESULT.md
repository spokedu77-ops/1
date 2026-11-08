# 13. Phase 7 결과

2026-11-09. 운영 DB, 색인 파일, 모델, n8n, 관리자 화면, MCP 도구 이름, OAuth 토큰은 바꾸지 않았다. 브라우저 로그인은 하지 않았다.

## 1. LM Studio 채팅 MCP

상태: **미검증**. 성공으로 처리하지 않는다.

이번 환경에서는 LM Studio 채팅창에 다섯 질문을 넣고 도구 호출 표시를 확인하지 못했다. HTTP `POST /v1/chat/completions`는 Phase 5에서 `mcp.json`의 서버를 자동으로 붙이지 않았다. 그 API 호출을 채팅 MCP 성공으로 쓰지 않는다.

수동 확인 절차:

1. LM Studio에서 로드된 모델이 `qwen3.5-9b`인지 본다. 임베딩 `text-embedding-qwen3-embedding-0.6b`도 로드한다.
2. 설정 MCP에서 `spokedu-assistant`가 `C:\Users\joker\SPOKEDU-Assistant\server.py`로 켜져 있는지 본다. 새 서버는 만들지 않는다.
3. 새 채팅을 연다. 시스템 지침은 `LM_STUDIO_ASSISTANT_INSTRUCTIONS.md`를 붙인다.
4. 아래 다섯 질문을 한 번에 하나씩 보낸다.
5. 각 답 앞에 도구 호출이 보여야 한다. 호출이 없으면 그 질문은 실패다.
6. `C:\Users\joker\SPOKEDU-Assistant\logs\tool_runs.jsonl` 마지막 줄의 `tool`과 `result_count`가 답의 숫자와 같은지 본다.

기대 도구와 직접 조회로 확인한 숫자:

| 질문 | 기대 도구 | 직접 조회 값 | 채팅 검증 |
|---|---|---|---|
| 2026년 11월 수업은 총 몇 건이야? | `summarize_sessions_by_month` | 205, truncated false | 미실행 |
| 2026년 11월 8일 수업이 몇 건이야? | `get_sessions_by_date` | 8 | 미실행 |
| SPOKEDU 센터 수업 가이드라인을 찾아줘. | `search_rag_knowledge` | 제목에 가이드라인이 있는 문서 | 미실행 |
| 현재 등록된 할 일을 알려줘. | `list_tasks` | 1건 | 미실행 |
| 2026년 11월 수업의 강사 배정 현황을 알려줘. | `get_sessions_by_range` | 담당 강사 0, 미지정 205, 등록자 이름 205, 보조 강사 42 | 미실행 |

강사 질문에서 등록자를 담당 강사라고 말하면 실패다. `assigned_teacher`는 비어 있고 `assignment_status`는 `unassigned`다. RAG 답은 도구가 준 제목과 `file_id`만 말해야 한다.

## 2. 모델 답변과 데이터

채팅 답변은 없으므로 일치 여부를 판정하지 않는다. 위 표의 숫자는 MCP 함수를 직접 호출한 값이다.

## 3. RAG 시간

인벤토리 전체 재분류 `load_blocked_rag_base_ids`는 3474ms였다. 같은 347개 문서에 대해 검색용 일괄 판정은 104ms였고, 차단 여부가 **347건 모두 같았다**. 불일치 0이었다.

그래서 검색 경로에서 전체 재분류 호출만 뺐다. 일괄 판정은 그대로 매 검색마다 DB를 읽는다. 전역 캐시는 없다.

| | Phase 6 | 이번 |
|---|---|---|
| 15문항 평균 | 3938ms | 244ms |
| 중앙값 | 3932ms | 235ms |
| 최악 | 4126ms | 400ms |
| Top-1 | 14/15 | 14/15 |

## 4. 수정 파일

`C:\Users\joker\SPOKEDU-Assistant\rag_index.py`의 `search_index`만 수정했다. 색인 DB는 쓰지 않았다.

롤백: `load_blocked_rag_base_ids()` 호출과 `base in blocked_bases` 조건을 되돌린다. 권한 함수는 지우지 않았다.

## 5. 남은 제약

1. LM Studio 채팅에서 도구가 실제로 호출되는지는 위 절차로 사람이 확인해야 한다.
2. OAuth 재발급은 여전히 별도 승인이다. 스크립트는 그대로 두었고 실행하지 않았다.
3. `teacher_id`가 비어 있는 205건은 담당 강사 미지정이다. 등록자 205명과 보조 강사 42명은 다른 필드다.
