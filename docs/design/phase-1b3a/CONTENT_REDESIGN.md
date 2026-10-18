# Content Redesign — SPOMOVE & LAB

확정 카피 아님. **B3B 승인 전 제안.** `사용` = B3B 구현 가능(근거 충족).

## SPOMOVE

| 위치 | 현재 문구 | 문제 | 제안 문구 | 사실 근거 | 사용 |
|---|---|---|---|---|---|
| H2 | 보고 판단하고 움직입니다. | 화면·신체 연결 약함 | 화면 신호를 보고, 몸으로 답합니다. | `spomove-program-page` flow·hero 방향 | 제안 |
| Body | 시각적 자극… 통합적으로 경험… | 추상적 | 화면의 색·위치·방향을 확인한 뒤 SPOMAT과 수업 공간에서 움직임으로 반응합니다. 영상 시청만 하는 활동이 아닙니다. | flow.steps, SPOMAT 관계 (`curriculum-page` FAQ) | 제안 |
| Meta | 색상 인지 · 선택 반응 · 복합 인지 | SEE·DECIDE·MOVE와 병렬 | 단순 반응 · 선택 반응 · 복합 반응 | `content.levels` titles | 제안 |
| Line | SEE · DECIDE · MOVE | — | **유지** | 공개 flow 3단 | **유지** |
| CTA | SPOMOVE 자세히 보기 | — | **유지** (`/spomove`) | `SPOKEDU_PATHS` | **유지** |

## SPOKEDU LAB

| 위치 | 현재 문구 | 문제 | 제안 문구 | 사실 근거 | 사용 |
|---|---|---|---|---|---|
| H2 | 수업자료부터 운영과 기록까지. | Free에게 전 기능 암시 | 수업자료를 찾고, 수업을 운영합니다. | Library+운영 분리 (`curriculum-page` pillars) | 제안 |
| Body | …출석과 기록까지 하나에서 관리 | Lite+ 경계 모호 | 놀이체육 프로그램·가이드를 검색·준비하고, Lite 이상에서 수업반·일정·출석·기록을 이어갑니다. | `subscription.ts`, `SubscriptionGateWall` | 제안 |
| Stat | 144+ / 놀이체육 프로그램 | 수치 NOT_VERIFIED | **수치 제거** → 「놀이체육 프로그램 라이브러리」+ 보조 한 줄 | SOURCE_OF_TRUTH | 제안 (수치 유지 시 별도 검증) |
| CTA | SPOKEDU LAB 알아보기 | — | **유지** (`/spokedu-lab`) | public routes | **유지** |

## 시각 (콘텐츠 연계)

| 영역 | 제안 | 근거 |
|---|---|---|
| SPOMOVE | 현장 사진 + 실제 가이드 UI 2분할 (합성 장면 X) | A+C 비교 (§7) — 자료 2종 모두 repo 내 실제 PNG |
| LAB | 라이브러리 UI 유지 + 모바일 crop 완화 검토 | B3B에서 CSS만 조정 가능, B3A는 방향만 |
