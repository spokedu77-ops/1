# Phase 2-B — CHANGE_SCOPE_AUDIT

| 영역 | 변경 |
|------|------|
| 서비스 코드 (`app/`) | **0** |
| `next.config.ts` | **0** (CSP 수정은 **승인 대기**, 미적용) |
| Git commit/push | **0** |
| Vercel Production env | **0** |
| Notion 공개 설정 | **0** |
| Production 배포 | **0** |
| `.env.local` | **0** (덮어쓰기 없음) |
| QA/문서 | `docs/operations/phase-2b-spomove-catalog/**` 추가 |

## 임시 QA

- `PORT=3019` prod server — **추가** (기존 포트 유지)
- Playwright chromium install (로컬 캐시) — QA 인프라만
