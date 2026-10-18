# Phase 1-B3B — Implementation Report

**Date:** 2026-10-17  
**Repo:** spokedu77-ops/1 · **Branch:** main · **Base HEAD:** `a050b1e6aa32fc3d5af07941c1d33145be1bc1ae`  
**Scope:** SPOMOVE + SPOKEDU LAB home sections only (Hero·Gateway·Method·Records·FinalCTA untouched)

## Changed files (service)

| File | Change |
|------|--------|
| `app/spokedu/components/home-web/spomove-stage.tsx` | 지시서 §3 카피·반응 유형·`spomoveStage` 래퍼 |
| `app/spokedu/components/home-web/master-stage.tsx` | §6 카피·144+ 제거·정성 라벨·`masterStage` 래퍼 |
| `app/spokedu/components/home-web/home-web.module.css` | `.labLibraryStat`, 섹션 스코프, LAB 모바일 프레임만 조정 |

## SPOMOVE

- **Eyebrow / 라벨 / H2 / 본문 / meta / CTA:** 지시서 §3-1 문구 그대로 반영.
- **이미지:** `HOME_SPOMOVE_VISUAL` → `/images/spokedu/dispatch/dispatch-group-class.jpg` (변경 없음). prepare-lesson PNG 미사용.
- **레이아웃:** 기존 editorial `.split` 유지. 반응 유형은 `.meta` 한 줄.

## SPOKEDU LAB

- **H2 / 본문 / CTA:** §6-2 반영. CTA → `SPOKEDU_PATHS.subscription` (`/spokedu-lab`).
- **144+:** 운영 DB 없이 공개 프로그램 수 집계 불가 → **§8-C** 적용, `놀이체육 프로그램 라이브러리` 정성 라벨.
- **이미지:** `library-program-cards-20261008-final.png` 유지.
- **모바일:** `.masterStage .productFrame` — 16/10 + `object-fit: contain` (기존 전역 230% 크롭 제거, LAB만).

## Customer experience (vs prior home copy)

| Area | Before | After |
|------|--------|--------|
| SPOMOVE | 추상적 “인지·판단·움직임” | 화면 **신호 → 선택 → 몸 반응** + 스포매트/수업 공간 |
| SPOMOVE meta | 색상 인지·복합 인지 | **단순·선택·복합 반응** (공개 랜딩 SSOT와 정렬) |
| LAB | 출석·기록까지 “하나에서 관리” | **탐색 + 운영 도구**, **요금제별 범위** 명시 |
| LAB stat | 미검증 `144+` | 검증 가능한 **라이브러리** 라벨 |

## B3A design alignment

- B3A 카피·권한 주의와 일치. B3A **듀얼 이미지·가이드 UI를 SPOMOVE에 쓰는 시안**은 B3B에서 **미구현**(지시서 §4).
- B3A 모바일 LAB 크롭 비판 → B3B에서 **A안(전체 UI 구조)** 채택.

## Remaining issues

- Hero 941px CTA 첫 화면 미노출 → `HOME_TABLET_HERO_ISSUE.md` (본 페이즈 수정 범위外).
- 로컬 **3000/3001/3002** 서버는 구 BUILD 마커(`2026-09-21-explorer-16x9`); QA는 **fresh build `GvJA6zsUrRbbkyFABOdj2` on port 3004**.
- SPOMOVE 전용 실행 UI 스크린샷 자산은 여전히 없음 — 추가 자산 요청만 가능.
