# GIT 통합 계획 (자동 실행 없음)

## 현재 관계

- **브랜치:** `spokedu-security-audit-20261018`
- **HEAD ≠ origin/main** — 브랜치에 커밋 + 추가 미커밋 WIP
- **금지:** checkout / merge / pull / reset / stash / clean (본 지시서)

## 권장 통합 순서 (사용자 승인 후)

1. **스냅샷** — 현재 트리 백업(브랜치 그대로 push 또는 patch archive)
2. **PR 분리 (권장)**  
   - PR-A: Phase 1-B5 + 홈 CSS (`home-hero`, `home-web.module.css`, …)  
   - PR-B: Phase 2-B SPOMOVE 카탈로그  
   - PR-C: Phase 2-C 상담 (`inquiry-submit`, curriculum dedupe, tests)  
   - PR-D: 보안 감사 (centers, migrations) — **웹 배포와 DB 마이그레이션 분리**
3. **main 머지** — E15 PASS 및 `CONTACT_E2E_*`·`.env.local` 운영 설정 확인 후 Phase 2-C 포함
4. **Production** — Supabase migration은 `202610181*.sql` 별도 runbook·승인

## E15 블로커

`.env.local`에 다음 **수동** 설정 전에는 상담 릴리스 후보 승인 보류:

- `CONTACT_E2E_APPROVED_PROJECT_REF` (URL에서 자동 복사 금지)
- `CONTACT_E2E_ALLOW_DB_WRITES=1` (로컬/스테이징 QA만)
- `CONTACT_E2E_ADMIN_EMAIL` / `CONTACT_E2E_ADMIN_PASSWORD` (QA 전용)

## 충돌 예상

`main`과 diverged — centers/camera/docs 대량 변경. 영역별 PR로 충돌 범위 축소.
