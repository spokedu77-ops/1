# Phase 1-B5 — IMPLEMENTATION_REPORT

**BUILD_ID (fresh build):** `cAsP3YNDCoxDl0jtF308L`  
**테스트 서버:** `PORT=3017`, `http://127.0.0.1:3017/spokedu/`

## 변경 요약

### `home-hero.tsx`

- 확정 H1·본문 1문장만 유지
- Eyebrow·`MOVEMENT BECOMES LEARNING`·`<br />` 강제 줄나눔 제거
- Primary: `수업 알아보기` → `/education`
- Secondary: `heroLinkSecondary` 텍스트 링크 `수업자료 둘러보기 →` → `/spokedu-lab`
- Hero 이미지 프레임: `r169` (16:9)

### `home-web-assets.ts`

- `HOME_HERO_IMAGE`만 `/field-editorial/home-hero-coaching.jpg`로 변경

### `home-web.module.css` (Hero 범위)

- KO-first 타이포 계층, Desktop H1 `clamp(44px, 3.6vw, 56px)`
- Hero 전 구간 16:9, `border-radius: 16px`
- Secondary 텍스트 링크 스타일 (`.heroLinkSecondary`)
- ≤1023 스택 하단 패딩 추가 → Gateway `border-top`이 CTA에 붙어 보이는 현상 완화
- Desktop EN-first `order` 규칙 제거

### 자산

- `public/images/spokedu/home/field-editorial/home-hero-coaching.jpg` 추가 (원본 private 파일 복사)

## CTA 아래 선

- Hero 내부 수평선 CSS 없음
- Gateway `.gateway .rail { border-top: 1px solid var(--line) }` — Hero 하단 패딩으로 시각적 분리 (Gateway CSS 미변경)

## Commit / Push

- **없음** (지시 준수)
