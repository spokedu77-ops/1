# 09 — Release Handoff

## 최종 판정: `CONTACT_E2E_PARTIAL`

### 충족

- 5유형 · 3 API · **실 DB** 저장·재조회·정리 (C01–C05)
- RC-1 구독 Contact **저장 불가** 수정
- Curriculum dedupe
- 고객 성공/실패 문구·draft (mock UI + unit)
- E14 권한, E16 진입, E17–19 responsive
- Build / TS / ESLint / catalog smoke 회귀

### 미충족 (LOCAL_CONTACT_E2E_READY blocker)

1. **E15** — 인증된 `/admin/consult` UI에서 신규 문의 확인 (QA admin 세션 필요)
2. **E10** — Resend 미설정; private 외 API 알림 없음 → 운영 알림 정책 확정·staging 수신 테스트
3. **E08/E09/E20** — 장애 시뮬·로그 PII 감사 미실행

## 배포 전 체크리스트

1. `main` 통합 PR (별도 사용자 승인)
2. Supabase: consultations / dispatch_leads structured columns 프로덕션 적용 여부 확인
3. (선택) `RESEND_API_KEY`, `PRIVATE_LEADS_NOTIFY_EMAIL` staging 검증
4. 운영자 QA 계정으로 E15 UI 재실행
5. `1~2영업일` 연락 SLA — 운영팀 확인 (문구 유지)

## 롤백

- Phase 2-C diff 4파일 revert → Contact 구독 CTA 버그 재발 (배포 비권장)
- API/DB: insert-only lead — rollback은 코드 revert + 필요 시 테스트 row 수동 삭제

## ZIP

`docs/operations/phase-2c-contact-e2e/SPOKEDU_Phase2C_CONTACT_E2E_FINAL.zip`  
(요청 경로 Downloads는 샌드박스 제한으로 동일 아카이브를 repo 내에 생성함 — 필요 시 수동 복사)

## 재실행

```powershell
npm run build
node docs/operations/phase-2c-contact-e2e/run-contact-db-e2e.mjs
node docs/operations/phase-2c-contact-e2e/run-contact-customer-qa.mjs
$env:CATALOG_QA_NO_ENV='1'; $env:CATALOG_QA_PORT='3024'; node docs/operations/phase-2b-final/run-catalog-qa.mjs
```
