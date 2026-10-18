# Phase 2-A — NEXT_IMPLEMENTATION_BRIEF

**전제:** Phase 2-A는 **구현하지 않음**. 아래는 후속 페이즈 초안.

---

## Track A — P0 Ops (권장 선행)

| 항목 | 내용 |
|------|------|
| **목적** | Production 카탈로그 iframe 복구 |
| **파일** | 없음 (Vercel/호스트 env) |
| **설정** | `SPOMOVE_NOTION_CATALOG_URL` — **값은 팀 시크릿**; 존재 여부만 문서화 |
| **금지** | Local `.env` 값을 로그·ZIP에 포함 |
| **성공 조건** | `https://spokedu.kr/spomove/catalog` iframe + J05 PASS |
| **순서** | 1) 스테이징 URL 검증 2) Prod env 3) 재배포 4) Playwright 재실사 |

---

## Track B — P1 Private perceived load (코드)

| 항목 | 내용 |
|------|------|
| **목적** | 0s 시점 핵심 copy·구조 노출 |
| **후보 파일** | `app/spokedu/private/page.tsx`, `components/private-landing.tsx`, `data/private-page.ts` |
| **유지** | `#apply` 상담 semantics, tracking, private lead API 계약 |
| **회귀** | framer-motion 섹션, anchor nav, 이미지 lazy |
| **성공 조건** | Prod 0s `bodyLen`/마커 또는 스켈레ton with H1 |
| **순서** | 1) RSC/static hero spike 2) 390 캡처 3) B5 Hero와 무관 diff 분리 |

---

## Track C — Contact E2E (승인 필요)

| 항목 | 내용 |
|------|------|
| **목적** | 제출→API→저장 검증 |
| **후보** | `inquiry-submit.ts`, `/api/consult` (trace), `contact-form.tsx` |
| **금지** | Production 실데이터 제출 without approval |
| **성공 조건** | 스테이징 POST 200 + audit log |

---

## QA 스크립트 (Phase 2-A 산출)

- `docs/design/phase-2a/run-phase2a-audit.mjs` — 페이지 캡처·타임라인
- `contact-interaction-check.mjs`, `journey-matrix-check.mjs` — J08/J09 보완

**재실행:** `npm run build` → `PORT=3018 npm run start` → `node docs/design/phase-2a/run-phase2a-audit.mjs`
