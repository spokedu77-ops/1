# Phase 1-B2A — 설계 결정 보고

## 기존 강점

- **실사·실 UI** 혼합 — SSOT PROOF/PRODUCT 역할 준수 (`home-web-assets.ts`)
- **3단 Method** — 브랜드 F·C·S 내러티브와 정합 (SSOT §01)
- **Records 갤러리** — 대표+보조 시각 위계, 동일 캡션 구조
- **B1 Hero/Gateway**와 색·서체 계열 연속 (Navy/Blue, Pretendard)

## 기존 문제 (요약)

- 연결·증거·모바ile UI 가독성·링크 일관성 → `EXPERT_UX_AUDIT.md`

## A안 — 교육 방식 중심

**구성:** Method(연결 설명 강화) → Records(3건 리스트+메타)

| 장점 | 단점 |
|------|------|
| F·C·S 먼저 이해(과업 3) | Method 블록 길어짐 |
| 지도자·기관 담당자 IA | 사례-first 고객은 스크롤 |
| B1 직후 “방법론” 흐름 | UI 3장 모바일 부담 잔존 |

## B안 — 현장 사례 중심 (비교 시안, **홈 순서 변경 아님**)

**구성:** Records(풍부) → Method(루프 요약)

| 장점 | 단점 |
|------|------|
| 과업 1·2·4 빠름 | Method이 뒤로 — F·C·S 늦게 |
| 신뢰·증거 우선 | Gateway 직후 Method 헤드와 톤 중복 가능 |
| 기관·학부모 설득 | 지도자 LAB 연결은 2스크롤 |

## 고객별 예상 탐색 난이도 (전문가 추정, **정량 테스트 없음**)

| | Current | A | B |
|---|---------|---|---|
| A 기관 | 중 | 중 | **낮~중** |
| B 학부모 | 중 | 중 | **낮~중** |
| C 지도자 | 높 | **낮~중** | 중 |

## 브랜드 통일성

- 시안 HTML: `#245DFF` / `#0B1F46` / Pretendard / 20px gutter — **PASS**
- Phase 1-A HTML 없음 — spacing은 B1·home-web.module.css 관행 추정

## 근거 부족

- Field→Content **내부 제작 프로세스** (UNVERIFIED)
- 사진 **공개 허가** 문서 (UNVERIFIED)
- donghaeng·maedong **onsite** (PARTIAL)

## 추천 방향

**하이브리드 구현(향후 B2B):** **홈 섹션 순서 유지**(Method → Records)하되, **A안 콘텐츠 밀도**(연결 문장·step 설명) + **Records 카드 메타**(B안 리스트형 정보)를 Method 블록 안/Records 블록에 각각 적용.

단독 A 또는 B만 선택 강요하지 않음.

## 사용자 승인 필요

1. Records 링크 정책 (블로그 vs `/records/[slug]` 확대)
2. “증명” vs “운영 사례” 헤드 카피
3. UI crop vs 텍스트 보조 (모바ile)
4. 사진·아동 초상 공개 승인
5. B2B 구현 Sprint Brief 범위
