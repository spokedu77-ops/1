# Phase 1-B5 — PREFLIGHT_REPORT

**일시:** 2026-10-18 (KST)  
**브랜치:** `main`  
**HEAD:** `c1a7ec52691f0f710e51a15aeb359e8eb7b55e76`  
**판정:** PREFLIGHT **PASS** (구현 진행)

## Git / 작업 트리

| 항목 | 결과 |
|------|------|
| 브랜치 | `main` ✓ |
| git pull / checkout / stash | 수행하지 않음 ✓ |
| B4D Records CSS 복구 | 로컬 `home-web.module.css`에 B4D 타일 규칙 존재 ✓ |
| CSS contract (`home-css-contract.mjs`) | 구현 전·후 `missingCount: 0` ✓ |

기존 미커밋 작업(B4A~B4D 문서·캡처 등)은 유지했으며, B5는 허용 파일만 추가·수정했다.

## Hero DOM (구현 전)

- Eyebrow, 영문 Display, 긴 lead, 4:3 Hero 프레임, Secondary 테두리 버튼
- `HOME_HERO_IMAGE` → `home-hero-gym-motion.jpg`

## 이미지 자산

| 경로 | 결과 |
|------|------|
| `public/images/spokedu/home/field-editorial/home-service-private.jpg` | **존재** |
| `%USERPROFILE%\Downloads\home-service-private.jpg` | 없음 (프로젝트 내 파일 사용) |

복사 대상: `public/images/spokedu/home/field-editorial/home-hero-coaching.jpg` (원본 `home-service-private.jpg` 유지)

## 7개 홈 섹션

Hero 외 Gateway / Method / Records / SPOMOVE / LAB / Final CTA TSX·CSS는 B5에서 **미수정**. 회귀 QA는 B4D 게이트 + 라이브 DOM 감사로 확인.
