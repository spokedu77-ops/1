# IIWARMUP 스튜디오 UI 통일 — 렉 최소화 설계

## 목표
Think Studio와 비슷한 **레이아웃·톤**을 Challenge / Flow 스튜디오에도 적용하되, **실시간 구간(챌린지 재생, 플로우 캔버스)** 에서는 렉이 나지 않도록 설계한다.

---

## 원칙: 실시간 영역과 장식 영역 분리

| 구역 | 용도 | 허용 스타일 | 비허용 (렉 유발) |
|------|------|-------------|------------------|
| **Chrome** | 헤더, 사이드 패널, 버튼, 설정 폼 | `rounded-xl`, `ring-1`, `bg-neutral-900`, `border` | — |
| **실시간 뷰포트** | 챌린지 그리드·비트, 플로우 캔버스 | `bg-black` 또는 단색, `overflow-hidden`, `min-h-0` | `backdrop-blur`, `box-shadow`, 그라데이션, `rounded-*` on container |

- **Chrome**: 사용자 인터랙션 시에만 리렌더. 여기는 Think와 동일한 스타일 적용 가능.
- **실시간 뷰포트**: 매 프레임/매 비트 갱신. 여기에 무거운 CSS를 걸면 리페인트·컴포지팅 비용이 커져 렉 발생.

---

## 레이아웃 구조 (Think와 동일한 그리드)

```
┌─────────────────────────────────────────────────────────┐
│  헤더 (제목 + 전체화면/사운드 등)                          │  ← Chrome
├──────────────┬──────────────────────────────────────────┤
│              │                                            │
│  사이드 패널  │   실시간 뷰포트 (가벼운 컨테이너만)          │
│  (설정/저장)  │   - Challenge: SpokeduRhythmGame          │
│  Think 스타일 │   - Flow: canvas (또는 iframe)            │
│  OK          │   - blur/shadow/ring 없음                  │
│              │                                            │
└──────────────┴──────────────────────────────────────────┘
```

- **사이드**: `lg:grid-cols-[280px_1fr]`, `aside`에 `rounded-xl bg-neutral-900 ring-1 ring-neutral-800` 적용.
- **메인**: `main` 또는 한 단계 wrapper에 **장식용 클래스 없이** `min-h-0 overflow-hidden bg-neutral-950`(또는 `bg-black`)만 적용. 내부는 기존 게임/캔버스 컴포넌트만 둠.

---

## CSS 규칙 요약

1. **실시간 뷰포트를 감싸는 div**
   - 사용: `overflow-hidden`, `min-h-0`(flex 자식일 때), `bg-neutral-950` 또는 `bg-black`.
   - 사용 금지: `backdrop-blur`, `shadow-*`, `ring-*`, `rounded-*`(이 컨테이너에), 그라데이션 배경.

2. **사이드/헤더**
   - Think와 동일: `rounded-xl`, `ring-1 ring-neutral-800`, `bg-neutral-900`, `space-y-4` 등 자유.

3. **Flow 페이지**
   - 캔버스 영역은 이미 전체 화면. admin용 오버레이(레벨 선택 등)는 `fixed`로 두고, 캔버스와 같은 영역에 blur/shadow를 넣지 않는다.

---

## 적용 순서 제안
1. **Challenge 스튜디오**: 그리드 + 사이드로 설정 이동, 게임 영역은 “가벼운 메인”만 적용.
2. **Flow**: 현재가 이미 단순 구조이므로, admin 오버레이만 Think 톤으로 정리(선택).
3. **공통**: 새로 추가하는 “Think처럼 보이게” 스타일은 **항상 Chrome(사이드/헤더)** 에만 적용하고, 게임/캔버스 wrapper에는 적용하지 않는다.
