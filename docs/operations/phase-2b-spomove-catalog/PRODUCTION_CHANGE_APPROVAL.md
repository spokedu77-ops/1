# Phase 2-B — PRODUCTION_CHANGE_APPROVAL

**상태:** 사용자 승인 **대기** — 아래 **실행하지 않음**

---

## 변경 대상

| 항목 | 값 |
|------|-----|
| Vercel 프로젝트 | `spokedu` |
| 환경 | **Production** |
| 도메인 | `spokedu.kr` |
| 변수명 | `SPOMOVE_NOTION_CATALOG_URL` |

## 승인 시 등록할 값 (민감 정보)

- Notion **공식 게시·임베드 URL** (운영자가 Notion UI «Embed this page»와 대조)
- 로컬 `.env.local` 후보: 호스트 `app.notion.com`, 경로 `/p/SPOMOVE-…`
- **보고서·ZIP에 전체 URL 기재하지 않음**

## Config QA (현재)

- Production: 키 **없음(추정)** → fallback
- Local: 키 **있음** → iframe 분기

## Content QA (현재)

- Local prod build: iframe **있으나 CSP로 콘텐츠 빈 화면** → **FAIL**

## 승인 패키지 (권장 순서)

### A. 운영 env (ops)

1. Vercel → `spokedu` → Production → `SPOMOVE_NOTION_CATALOG_URL` **생성**
2. 값 = 승인된 Notion 게시 URL
3. 저장 후 **변수 존재 재확인**

### B. CSP (별도 승인 — config)

| 파일 | 변경 |
|------|------|
| `next.config.ts` | `Content-Security-Policy` `frame-src`에 Notion 호스트 추가 (예: `https://app.notion.com`, `https://www.notion.so`, `https://notion.site` — **Notion 문서·실측 URL에 맞게 최소화**) |

**env만 승인하고 B 미적용 시** iframe 빈 화면 **재발 가능**.

### C. 배포

- env 변경만: Vercel **재배포 필요 여부** 확인 (Next.js runtime env)
- CSP 변경: **커밋·배포** 필요 — **Commit/Push는 사용자 별도 승인**
- **「설정만 승인」 시 배포 임의 실행 금지**

## 예상 고객 영향

- 성공: `/spomove/catalog`에서 프로그램 목록 열람 + 기존 CTA 유지
- 실패: fallback 유지 또는 빈 iframe

## 롤백

1. Production env 변수 **삭제 또는 이전 값**
2. CSP 변경 배포 시 **revert + redeploy**
3. 확인: fallback UI 복귀 = 안전 degraded state

## Production QA (사후)

승인·반영 **후에만** `PRODUCTION_QA.md` 작성.
