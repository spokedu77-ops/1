# Phase 2-B — CATALOG_SOURCE_VERIFICATION

## 원본 후보

| 항목 | 결과 |
|------|------|
| 로컬 `.env.local` 키 | `SPOMOVE_NOTION_CATALOG_URL` **설정됨** |
| 호스트 | `app.notion.com` |
| 경로 식별 | `/p/SPOMOVE-…` (공개 식별 정보만; **전체 URL 미기록**) |
| README 절차 | Notion **공유→게시**, «이 페이지 임베드하기» 주소 → Vercel env |

## HTTP 검증 (비로그인 fetch, URL 미노출)

| 검사 | 결과 |
|------|------|
| HTTP 상태 | **200** |
| 최종 호스트 | `app.notion.com` |
| SPOMOVE/프로그램 시그널 | HTML에 **존재** (`hasProgramSignals: true`) |
| `X-Frame-Options` | **`SAMEORIGIN`** (타 도메인 iframe 잠재 제한) |
| Notion 공식 임베드 호스트 | `app.notion.com` — embed-friendly 후보 |

## 적합성 체크리스트 (에이전트 판단)

| # | 질문 | 상태 |
|---|------|------|
| 1 | SPOMOVE 공식 마케팅 카탈로그인가? | **LIKELY** (경로·README·로컬 운영 관행) — **운영자 최종 확인 필요** |
| 2 | 프로그램 목록 존재? | **LIKELY** (HTML 시그널) — iframe 내부 **NOT_VERIFIED** |
| 3 | 최신 SSOT? | **NOT_VERIFIED** (Notion 편집 이력 미조회) |
| 4 | 테스트/임시 페이지? | **NOT_VERIFIED** |
| 5 | 비로그인 HTTP 접근? | **PASS** (200) |
| 6 | 내부·민감 자료? | **NOT_VERIFIED** (하위 페이지·게시 범위 **수동 확인 필요**) |
| 7 | 하위 페이지 공개 범위? | **NOT_VERIFIED** — Notion 게시 범위 변경 **승인 전 금지** |
| 8 | 외부 삽입 허용? | **PARTIAL** — 페이지는 열리나 **사이트 CSP가 Notion frame-src 미허용** |

## 임베드 URL 형식

- 로컬 값은 `app.notion.com/p/…` 형식.
- README는 **게시·임베드 공식 주소** 사용을 요구.
- **`notion.site` 게시 URL과 동일 여부는 NOT_VERIFIED** — 운영 등록 전 Notion UI에서 «Embed this page» 결과와 **대조 필수**.

## 금지 사항 준수

- 임의 URL 생성·추측 **없음**
- 로컬 값을 Production에 **복사·적용하지 않음**
- Notion 공개 범위 **변경하지 않음**

## 판정

**원본 후보는 식별됐으나, 사이트 내 iframe으로의 «실제 프로그램 표시»는 아직 검증되지 않음.**  
(별도: CSP — `ROOT_CAUSE_DECISION.md`)
