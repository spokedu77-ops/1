# SPOKEDU MASTER Visual System — Foundation Lock v2.1

MASTER는 같은 foundation을 공유하되, 화면의 역할에 따라 다른 표현을 사용한다.
정보 구조와 Product Contract는 각 Surface가 소유한다.

## Surface families

- Journey / Operational: neutral, text와 row 중심, 현재 행동 우선.
- Editorial Content: 실제 media와 콘텐츠 제목 중심, metadata 절제.
- Digital Content: preview와 Family identity 중심. SPOMAT 색상은 실제 자극 의미에만 사용.
- Live Utility: 현재 숫자·이름·결과 중심, 48px 조작과 projector 가독성 허용.
- Support / System: compact한 loading, empty, error, gate, confirmation.

## Typography

- Page title: 약 24px, semibold.
- Section heading: 약 18px, semibold.
- Content title: 14–16px, semibold.
- Body: 약 14px, regular.
- Metadata / eyebrow: 12–13px, regular 또는 medium.
- `font-black`은 런타임 숫자처럼 실제 display 역할에만 예외적으로 사용한다.

## Geometry

- Control: 10–12px radius.
- Standard surface: 12px radius.
- Media card: 12–16px radius.
- Modal / sheet: 약 16px radius 허용.
- 일반 surface는 shadow 없이 whitespace와 slate-200 border로 구분한다.
- Shadow는 menu, dropdown, modal처럼 실제 elevation이 있을 때만 사용한다.

## Color and border

- 기본 chrome은 white, slate, neutral이다.
- Brand accent는 primary action, active selection, focus에 사용한다.
- Red는 error/destructive/expired, amber는 warning/pause, green은 complete/positive다.
- SPOMAT 색상은 SPOMOVE stimulus와 content identity에만 적극 사용한다.
- 기본 border는 slate-200이다. Empty decoration에 dashed border를 사용하지 않는다.

## Actions

- Primary: 현재 Surface의 대표 행동 하나, semibold.
- Secondary: neutral border와 medium weight.
- Quiet: 돌아가기, 관리, 자세히 같은 text-level utility.
- Destructive: 평상시에는 낮추고 확정 단계에서만 강하게 표시한다.
- Live action: Class Tools에서는 48px 이상을 허용한다.

## Cards and metadata

- Card는 독립 콘텐츠, 선택 객체, media object에만 사용한다.
- Section, 설명, metadata group, navigation, empty state를 카드로 만들지 않는다.
- Badge는 상태, chip은 filter/selection에만 사용한다.
- 연령·인원·공간·난이도·교구는 plain metadata를 우선한다.
- Card 안 Card 안 Status Card 구조를 만들지 않는다.

## Responsive

- 390px에서 horizontal overflow와 bottom navigation 충돌이 없어야 한다.
- 주요 control은 최소 44px이며 첫 viewport에서 화면 목적이 보여야 한다.
- Schedule은 agenda, Library/SPOMOVE는 media discovery, Tools는 instrument로 축소한다.
- 1440px 공간을 dashboard panel이나 작은 5–6열 카드로 채우지 않는다.

## Exceptions

- Library media geometry는 operational surface와 같을 필요가 없다.
- SPOMOVE preview는 digital content identity를 유지한다.
- Class Tools의 숫자, 점수, 결과는 일반 typography보다 크게 쓸 수 있다.
- 예외는 역할 차이를 설명해야 하며 decoration만을 이유로 만들지 않는다.

## Locked information architecture

- Primary navigation은 홈, 프로그램, 즐겨찾기, 수업 관리, 수업 도구의 정확히 5개다.
- 프로그램은 놀이체육과 SPOMOVE Browse Gateway를 소유한다.
- 즐겨찾기는 SAVE 이후 later REUSE / BUILD를 위한 first-class retrieval surface다.
- 수업 관리는 Schedule을 먼저, 반복 Class context를 두 번째로 둔다.
- PREPARE는 BUILD 내부 상태이며 `DISCOVER → BUILD → TEACH → CAPTURE → REUSE`에 새 단계를 추가하지 않는다.

## Network status

- 정상 online 상태는 badge 없이 silent하다.
- offline, sync failure, network-required error는 명시적으로 노출한다.
