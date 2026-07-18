# SPOKEDU Home — 사진 요청 (풀블리드 리디자인)

파일명 그대로 `public/images/spokedu/` 아래에 넣으면 홈에 반영됩니다.
ZIP으로 폴더 구조를 유지해 주셔도 됩니다.

## 최우선 5장 (이것만 와도 홈이 바뀜)

| # | 저장 경로 | 촬영 내용 | 규격 |
|---|-----------|-----------|------|
| 1 | `home/home-hero-movement.jpg` | **Hero 풀블리드** — SPOMOVE 또는 단체수업. 아이들+지도자(또는 움직임)가 화면의 60%+. 천장/빈 벽 최소화 | 가로 2400px+, 16:9~3:2 |
| 2 | `dispatch/dispatch-group-class.jpg` | 기관 게이트 — 다인 참여, 공간 규모가 보이게 | 1600px+ |
| 3 | `private/private-coaching.jpg` | 개인 게이트 — 지도자↔아이 상호작용(종목보다 관계) | 1600px+ |
| 4 | `programs/program-spomove.jpg` | SPOMOVE — 빔/스크린 + 아이 반응(+패드 가능하면) | 1600px+ |
| 5 | `records/yangcheon.jpg` | 사례 대표 — 실제 기관 수업 | 1600px+ |

## 있으면 완성도 급상승

| 저장 경로 | 내용 |
|-----------|------|
| `records/dasarang.jpg` (또는 `.png`) | 원데이 에너지 |
| `records/playz.jpg` | 방학캠프 단체 |
| `curriculum/curriculum-instructor-training.jpg` | 강사/커리큘럼 |

## 촬영 가이드

- Hero는 반드시 **가로**. 얼굴 부담 시 뒷모습·측면 OK.
- 천장·빈 바닥·벽 비중을 줄이고 “아이들이 무엇을 하는지”가 보여야 합니다.
- SPOMOVE는 **빔 화면 + 패드 + 아이 반응**이 한 장에 보이면 최상.
- 밝기·색감을 비슷하게 맞추면 섹션 통일감이 좋아집니다.

## 코드 슬롯

- Hero LCP: `SPOKEDU_IMAGES.home.hero` → `home/home-hero-movement.jpg`
- 교체 전에도 레이아웃은 풀블리드로 동작합니다. 위 파일을 덮어쓰면 즉시 반영됩니다.
