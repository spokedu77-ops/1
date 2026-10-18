# Admin Inbox QA (E15)

## E14 — 비관리자

`GET /api/admin/consult` → **401 PASS**

## E15 — 인증 UI

| 항목 | 결과 |
|------|------|
| QA 관리자 자격 | **미설정** (`CONTACT_E2E_ADMIN_EMAIL` / `PASSWORD`) |
| 판정 | **BLOCKED** |
| 우회 로그인·Production 코드 | **없음** |

`ADMIN_QA_EVIDENCE.json`: exit 0, `E15: BLOCKED`.

### 재검증 방법 (로컬)

1. `.env.local`에 QA 전용 관리자 이메일·비밀번호 설정 (Production 계정 금지)
2. `CONTACT_E2E_ALLOW_DB_WRITES=1` + approved ref 유지
3. `node docs/operations/phase-2c-contact-e2e/closure/run-contact-admin-qa.mjs`

기대: seed private lead → 로그인 → `/api/admin/consult` 200 + seed id in list → UI 캡처 `admin-inbox-authenticated.png`

## detail_failed (코드)

`ConsultDetailDialog`: `source_lead_id` 없을 때 운영 문구 표시 — E09 mock으로 API 계약 확인, UI는 E15 PASS 시 상세 클릭으로 추가 확인 가능.
