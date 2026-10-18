# Phase 2-B — LOCAL_EMBED_QA

**BUILD_ID:** `aIoHE-m720MQj-Ywu2D0m` · **PORT:** `3019` · **경로:** `/spomove/catalog`

## A. Config QA (로컬)

| 항목 | 결과 |
|------|------|
| `.env.local` 키 | **PASS** (존재) |
| `getCatalogUrl()` 분기 | iframe 경로 (fallback **아님**) |

## B. Content QA

| 뷰포트 | iframe | fallback | 프로그램 콘텐츠 | overflow |
|--------|--------|----------|-----------------|----------|
| 390×844 | ✓ (390×633) | ✗ | **FAIL** — 영역 **빈 화면** | PASS |
| 941×861 | ✓ | ✗ | **FAIL** (동일) | PASS |
| 1440×900 | ✓ | ✗ | **FAIL** (동일) | PASS |

### 콘솔 (390)

```
Framing 'https://app.notion.com/' violates the following Content Security Policy directive: "frame-src 'self' https://www.youtube.com ...
```

### HTTP CSP (페이지 응답)

`frame-src`에 **Notion 도메인 없음** (`next.config.ts` 전역 `/:path*` 헤더).

### 캡처

- `captures/catalog-local-390.png` — iframe **빈 영역**
- `captures/catalog-local-1440.png` — 동일
- `captures/catalog-local-content.png` — iframe crop **콘텐츠 없음**

**Content QA 종합:** **FAIL** (`EMBED_BLOCKED` / CSP)

> iframe 태그·src 존재만으로 PASS **하지 않음** (지시 §5).

## C. Customer Journey QA (로컬)

| 항목 | 결과 |
|------|------|
| «새 창에서 보기» | **PASS** (popup, Notion 호스트) |
| «기관 도입 문의» | **PASS** → `/education?program=spomove#contact` |
| SPOMOVE 소개 버튼 | UI 존재 (스크린샷) |

**새 창** 경로는 동작; **페이지 내 임베드**는 현재 빌드에서 고객 콘텐츠 **미표시**.

## 타임라인

- iframe DOM: 로드 후 **~8s** 대기 — fallback으로 **전환되지 않음**
- 콘텐츠: **10s 후에도** iframe 내부 프로그램 목록 **식별 불가**

## 증거 파일

`LOCAL_EMBED_EVIDENCE.json`
