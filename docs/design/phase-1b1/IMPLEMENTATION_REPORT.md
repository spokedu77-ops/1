# Phase 1-B1 구현 보고서

- 작업일: 2026-10-16
- 브랜치: `main` (신규 브랜치 없음)
- Git 커밋/푸시/배포: 없음

## 작업 환경

| 확인 항목 | 결과 |
|-----------|------|
| Git 저장소 | `C:/Users/joker/Documents/GitHub/1` |
| 원격 | `https://github.com/spokedu77-ops/1.git` |
| 브랜치 | `main` |
| Phase 1-A / V1.1 자료 (`docs/design/phase-1a/`) | **저장소에 없음** — 이번 구현은 사용자 지시서(V1.1 확정 문구·규격)를 SSOT로 적용 |

작업 시작 시 허용 3파일에 미커밋 변경 없음. 아래 파일의 기존 미커밋 변경은 그대로 유지:

- `SPOKEDU_PUBLIC_AUDIT.md`
- `app/robots.ts`
- `app/spokedu-master/navigation.contract.test.ts`

## 변경된 파일 (서비스 코드)

1. `app/spokedu/components/home-web/home-hero.tsx`
2. `app/spokedu/components/home-web/service-gateway.tsx`
3. `app/spokedu/components/home-web/home-web.module.css`

## 변경된 CSS 선택자 (Hero · Gateway)

### Hero

- 추가/갱신: `.heroText`, `.heroEyebrow`, `.heroH1`, `.heroEnglish`, `.heroLead`, `.heroActions`
- 유지·조정: `.hero`, `.heroGrid`, `.heroCopy`, `.heroVisual`
- 데스크톱(≥1024px): `.heroCopy` flex `order`로 B안 위계(eyebrow → 영문 → 한글 H1 → 본문)
- ≤1023px: `.heroText { display: contents }` + grid area로 A안 순서(본문 → 이미지 → CTA)
- ≤767px: `.heroVisual .media { border-radius: 16px }`, `.heroActions` 가로 2열 CTA

### Gateway

- 제거(사용 중단): `.gatewayGrid`, `.gatewayTitle`, `.gatewayList`, `.gatewayRow` 및 관련 hover
- 추가: `.gatewayHead`, `.gatewayHeading`, `.gatewayIntro`, `.gatewayCards`, `.gatewayCard`, `.gatewayCardAccent`, `.gatewayAccentOrange`, `.gatewayAccentTeal`, `.gatewayAccentBlue`, `.gatewayCardAudience`, `.gatewayCardTitle`, `.gatewayCardBody`, `.gatewayCardLink`

공유 규칙(`.root`, `.rail`, `.section`, `.actions`, `.btn*`, 다른 섹션 클래스)은 Hero/Gateway 범위 밖에서 구조 변경 없음.

## Hero 변경 요약

- **데스크톱 B안:** 좌 텍스트 / 우 `HOME_HERO_IMAGE`, 영문 Display `#245DFF` 약 72–100px, 한글 H1 `#0B1F46` 42px, CTA 48px·간격 12px
- **모바일 A안:** Eyebrow → 한글 H1(36px) → 영문(20px) → 본문 → 이미지(반경 16px) → CTA
- **H1:** 페이지 내 1개, `#home-hero-heading`, 한글 핵심 문구
- **영문:** `<p class="heroEnglish">`, 3줄 `MOVEMENT / BECOMES / LEARNING.`
- **이미지:** `home-web-assets.ts` / 파일 미변경 — `home-hero-gym-motion.jpg`, `object-position: 62% 50%` 유지

## Service Gateway 변경 요약

- 목록형 3행(01/02/03) → **3열 카드**(모바일 1열), **장식 번호 없음**
- 카드 전체 단일 `<Link>`, 하단 링크 문구는 `<span>`(중첩 링크 없음)
- 상단 4px accent: Orange `#FC5606`, Teal `#0CA678`(LAB mint 계열), Blue `#245DFF`
- href: `SPOKEDU_PATHS.education`, `.private`, `.subscription` (`/spokedu-lab`)

## 구조 변화

| 영역 | 이전 | 이후 |
|------|------|------|
| Hero 브랜드 줄 | SPOKEDU + eyebrow | eyebrow만 |
| Hero 제목 | 영문 H1 | 한글 H1 + 영문 보조 |
| Hero CTA 배치 | 카피 블록 내부 | `.heroActions` 분리(모바일 이미지 아래) |
| Gateway | 좌 H2 + 우 3행 | 상단 헤드 + 3카드 그리드 |

## PC·모바일 주요 크기 (구현값)

| 요소 | Desktop (≥1024) | Mobile (≤767) |
|------|-----------------|---------------|
| 영문 Display | clamp(72px–100px) | 20px |
| 한글 H1 | 42px | 36px |
| 본문 | 16–17px | 16px |
| Eyebrow | 12px | 12px |
| 카드 제목 | 19–24px | 19px |
| 카드 본문 | 14–16px | 14–15px |

## 미해결 / 차이

- `docs/design/phase-1a/` 원본 HTML·비교 시안 없음 → 픽셀 단위 대조는 지시서 수치 기준
- 키보드 Tab 순서·`:focus-visible` 시각은 Playwright 자동 스크립트에서 미검증(수동 확인 권장)
- 390px CTA는 가로 2열(`flex:1`) — 지시서 “한 행” 기준, 매우 좁은 기기에서 줄바꿈 시 세로 전환은 미추가

## 사용자 승인 필요

1. **히어로 사진** 공개 사용 승인 전까지 **임시** — Production 배포 불가(지시서 §6)
2. 현재 자산은 실사 체육관 장면(`home-hero-gym-motion.jpg`); V1.1 후보 3종으로 교체는 별도 지시
3. Phase 1-A V1.1 HTML과의 1:1 시각 diff는 로컬 자료 부재로 미실시

## 산출물 SHA-256 (작업 후)

```
B1 파일 해시는 QA_RESULTS.md 감사 섹션 참고
```
