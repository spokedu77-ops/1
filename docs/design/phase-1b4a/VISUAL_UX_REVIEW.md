# Phase 1-B4A — Visual UX Review (전문가 점검)

## §12 질문

| # | 평가 |
|---|------|
| 1 서비스 이해 | **개선** — 한글 H1로 “움직임·성장 설계”가 먼저 읽힘 |
| 2 한글/영문 위계 | **태블릿 PASS** — H1 > English > lead; **데스크톱** English still large below Korean (**B1 대비 변화**) |
| 3 사진·텍스트 균형 | **태블릿 PASS** — 2열, 4/3 프레임, bleed 없음 |
| 4 첫 화면 행동 | **941 PASS** — Primary·Secondary 모두 861px 안 (431–476px) |
| 5 “늘린 모바일” 느낌 | **768+ 완화** — 전용 2열 |
| 6 390/1440 보존 | **390** block 스택 유지; **1440** 12열·bleed 유지 (한글 H1 추가만 차이) |

## 구간별

- **390:** CTA 408px, 이미지는 CTA 아래 — 기존 A안 유지  
- **767→768:** block → grid, CTA 중복 없음, overflow 없음  
- **1023→1024:** grid 2열 → 12열; CTA top 454→556 (점프 있으나 둘 다 viewport 내)  
- **941:** `before-after-941.png` — 좌: 작업 전 HEAD, 우: B4A (동일 941×861 Hero crop)

## 디자인 시스템

Brand Navy/Blue, Pretendard, 버튼 44–48px, CTA href 유지 — **정합**

## 미해결 시각

- 1024 경계에서 Hero 높이·CTA Y 점프 — 브레이크포인트 특성; 과도한 깨짐은 아님으로 판단  
- 태블릿에서 두 CTA가 한 줄일 때 Secondary가 좁음 — 941에서 가로 배치 확인됨
