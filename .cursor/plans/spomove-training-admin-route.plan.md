# SPOMOVE Training (iiwarmup) — 점진 이전 전략 (갱신)

## 전략 전환 (사용자 결정)

- **기존 [`app/admin/memory-game`](app/admin/memory-game) 내부 `MODES`/엔진 대규모 통합 리팩터(한 파일에서 전부 뜯기)는 당초 보류** — 러닉·URL·즐겨찾기·분기 광범위 영향.
- **최신 (2026-04)**: Training 측은 **[`MemoryGameApp`](app/admin/memory-game/MemoryGameApp.tsx)을 메모리 게임과 “아예 똑같이” 복제**해 별도 모듈/폴더로 두는 방향(동작·분기·UI **1:1 복사**, 이후 `memory-game` 쪽 변경과 **드리프트는 감수**). **모드/레벨 매핑**은 `core5Catalog` ↔ `MODES`와 **동일 규칙** 유지하고, **매핑 안 되는 스테이지**는 카탈로그/실행 측에서 **일단 비움(placeholder / SOON / 미노출)** 처리.
- **admin/iiwarmup/spomove** 하위 Training 페이지는 그 **복제 앱**을 import해 **임베드(자체 재생)**, 쿼리/외부 URL 이동은 쓰지 않는다.

## 관찰된 버그 (사용자 보고) — 계획에 반드시 반영

### 1) 재생 후 ✕ 누르면 목록/설정 UI로 돌아가야 하는데, **빈 화면 + ✕ 종료만** 남는 현상

**가설(코드 근거)**  
- **A.** [`MemoryGameApp`](app/admin/memory-game/MemoryGameApp.tsx) 상단: `const M = MODES[settings.mode];` 직후 **`if (!M) return null;`** — 모드가 `MODES`에 없으면 **아무것도 안 그림**.  
- **B.** [`TrainingPortal`](app/admin/iiwarmup/spomove/training/page.tsx)는 `createPortal`로 **fixed 전체**를 올리고, 그 **위**에 `zIndex: 100000` **✕ 종료**만 별도로 둔다.  
- 자식이 `null`이면 포털 영역이 사실상 비어 **검은 배경 + ✕만** 보이는 패턴과 맞닿는다(매핑 오류·렌더 타이밍·잘못된 `mode` 문자열 등).

**계획상 대응 (실행 시)**  
- 복제 앱 + Training 셸에서: 임베드 시 **절대 `return null`로 “텅 빈” 튜브를 두지 않기**(fallback UI, 또는 `MODES` 검증 실패 시 즉시 종료/토스트 + `onClose`), ✕는 **콘텐츠가 있을 때만** 또는 unmount 시 항상 부모 `phase` 정리.  
- `onClose` 시 **`document.exitFullscreen` 등 정리**와 `setPhase` 순서 점검(풀스크린이 **다른 엘리먼트**에 남아 뷰포트를 가리는 케이스).

### 2) 진입 시 **여러 번 버벅이며** 이후 화면이 뜨는 느낌

**가설**  
- `next/dynamic`으로 **큰** `MemoryGameApp` 청크 로드 + `TrainingPortal`의 **`mounted` 게이트**로 **한 틱 지연** + `autoLaunch` 시 **home/setup 대신 검은 전체만** 잠시 표시(동일 파일 내 주석: autoLaunch + `screen`이 `home`/`setup`이면 `background: #020617` **고정** div만).  
- BGM/에셋 훅·카운트다운 등 **다단계 `useEffect`**가 연속으로 돌면서 **레이아웃/페인트가 여러 번** 발생.

**계획상 대응 (실행 시)**  
- 복제·진입 경로에 맞게 **로딩 스켈레톤 한 번**, 또는 **초기 자동시작** 경로의 전환을 줄여 **이중/삼중 페인트** 완화(복제 시에만 최적화해도 `memory-game` 본체는 그대로 둘 수 있음).

## 현재 코드베이스와의 맞춤

- [`app/admin/iiwarmup/spomove/page.tsx`](app/admin/iiwarmup/spomove/page.tsx): SPOMOVE 허브, 이미 `admin/memory-game`로 "SPOMOVE 트레이닝" 카드가 있음.
- [`app/admin/iiwarmup/layout.tsx`](app/admin/iiwarmup/layout.tsx): 2차 nav에 "SPOMOVE 트레이닝" → `/admin/memory-game` 직링크.
- **제안 URL**: `app/admin/iiwarmup/spomove/training/page.tsx` → **`/admin/iiwarmup/spomove/training`** (허브·layout과 일관, 기존 `spomove`와 충돌 없음).

## UI/UX 방향 (Training 페이지 + **복제 앱**에서만 조정 가능)

- 원칙: **루트 [`/admin/memory-game`](app/admin/memory-game) 동작은 건드리지 않고**, Training용 **복제본**에서만 로딩·종료·null 가드 등을 실험한다(위 버그#1·#2).

**목표**: “유치·구식” 느낌을 빼고, **최신 피트니스/트레이닝 앱**에서 흔한 흐름을 가져온 **트렌디·차분**한 느낌. 과장된 일러스트·초록색 “교육앱” 톤·이모지 남용은 지양.

**참고 흐름(개념만, 복붙 아님)**  
- **탐색**: 시리즈(Series) → 프로그램 카드 → 스테이지/세션 상세(한 화면에 정보 계층).  
- **시각**: 다크/뉴트럴 베이스 + **1~2개 액센트만** (단일 브랜드 컬러 스포트, 무지개 그라데이션 남용 금지).  
- **타이포**: 제목/라벨 위계를 뚜렷히(큰 숫자·짧은 라벨 `OVERVIEW`·`SESSION` 류), 본문은 **짧고 스캔 가능**하게.  
- **밀도**: 카드는 **큰 터치/클릭 영역 + 여백** — 표 위주 “관리자 표” 느낌보다 **프로그램 그리드 + 필터/칩**.  
- **모션**: `prefers-reduced-motion` 준수, **미세한** hover/전환(150~250ms)만. 화려한 파티클/튀는 애니메이션은 피함.  
- **피트니스 앱 클리셰를 살짝만**: 최근/즐겨찾기/“다음 추천” 한 줄(데이터 있을 때), 진행 **얇은 링·스텝 인디케이터**(과장된 게이지는 X).  
- **카피 톤**: “힙”은 **절제된 영문 서브라벨 + 단정한 한글** (예: `SPATIAL` / 공간 반응). **이모지는 헤더/키 비주얼에 최소** 또는 없음.

**구현 시 권장**  
- 이 페이지는 **독자 레이아웃·클라이언트 전용 스타일** 가능(Tailwind + 필요 시 `training/` 전용 CSS 변수). `iiwarmup` 공통 `neutral-950`과 **어울리되**, Training만 **한 단계 더 정제된** 토큰(배경 단계, 보더 1px, radius 통일) 적용.  
- **반응형**: 모바일에서도 시리즈→프로그램 **세로 스택**이 자연스럽게.

## 새 페이지에서 할 일 (실행은 사용자 승인 후)

1. **페이지 뼈대**: 제목 "SPOMOVE Training", Core 5(Series / Program / Stage) **표현용** 데이터(상수 JSON 또는 `lib/`) + **피트니스형 탐색 UI**(시리즈 탭/칩 + 프로그램 그리드 + 상세/실행, 표 중심 X). **엔진에 없는 스테이지**는 **비움/비활성** 처리.
2. **실행: 메모리 게임 **복제 앱** 임베드** (동적 import + Portal 유지 가능)  
   - [`MemoryGameApp`](app/admin/memory-game/MemoryGameApp.tsx)을 베이스로 **Training 전용 사본**을 두고(예: `app/admin/iiwarmup/spomove/_training/` 또는 협의된 경로), `initialMode` / `initialLevel` / `autoLaunch` **계약은 동일**하게 유지.  
   - **쿼리·iframe로 기존 URL 열기**는 **하지 않는다** (자체 재생).  
3. **허브/내비 갱신** (단계적)  
   - `spomove/page.tsx`에 "SPOMOVE Training (Core 5)" 카드 → `/admin/iiwarmup/spomove/training`.  
   - `layout.tsx` 2차 nav: 동일 링크 추가 또는, 성숙 시 기존 memory-game 링크를 training으로 교체.
4. **기존 제거 시점**  
   - 신규 training 페이지가 **단일 진입점**이 되고, 쿼리/즐겨찾기/내부 링크가 갱신된 뒤에만 `memory-game` **직링크/중복**을 제거.  
   - **삭제**는 "미사용 UI 링크 제거" 수준에서 시작하고, `memory-game` 코드 폴더 삭제는 **훨씬 뒤** 옵션.

## 데이터/DB

- **즉시 DB 마이그레이션 필수는 아님** — 신규 페이지는 클라이언트 상수 + 나중에 Admin에서 편집 가능하게 확장.  
- `spomove_favorites` / `spokedu_pro_screenplays` 는 **구 경로를 쓰는 동안** 그대로 두고, 새 페이지에 "즐겨찾기 저장 형식"을 맞출 때만 스크립트 검토.

## layout 활성 하이라이트

- `isSpomovePrimaryActive` / `subNav`가 `spomove/training` 경로를 SPOMOVE 구역에 포함하도록(이미 `spomove/` prefix면 포함됨) 확인.  
- 2차 nav에 "Training" 탭을 두면 `isTrainingActive` 추가.

## 이전 문서(대규모 리팩터)와의 관계

- `constants.ts`에서 `MODES`를 뜯어고치는 **통합 리팩터**는 **보류**.  
- Core 5 메타는 **새 `training` 페이지의 소스(또는 `lib/spomove/core5Catalog.ts`)** 에만 둬도 됨. 엔진은 계속 `mode`/`level` 문자열.

---

## 엔진 완전 분리 + 동일 동작 + “자체 재생” (정책 확정)

**질의 요지**: Training 쪽을 **memory-game에 붙이는 수준(임베드/쿼리/링크)**이 아니라 **경로·모듈을 아예 갈라** 쓰되, **화면/루프는 지금과 동일**해야 하고, **브라우저로 다른 URL만 던지는 방식**은 원하지 않음.

### “자체 재생”이 이미 충족되는 부분

- 현재 [`training/page.tsx`](app/admin/iiwarmup/spomove/training/page.tsx)는 **`<a href="/admin/memory-game">`로 훈련을 넘기지 않고**, 같은 앱 안에서 `MemoryGameApp`을 **동적 import + Portal**로 띄움 → **같은 탭·같은 SPA에서 재생**이다.

### 분리 방식 — **사용자 결정: 옵션 B (메모리 게임과 동일 구현 복제)**

| 접근 | 동작 동일성 | 난이도·리스크 |
|------|-------------|---------------|
| **A. 공용 추출** (`lib/` 등 한 엔진, 두 진입) | 단일 구현, 드리프트 적음 | 초기 추출 비용 큼 |
| **B. `memory-game`을 Training용으로 **복제** (별도 파일/폴더)** | 초기에 **가장 “똑같이”** 맞추기 쉬움 | 이후 양쪽 **수동 동기화·드리프트** — **의도적으로 선택** |
| **C. iframe** | — | 자체 재생·일체감 측면에서 비선호 |

**결론**: **B로 진행**. [`core5Catalog`](app/lib/spomove/core5Catalog.ts)의 `(mode, level)`과 `MODES` 정의는 **기존과 동일한 매핑 규칙**을 따르고, **엔진에 없는 조합**은 카탈로그에서 **비우거나 SOON**으로 둔다(사용자 지시).

### 이전 본문 “쿼리/iframe / 공용 추출 우선”과의 정리

- **쿼리로 `/admin/memory-game` 열기·iframe**은 Training **자체 재생** 목표와 맞지 않으면 **쓰지 않는다**.  
- **공용 추출(A)** 은 **보류**; 대신 **복제(B)** 로 Training 전용 스택을 쌓고, 나중에 필요하면 **선택적**으로만 공통 부분을 빼낸다.

---

## 구현 투두 (참고)

- [ ] **기존** `app/admin/iiwarmup/spomove/training/page.tsx` + 임베드 **대체/정리**  
- [ ] **`MemoryGameApp` Training 전용 복제** (필요 시 `memory-game` 하위 의존·CSS·constants **함께 복제**; import 경로·이름 정리)  
- [ ] **매핑**: `core5Catalog` ↔ `MODES`와 동일, **비매핑** 스테이지는 UI에 공란/SOON  
- [ ] **버그#1** 대응: `MODES[mode]` 누락·`return null`·✕ **오버레이** 조합이 빈 화면을 만드는 경로 제거(복제 앱 + Portal에서 동작 검증)  
- [ ] **버그#2** 대응: dynamic 로딩·`mounted`·autoLaunch **검은 프레임**·BGM/이펙트에 따른 **다중 페인트** 완화(가능한 범위에서)  
- [ ] (선택) `training` 전용 design tokens + `prefers-reduced-motion`  
- [ ] `spomove/page.tsx` + `layout.tsx` 링크는 **현행 유지/합의**  
- [ ] 이후: 구 `memory-game` 직링크·중복은 제품 합의 후
