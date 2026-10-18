# OPEN RISKS

1. **E15 BLOCKED** — QA 관리자 env 미설정 → `RELEASE_CANDIDATE_READY` 불가
2. **CONTACT_E2E_* 미설정 in .env.local** — DB E2E/Admin seed 재검증 시 gate 필요
3. **브랜치 WIP 혼재** — B5·2B·2C·보안 감사·camera 삭제가 한 트리에 공존 → 분리 PR 권장
4. **Supabase migrations (202610181*)** — 웹 릴리스 후보 **제외**; 별도 DB 운영 승인
5. **Resend (E10)** — 미설정; CRM 운영 가정 유지
6. **다중 `npm start` QA** — 포트 3036–3039; 로컬 좀비 프로세스 가능(수동 정리)
