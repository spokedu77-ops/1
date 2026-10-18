# 01 — PREFLIGHT

## 저장소

| 항목 | 값 |
|------|-----|
| root | `C:/Users/joker/Documents/GitHub/1` |
| remote | `https://github.com/spokedu77-ops/1.git` |
| branch | `spokedu-security-audit-20261018` |
| HEAD | `c1a7ec52691f0f710e51a15aeb359e8eb7b55e76` |
| `origin/main` | 동일 커밋 (`merge-base` = HEAD) |

## Git 보존

- **Commit / Push / Deploy:** 0건
- **checkout / merge / pull / reset / stash / clean:** 미실행
- B5 Hero·SPOMOVE 카탈로그·보안 감사 등 기존 미커밋 WIP: Phase 2-C는 아래 4파일(+ QA 스크립트·문서)만 수정

## Phase 2-C 코드 변경 (식별 가능)

- `app/spokedu/contact/inquiry-submit.ts` — 구독( master ) CTA `master_org_inquiry` 정합
- `app/spokedu/contact/inquiry-submit.test.ts`
- `app/spokedu/contact/contact-page-data.ts` — 실패 1차 문구 명세 정렬
- `app/api/curriculum/leads/route.ts` — 2분 창 curriculum 중복 제출 방지

## 환경

- `.env.local`: Supabase URL·Service Role 존재 (Production DB 아님 — 로컬/스테이징 Supabase로 E2E)
- Resend / `PRIVATE_LEADS_NOTIFY_EMAIL`: **미설정** (이메일 실발송 검증 없음)
