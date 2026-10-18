# 08 — 변경 범위 감사

## Phase 2-C 코드 diff

`phase-2c-only.diff` — 4 files:

1. `app/spokedu/contact/inquiry-submit.ts`
2. `app/spokedu/contact/inquiry-submit.test.ts`
3. `app/spokedu/contact/contact-page-data.ts`
4. `app/api/curriculum/leads/route.ts`

## QA·문서 (신규)

- `docs/operations/phase-2c-contact-e2e/*` (스크립트, JSON evidence, captures, md)

## 보존 확인

- B5 Hero, SPOMOVE 카탈로그, 보안 감사 WIP: **Phase 2-C diff에 미포함**
- Commit / Push / Production deploy: **0**
- Production DB 테스트 row: **cleanup 완료** (로컬 Supabase)

## 금지 작업

- 새 통합 API: **없음**
- CRM 신규 앱: **없음**
- DB 마이그레이션 임의 추가: **없음**
- Production 이메일 발송: **없음**
