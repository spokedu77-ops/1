# 02 — 상담 아키텍처 (실제 추적)

## 고객 진입

| 경로 | 구현 |
|------|------|
| `/contact` | `app/spokedu/contact/page.tsx` → `ContactFormShell` / `ContactForm` |
| `/private#apply` | private 랜딩 내 상담 폼 (별도 필드·동일 private API 계약) |
| `/education#contact` | education 페이지 앵커 + dispatch/기관 문의 CTA |
| `/spokedu-lab` | 구독·교육 문의 (`CurriculumInquiryForm` 등) → `/api/curriculum/leads` |

통합 Contact SSOT: `inquiry-submit.ts` → `toLegacyRequest()` → 기존 3 API.

## 5유형 → 3 API

| ID | 유형 | 클라이언트 type | API | DB |
|----|------|-----------------|-----|-----|
| C01 | 개인·소그룹 | `private` | `POST /api/private/leads` | `consultations` (`consult_type=tutoring`) |
| C02 | 기관 체육교육 | `dispatch` | `POST /api/dispatch/leads` | `consultations` + `dispatch_leads` |
| C03 | SPOMOVE | `spomove` → dispatch payload | `POST /api/dispatch/leads` | 동일 (`programs`에 SPOMOVE, `source=spokedu-contact-spomove`) |
| C04 | 구독시스템 | `curriculum` | `POST /api/curriculum/leads` | `consultations` (`lead_mode=master` 등) |
| C05 | 라이선스·협업 | `other` → curriculum | `POST /api/curriculum/leads` | `consultations` (`lead_mode=license`) |

Envelope·컬럼 파생: `app/lib/server/leadEnvelope.ts` → `createConsultLead()`.

## 운영자 조회

- UI: `/admin/consult` → `GET /api/admin/consult` ( `requireAdmin` )
- 상세: `GET /api/admin/consult/[id]`
- 기관 상세: `GET /api/admin/dispatch-leads?id=` (`source_lead_id` 연결)

## 알림

- **Private only:** Resend (`RESEND_API_KEY`, `PRIVATE_LEADS_NOTIFY_EMAIL`) — DB 저장 **후** 발송, 실패해도 저장 유지, `emailSent` 플래그
- Dispatch / Curriculum: 코드상 동일 Resend 경로 **없음** — CRM 목록이 운영 확인 경로

## 고객 결과 UX

- 성공(API `ok:true`): `CONTACT_SUCCESS_MESSAGE` — DB 저장 성공 응답 후에만
- 실패: `CONTACT_SUBMIT_FAILURE_MESSAGE` + 임시 초안(`inquiry-draft.ts` localStorage)
