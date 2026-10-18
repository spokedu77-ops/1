# 03 — 결함·원인·수정

## RC-1 — 구독시스템(C04) Contact 제출 400 (치명)

**증상:** `/contact` 구독 문의 → `/api/curriculum/leads` 400  
`허용되지 않은 route·선택·CTA 조합입니다.`

**원인:** `inquiry-submit.ts`가 `lead_mode=master`일 때 `cta_intent_id: master_handoff` 전송.  
`lead-envelope.ts`는 master에 `master_org_inquiry` | `master_view`만 허용.

**수정:** `master_org_inquiry` 사용 (`inquiry-submit.ts`, `inquiry-submit.test.ts`).

**영향:** 고객 `/contact` 구독시스템 유형 — **저장 불가 상태 해소** (DB E2E C04 PASS).

---

## RC-2 — Curriculum 중복 제출 (E11 gap)

**증상:** private/dispatch는 2분 dedupe 있으나 curriculum API에는 없음.

**수정:** `app/api/curriculum/leads/route.ts` — phone·parent_name·lead_mode·content_type·extra 스니펫 기준 2분 dedupe (private/dispatch와 동일 철학).

---

## RC-3 — 고객 실패 문구 명세 정렬

**수정:** `contact-page-data.ts` — 1차 문구 `문의가 접수되지 않았습니다…` + 기존 임시 보관·대체 연락 안내 유지.

---

## 미수정 (범위 외·별도 Product Decision)

- `master_handoff`는 구독 랜딩 **트래킹용** CTA로 다수 컴포넌트에 잔존 (API envelope와 무관한 링크 이벤트). Contact API 경로만 수정.
- Dispatch/Curriculum Resend 알림 미구현 — CRM 운영 전제 유지.
