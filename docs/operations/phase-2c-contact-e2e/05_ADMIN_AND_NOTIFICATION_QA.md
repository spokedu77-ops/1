# 05 — 운영자·알림 QA

## 운영자 조회

| ID | 검증 | 결과 |
|----|------|------|
| E14 | `GET /api/admin/consult` 무세션 | **PASS** (401) |
| E15 | 인증 후 `/admin/consult` UI | **PARTIAL** |

### E15 상세

- **완료:** Service Role로 `consultations` 최신 50건 조회 → E2E 생성 ID 3건 **inbox parity visible** (저장 직후 운영 DB에 존재).
- **미완:** QA 관리자 세션 env 없음 → Playwright `/admin/consult`는 **로그인/비인가 화면만** 캡처 (`admin-inquiry-synthetic.png`).  
  **명세상 E15 PASS 조건(인증 UI 목록) 미충족.**

### CRM 기능 (코드 기준)

- 목록: 유형 summary, `source_lead_id`, dispatch 상세 fetch
- `detail_failed`: `source_lead_id` 없음 UI 문구 (`ConsultDetailDialog`)

## 알림

| API | 메커니즘 | 테스트 |
|-----|----------|--------|
| private | Resend optional + webhook optional | `emailSent: false` (env 없음) — **NOT_CONFIGURED** |
| dispatch | 없음 | N/A |
| curriculum | 없음 | N/A |

**독립 판정:** DB 저장 PASS · 이메일 **NOT_VERIFIED** · CRM parity **PARTIAL**

운영 필수가 “이메일 즉시 알림”이면 Resend env + staging 수신처 설정 후 재검증 필요. 현재 체계는 **CRM 상시 확인** 가정.
