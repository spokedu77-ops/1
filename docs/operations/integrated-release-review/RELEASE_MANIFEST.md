# RELEASE MANIFEST — 통합 릴리스 후보

**브랜치:** `spokedu-security-audit-20261018`  
**HEAD:** `ac12a6fc05b5493780b4d53ed5d12738f258875b`  
**origin/main:** `c1a7ec52691f0f710e51a15aeb359e8eb7b55e76` (브랜치는 main 대비 **앞섬** + 대량 WIP)

**Commit / Push / Deploy:** 이번 작업 **0건**

## 영역별 구분 (웹사이트 릴리스 후보 vs 보류)

### Phase 1-B5 — 홈 Hero·홈 CSS

| 유형 | 대표 경로 |
|------|-----------|
| 서비스 | `app/spokedu/components/home-web/home-hero.tsx`, `home-web.module.css`, `home-web-assets.ts` |
| QA/설계 | `docs/design/phase-1b4*`, `phase-1b5-final/` |

### Phase 2-B — SPOMOVE 자체 카탈로그

| 유형 | 대표 경로 |
|------|-----------|
| 서비스 | `app/spokedu/components/spomove-public-catalog.tsx`, `spomove-public-catalog-page.ts`, `programs/spomove/catalog/page.tsx`, `spomove-program-page.ts`, `spomove-catalog-tabs.tsx` |
| QA | `docs/operations/phase-2b-final/` |

### Phase 2-C — 상담 접수

| 유형 | 대표 경로 |
|------|-----------|
| 서비스 | `inquiry-submit.ts`, `contact-page-data.ts`, `curriculum/leads/route.ts` (dedupe), fault-injection tests |
| QA | `docs/operations/phase-2c-contact-e2e/`, `closure/` |

### 보안 감사 — **웹 릴리스 후보에서 분리 권장**

| 포함하지 않음 | 이유 |
|---------------|------|
| `supabase/migrations/202610181*.sql` | 미완료·별도 DB 배포 게이트 |
| `scripts/migrate-center-criminal-check-files.mjs` 등 | 운영 마이그레이션 |
| `app/admin/camera/*` 삭제 | 별도 제품 결정 |

| 동시 WIP (삭제 금지) | `app/admin/centers/*`, `criminalCheckFiles.ts`, `docs/SPOKEDU_SECURITY_AUDIT_20261018.md` |

## 신규 통합 QA 자산

- `docs/operations/phase-2c-contact-e2e/lib/contact-e2e-db-safety.mjs`
- `docs/operations/integrated-release-review/`

## Diff 패키지

- `manifest-diffs/phase-2c-admin-safety.diff` — admin QA + db safety lib + `.env.example`
- 기존: `phase-2c-closure-only.diff`, Phase 2-B/1B5 design diffs (별도 폴더)
