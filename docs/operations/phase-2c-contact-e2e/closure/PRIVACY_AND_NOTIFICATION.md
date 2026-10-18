# Privacy & Notification (E10 / E20)

## E10 — 알림

| 경로 | 메커니즘 | Closure |
|------|----------|---------|
| private | Resend optional | env **미설정** → `emailSent: false` 관측 |
| dispatch / curriculum | CRM only | 신규 알림 **미구현** (의도) |

**운영 가정:** 신규 문의는 `/admin/consult` CRM 확인.  
`1~2영업일` 연락 문구 — 실제 SLA는 **운영팀 확정** (법무·기간 임의 작성 없음).

이메일이 접수 **필수** 알림이면: staging Resend + 수신처 승인 후 E10 재실행.

## E20 — 개인정보·보안

| 항목 | 결과 |
|------|------|
| E14 비관리자 API | PASS |
| E06/E07 입력 검증 | PASS |
| Contact UI 개인정보/처리방침 힌트 | Playwright PASS |
| localStorage draft | 실패 시 저장; 성공 시 삭제 (unit + UI mock) |
| draft 만료 TTL | **미구현** — 배포 전 Product Decision |
| QA JSON/ZIP | project ref·service key **미포함**; DB evidence redacted |
| 터미널 PII 덤프 감사 | **NOT_VERIFIED** (수동 log review) |

합성 데이터만 사용 (`@spokedu.test`, `0109999xxxx`).
