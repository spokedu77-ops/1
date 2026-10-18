# DEPLOYMENT APPROVAL CHECKLIST

사용자 Commit·Push·배포 **승인 전** 확인:

- [ ] E15 `run-contact-admin-qa.mjs` exit **0** (API+UI+상세+cleanup)
- [ ] `.env.local` / Vercel: `CONTACT_E2E_APPROVED_PROJECT_REF` **수동** 설정 (Production ref blocklist)
- [ ] Phase 2-C: `master_org_inquiry` 포함 contact diff만 main 반영
- [ ] Phase 2-B: catalog iframe 제거·자체 UI smoke PASS
- [ ] Phase 1-B5: hero smoke PASS
- [ ] 보안 migration **별도** runbook 실행·롤백 준비
- [ ] Production DB에 테스트 lead **0건**
- [ ] 비밀번호·Service Role이 ZIP/리포트에 **없음**

**현재 판정:** `RELEASE_CANDIDATE_BLOCKED` — E15 + `.env.local` E2E gate
