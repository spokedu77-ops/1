# Phase 2-B — VERCEL_ENV_AUDIT

## Config QA (Production)

| 항목 | 상태 |
|------|------|
| 프로젝트 (지시) | `spokedu` |
| 도메인 | `spokedu.kr` |
| 변수명 | `SPOMOVE_NOTION_CATALOG_URL` |
| Vercel CLI/API 재조회 | **BLOCKED** (로컬 `vercel` CLI 없음) |

## 간접 증거 (Production 동작)

| 출처 | 관찰 |
|------|------|
| Phase 2-A Playwright | `https://spokedu.kr/spomove/catalog` → **fallback H1**, iframe **없음** |
| `SPOKEDU_PUBLIC_AUDIT.md` §11.1 | SSR `getCatalogUrl()` → **null** 수준 증상 (키 미설정·빈값·parse 실패와 동일) |
| Phase 2-A | Local `.env.local` 있을 때 iframe **태그**는 생성 |

## 결론 (Config QA)

| 판정 | 내용 |
|------|------|
| Production 키 존재 | **FAIL / NOT_VERIFIED** — CLI 미조회; **동작상 «미설정»과 일치** |
| 설정 필요 | **YES** — 승인된 Notion 게시 URL을 Production에 등록 |
| 민감값 기록 | **없음** |

## 재조회 방법 (운영자)

Vercel Dashboard → Project `spokedu` → Settings → Environment Variables → Production에 `SPOMOVE_NOTION_CATALOG_URL` 존재 여부 확인.
