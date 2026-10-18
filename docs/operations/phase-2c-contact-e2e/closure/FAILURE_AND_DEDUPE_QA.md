# Failure & Dedupe QA

## E08 — FAULT_INJECTION_TEST

`createConsultLead` mock 실패 → private API **500**, `ok: false`  
고객: `inquiry-submit.test.ts` + Playwright mock failure UI (`contact-failure-retry.png`) — 접수 성공 문구 **없음**

## E09 — FAULT_INJECTION_TEST (E02와 분리)

dispatch detail insert mock 실패 → CRM id 유지, `detail_failed` — `route.fault-injection.test.ts`

## Curriculum dedupe (live DB)

| 시나리오 | ID | 결과 |
|----------|-----|------|
| 동일 payload 2회 | dedupe-curriculum-repeat | PASS |
| 동일 연락처·다른 purpose/partnership | dedupe-curriculum-different-purpose | PASS (별도 leadId) |
| 동일 purpose·다른 extra | dedupe-curriculum-different-content | PASS (별도 leadId) |

서버: `purpose`·`partnership_type` 마커를 dedupe 키에 포함 (`curriculum/leads/route.ts` closure 보완).

## Private dedupe

E11-private-dup PASS (2분 창).

## Network / timeout

고객 Playwright E12: mock 500 → 실패 문구 + 임시 보관 안내 PASS (DB 아님).
