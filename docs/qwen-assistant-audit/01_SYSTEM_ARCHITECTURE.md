# 01. 현재 구조

두 계통이 한 대의 LM Studio를 공유한다. 통합 비서 프로세스는 없다.

```text
LM Studio  127.0.0.1:1234
  로드: qwen3.5-9b
  미로드: text-embedding-qwen3-embedding-0.6b 외 3개
        │
        ├─ stdio MCP  C:\Users\joker\SPOKEDU-Assistant\server.py
        │     SQLite  data\spokedu_assistant.db
        │     RAG     %LOCALAPPDATA%\SPOKEDU-Assistant\data\rag_index.db
        │     인벤토리 workspace_inventory.db (21,683건, 별도)
        │     외부 읽기: Supabase 세션, Google Calendar/Gmail/Drive/Sheets
        │
        └─ 제품 앱 (이 Git 저장소)
              교사 수업 화면 → enqueue 피드백 교정 잡
              n8n 워크플로 JSON (active: false)
              claim → LM Studio chat → complete/fail
              지금 Docker n8n 5678 / 브리지 5681 리슨 없음
```

## 확인한 경로

| 항목 | 현재 값 |
|---|---|
| 비서 루트 | `C:\Users\joker\SPOKEDU-Assistant` |
| MCP 예시 | `lm-studio-mcp.json.example` 명령: Python 3.12 + `server.py` |
| 시스템 지침 | `LM_STUDIO_ASSISTANT_INSTRUCTIONS.md` (LM Studio에 붙여 넣는 문서. 프로세스에 자동 주입되는지는 미확인) |
| 제품 워크플로 | `ops/local-automation/workflows/spokedu-feedback-correction.json` |
| 과거 워크플로 ID `dmKZDzet61qQv4XW` | 이 저장소에서 미발견 |
| 포트 5681 | 리슨 없음 |
| 포트 5678 | 리슨 없음 |
| 포트 1234 | 리슨, PID 9532 |

## 데이터 경계

- 비서 SQLite: `memories` 1, `tasks` 1, `gmail_send_approvals` 0, `gmail_human_approvals` 1.
- RAG는 Drive에서 읽어 로컬에만 임베딩한다 (`rag_index.py`, 임베딩 URL 기본 `127.0.0.1:1234/v1/embeddings`, 모델 `text-embedding-qwen3-embedding-0.6b`, 차원 1024).
- 제품 피드백 잡은 Supabase `admin_feedback_correction_jobs`를 앱 API가 다룬다. n8n은 서비스 롤 키를 갖지 않고 워커 시크릿으로 앱 API만 호출하도록 문서화돼 있다.
- 모델 가중치를 바꾸는 학습 파이프라인은 비서 폴더에 없다.

## 문서와 코드의 불일치

- `README.md`는 도구 6개(기억·할 일)만 설명한다.
- `server.py`와 시스템 지침은 25개다. Calendar 쓰기, Gmail 초안·발송, Supabase 세션 조회, Drive·Sheets, RAG가 추가된 상태다.
- 운영 보고서의 로컬 E2E 모델은 `gemma-4-26b-a4b-it-qat`다. 워크플로 폴백 모델 문자열은 `qwen3.5-9b`다. 오늘 로드된 모델은 Qwen이다. Gemma는 설치만 되어 있다.
