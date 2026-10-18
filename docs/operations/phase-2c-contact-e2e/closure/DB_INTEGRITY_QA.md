# DB Integrity QA

**Run:** `PHASE2C-MVDD2F18` · overall **PASS** · BUILD_ID `q-moABFfGzj-BJfqFaKsY`

## E02 (happy path only)

| # | 검증 | 결과 |
|---|------|------|
| 1 | consultations 생성 | PASS |
| 2 | dispatch_leads 생성 | PASS |
| 3 | detail 재조회 | PASS |
| 4 | source_lead_id = detailId | PASS |
| 5 | mirror_consult_id = consultId | PASS |

`detailStatus: synced` — **E09 부분 실패 경로와 합산하지 않음**.

## E09 (FAULT_INJECTION_TEST)

Vitest mock — dispatch_leads insert 실패 시:

- HTTP 200, `ok: true`, `consultId` 유지
- `detailId: null`, `detailStatus: detail_failed`

→ `FAULT_INJECTION_EVIDENCE.json`

## 5유형

C01–C05 모두 dbVerified PASS (마커 `[PHASE2C-MVDD2F18]`).
