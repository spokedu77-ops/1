# 04 — Real DB E2E

**증거:** `DB_E2E_EVIDENCE.json`  
**Run:** `PHASE2C-MVDADRQ7` · BUILD_ID `G4z318r0n1BxAVZ8LAwPz` · port `3022`  
**판정:** `PASS_WITH_GAPS` (핵심 C01–C05·E06·E11 DB 검증 PASS)

## 스키마

| 대상 | 결과 |
|------|------|
| `consultations` | reachable, structured columns OK |
| `dispatch_leads` | reachable, `mirror_*` columns OK |

(초기 프로브 오류: `mirror_consult_id`를 consultations에 조회 — **스크립트 수정함**, dispatch_leads 기준 재검증 PASS)

## C01–C05 (실 DB insert + re-select + cleanup)

| Case | status | dbVerified |
|------|--------|------------|
| C01/E01 private | PASS | true |
| C02/E02 dispatch + detail | PASS | true, detail synced |
| C03/E03 SPOMOVE | PASS | true |
| C04/E04 curriculum master | PASS | true |
| C05/E05 license | PASS | true |

합성 마커: `[PHASE2C-MVDADRQ7]` — 테스트 후 **delete** (cleanup 로그에 error null).

## 중복 (E11)

- private 동일 payload 2회 → `duplicate: true`, 동일 `leadId` PASS
- curriculum 동일 payload 2회 → PASS

## Mock 아님

HTTP → Next production server → Service Role Supabase. **Mock DB PASS 아님.**

## Gaps

- E08 DB outage 시뮬: NOT_VERIFIED
- E09 detail_failed 강제: NOT_VERIFIED (코드 경로는 dispatch route에 존재)
- E10 email: Resend 미설정, `emailSent: false` 관측
