# Phase 2-B — ROOT_CAUSE_DECISION

## 분류

| 코드 | 해당 | 확실성 |
|------|------|--------|
| **ENV_MISSING** (Production) | ✓ | **HIGH** (fallback UI + Phase 2-A) |
| **URL_INVALID** | ✗ | LOW |
| **EMBED_BLOCKED** (CSP) | ✓ | **HIGH** (콘솔 + 빈 iframe + `next.config.ts`) |
| **LOGIN_REQUIRED** | ? | LOW (HTTP 200, 새 창 OK) |
| **LOCAL_PASS** (콘텐츠) | ✗ | — |

## 통합 원인

1. **Production:** `SPOMOVE_NOTION_CATALOG_URL` **미설정**(추정) → `CatalogFallback`.
2. **Production + Local (prod build):** CSP `frame-src`에 **Notion 미포함** → env를 넣어도 iframe **빈 화면** 가능성 **HIGH**.

## 설정만으로 해결 가능한가?

| 시나리오 | 가능? |
|----------|--------|
| Prod fallback → iframe **태그** | **YES** (env만) |
| 고객에게 **프로그램 목록 표시** | **NO (현재 코드 기준)** — **CSP 수정( config ) 추가 필요** |

`SPOKEDU_PUBLIC_AUDIT.md` §11.1 **A안 + CSP Notion allow**와 **일치**.

## Notion `X-Frame-Options: SAMEORIGIN`

- 원격 응답 헤더 관찰.
- **새 창에서 보기**는 우회 가능 (journey **PASS**).
- iframe은 Notion 정책 + CSP **양쪽** 검토 필요; 게시용 **`notion.site` URL**이 iframe에 더 적합할 수 있음 — **NOT_VERIFIED**.

## 서비스 코드 변경

- Phase 2-B: **0건**
- 후속(승인 시): `next.config.ts` `frame-src`에 Notion 호스트 추가 (**config only**, 범위 최소)

## 최종 원인 코드 (이번 QA)

**`EMBED_QA_FAIL`** (로컬 prod 빌드 기준) + Production **`ENV_MISSING`** (간접).
