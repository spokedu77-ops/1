# ADMIN E15 — 최종

## 스크립트

`docs/operations/phase-2c-contact-e2e/closure/run-contact-admin-qa.mjs`

### 보완 내용 (이번 작업)

- DB 쓰기 전 `assertContactE2eDbSafety()` (승인 ref **독립 env** vs URL 파싱 비교, production blocklist)
- 합성 private lead seed → 로그인 → `/admin/consult`
- **E15 PASS 조건:** E14 401 + 로그인 후 login URL 아님 + **API 목록** + **UI 텍스트** + **상세 API** + cleanup `gone=true`
- 자격 없음: **outcome BLOCKED, exit 2** (성공으로 오인하지 않음)
- `finally` cleanup (로그인/중간 실패 포함)

## 실행 결과 (이번 세션)

| 항목 | 값 |
|------|-----|
| outcome | **BLOCKED** |
| E15 | **BLOCKED** |
| exitCode | **2** |
| blockedReason | `CONTACT_E2E_ADMIN_EMAIL` / `PASSWORD` 미설정 |

증거: `ADMIN_E15_EVIDENCE.json` (비밀번호·토큰 **미포함**)

## PASS로 올리는 방법

1. `.env.local`에 QA 관리자 + `CONTACT_E2E_*` (approved ref는 **직접 입력**)
2. `npm run build`
3. `node docs/operations/phase-2c-contact-e2e/closure/run-contact-admin-qa.mjs`
4. 기대: exit **0**, 캡처 `captures/admin-e15-inbox.png`

**우회·임시 권한 부여 없음.**
