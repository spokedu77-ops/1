# Design Decision Report — Phase 1-B3A

## 현재 강점

- 실제 **PROOF** 사진(SPOMOVE)·**PRODUCT** UI(LAB) 사용 — SSOT 역할 준수
- Editorial split / product frame — B1 홈과 시각 리듬 일치
- CTA가 공개 URL SSOT (`/spomove`, `/spokedu-lab`)와 일치
- SEE·DECIDE·MOVE — 공개 SPOMOVE flow와 정합

## 핵심 결함

1. SPOMOVE: **신호→움직임** 인과가 한 컷에 약함  
2. LAB: **권한 경계**·**144+**·**UI crop(모바일)**  
3. Method/Records와 **정보 중복** (현장·SPOMOVE)

## 개선안 목표 (B3A 기본안 1종)

- SPOMOVE: **이해 우선** — 짧은 3단 유지 + 반응 유형 pill + **듀얼 실제 자산**(현장+가이드 UI)  
- LAB: **역할 명확화** — 지도자·Lite+ 경계를 lead에 반영, stat 수치 제거 후 라이브러리 가치 서술, UI는 라이브러리 대표 화면 유지

## 기존 대비 시각 차이

| | 현재 | 제안 |
|---|---|---|
| SPOMOVE | 단일 4:3 현장 | 4:3 현장 + 세로 UI 보조 |
| LAB | 144+ 대형 stat | 텍스트 stat (수치 없음) |
| LAB 모바일 | 230% zoom crop | B3B에서 crop/object-position 재검토 |

## 제품 이해도 · 모바일

- 제안안 HTML(`PRODUCT_EXPERIENCE_PREVIEW.html`)에서 SPOMOVE **활동 vs 시청** 문장 명시  
- LAB pill: Library / Tools / Lite+ 운영·기록 — **과업 3·4** 개선 (전문가 점검)

## 도입하지 않은 대안

| 대안 | 이유 |
|---|---|
| SPOMOVE UI-only | 현장 신뢰·기관 과업 1 약화 |
| LAB 2화면(B안) | 두 번째 운영 UI **별도 공개 PNG** 확보·기능 라벨 검증 필요 — 자산 부족 시 억지 배치 금지 |
| ADAPT 4단 홈 노출 | 홈 길이·Method 중복, 공개 variation으로 충분 |
| 애니메이션·슬라이더 | 지시서 금지 |

## 구현 가능성 (B3B)

- **TSX copy** + **home-web.module.css** (SPOMOVE/LAB scoped) — B1/B2B와 동일 패턴  
- 듀얼 visual: 기존 `prepare-lesson-plan` PNG 재사용 가능 (신규 파일 불필요)  
- 144+ 제거/유지: Product Decision + count SSOT

## 추가 자산

- SPOMOVE **프로그램 실행 UI** 클로즈업(공개 캡처) — 선택 시 A/B 보강  
- LAB **수업반·출석** 실제 UI 스크린 — B안 2화면 시

## 사용자 승인 필요

- `144+` 유지 vs 제거 vs 검증 후 재표기  
- SPOMOVE 듀얼 vs 단일 사진  
- LAB body에 Lite+ 명시 수준 (홈 vs 랜딩-only)  
- 모바일 `.productFrame` crop 변경 폭
