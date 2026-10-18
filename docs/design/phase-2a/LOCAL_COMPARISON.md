# Phase 2-A — LOCAL_COMPARISON

**Local:** `http://127.0.0.1:3018` · BUILD `GWjWk5d5r6_P0zCpKWV_-` · **미커밋 B5 Hero 포함** 빌드  
**Production:** `https://spokedu.kr` · **origin/main 동일 SHA** (`c1a7ec52…`) 기준 배포로 가정 (Hero B5는 **미배포** 가능)

## 환경 매트릭스 요약

| 영역 | 분류 | 설명 |
|------|------|------|
| `/private` 본문 (≥3s) | **BOTH_PASS** | Prod·Local 동일 마커·콘텐츠 |
| `/private` 초기 0s | **동일 현상** | Client hydration 전 얇은 shell (~377자) |
| 카탈로그 **목록** | **PRODUCTION_FAIL_LOCAL_PASS** | Prod fallback / Local iframe |
| 카탈로그 fallback CTA | **BOTH_PASS** | Prod·Local 동일 카피·링크 |
| `/contact` 폼 (유형 선택 후) | **BOTH_PASS** | Prod·Local form·validation |
| 문의 API end-to-end | **NOT_VERIFIED** | 양쪽 모두 실제 POST 미검증 |

## 빌드·설정 차이

| 요인 | Production | Local |
|------|------------|-------|
| `SPOMOVE_NOTION_CATALOG_URL` | **미설정으로 추정** (fallback만) | `.env.local` 등으로 **설정됨** → iframe |
| B5 Hero | 배포 여부 **미확인** (감사 범위 외) | 워킹 트리 반영 빌드 |
| Node/Playwright | 동일 Chromium 자동화 | 동일 |

## 코드만으로 해결 vs 운영 설정

| 문제 | 코드 변경 필요? | 비고 |
|------|-----------------|------|
| Prod 카탈로그 iframe 없음 | **아니오 (우선)** | 런타임 env 설정 (`catalog/page.tsx`는 URL 있으면 iframe) |
| Private 초기 빈 shell | **예 (선택 P1)** | SSR/스트리밍·번들 최적화 — 원인 추가 조사 |
| Contact 유형 후 폼 | **아니오** | 정상; UX는 스크롤·발견성 |

## 동일 재현

- Private 0s thin shell: **Prod = Local**
- Catalog fallback: **Prod only** (Local은 목록 표시)

**로컬 소스를 Prod에 무조건 배포하면 카탈로그가 고쳐지지 않음** — env가 핵심.
