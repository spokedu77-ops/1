# Phase 1-B2B — Implementation Report

**작업 모드:** LIMITED_IMPLEMENTATION_AND_QA  
**HEAD (시작·종료 기준):** `9309e5a643ac6846e087a8b3db6966438ad39cf5`  
**Commit / Push / 배포:** 없음

## 변경 파일 (허용 범위)

| 파일 | B2B 변경 |
|---|---|
| `app/spokedu/components/home-web/spokedu-method.tsx` | Method 카피·구조( `<ol>`/01–03 제거 → `article` 3개) |
| `app/spokedu/components/home-web/field-records.tsx` | Records 카피·사례 메타·링크 라벨·카탈로그 slug 연동 |
| `app/spokedu/components/home-web/home-web-assets.ts` | `HOME_FIELD_RECORDS`에 `slug` 3종 추가 (이미지·href·alt·objectPosition 유지) |
| `app/spokedu/components/home-web/home-web.module.css` | Method·Records 전용 스타일 + 모바일 Method grid-row 수정 |

**수정하지 않음:** Hero, Gateway, SPOMOVE/LAB/FinalCTA, `field-records-catalog.ts`, 기타 라우트·API.

## Method 구현

- Eyebrow `SPOKEDU METHOD`, H2·Lead는 지시서 §3-2 문구.
- Field / Content / System — 영문 라벨 + 한글 제목 + 본문(§4), `HOME_METHOD_VISUALS[0..2]` 유지.
- 순차 프로세스 암시 제거: `01/02/03` 삭제, `<ol>` → `role="group"` + `<article>` 3개.
- 모바일(≤767px): UI 프레임 `methodUiContent` / `methodUiSystem` — aspect-ratio·scale·object-position만 조정(원본 PNG 미수정).

## Records 구현

- Eyebrow `FIELD RECORDS`, H2 `실제로 운영한 학교·기관 체육수업`, Lead §6-2. 구 H2「수업은 현장에서 증명됩니다.」제거.
- slug `dongjak-spomove` · `donghaeng-special-pe` · `maedong-sports-stepup` — `getFieldRecordCatalogItem` + `HOME_RECORD_COPY`(지시서 §7 문구).
- 갤러리 1+2 유지; 사진 아래 `tileInfo` 패널에 프로그램·기관·운영/대상·설명·CTA.
- 링크: 동작 `/records/dongjak-spomove` → `사례 자세히 보기 →`; 블로그 2건 → `블로그에서 보기 ↗` + 기존 `target="_blank"` / `rel="noreferrer"`.

## 고객 경험 개선 (기존 대비)

| 관점 | 개선 |
|---|---|
| 지도자·기관 | Method에서「직접 수업 + 콘텐츠 + LAB」관계를 병렬 영역으로 이해 가능 |
| 사례 탐색 | Records 카드에 대상·운영 방식·한 줄 운영 설명·링크 성격 구분 |
| 신뢰 | 효과·실적 수치·「증명」형 H2 제거; VERIFIED 등 내부 용어 미노출 |

## 디자인 정합성

- 기존 `.paper` / `.dark`, `.rail`, `.head`, `.displaySection`, `.gallery` 2+1 그리드 유지.
- B1 Hero/Gateway용 `.heroActions` 등 공통 `.actions`/`.btn` 규칙 미변경(B1 final QA 유지).

## 사용한 원본 사실

- `app/spokedu/data/field-records-catalog.ts` (읽기 전용): programLabel, venue, operationType, href.
- `home-web-assets.ts`: 이미지·href SSOT(변경 없음, slug만 추가).
- B2A: `docs/design/phase-1b2a/CONTENT_REDESIGN.md`, `DESIGN_DECISION_REPORT.md`.

## 미해결·후속

- **모바일 Method FIELD 본문:** 1023px 이하 태블릿 grid-row(`1fr`) 잔존으로 390px에서 본문 일부가 잘리던 문제 → `grid-template-rows: auto` 추가 후 재캡처.
- **자동 대비·키보드 Tab 전 구간:** Playwright focus 1장(첫 Records 카드) + 수동 추가 확인 권장.
- **실사용자 테스트 / 전환율:** 수행하지 않음(전문가 기반 QA만).
