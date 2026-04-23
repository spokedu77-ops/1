# SPOMOVE Training (iiwarmup) — 점진 이전 전략 (갱신)

## 전략 전환 (사용자 결정)

- **기존 [`app/admin/memory-game`](app/admin/memory-game) 내부 `MODES`/엔진 대규모 리팩터링은 하지 않는다** — 러닉·URL·즐겨찾기·분기 광범위 영향.
- 대신 **admin/iiwarmup/spomove 하위에 "SPOMOVE Training" 전용 페이지**를 새로 두고, **여기서 Core 5·카탈로그·UI·문구를 다듬은 뒤** 나중에 구 경로/허브 링크를 정리(축소·제거)한다.

## 현재 코드베이스와의 맞춤

- [`app/admin/iiwarmup/spomove/page.tsx`](app/admin/iiwarmup/spomove/page.tsx): SPOMOVE 허브, 이미 `admin/memory-game`로 "SPOMOVE 트레이닝" 카드가 있음.
- [`app/admin/iiwarmup/layout.tsx`](app/admin/iiwarmup/layout.tsx): 2차 nav에 "SPOMOVE 트레이닝" → `/admin/memory-game` 직링크.
- **제안 URL**: `app/admin/iiwarmup/spomove/training/page.tsx` → **`/admin/iiwarmup/spomove/training`** (허브·layout과 일관, 기존 `spomove`와 충돌 없음).

## UI/UX 방향 (신규 페이지 전용 — 기존 memory-game 터치 없음)

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

1. **페이지 뼈대**: 제목 "SPOMOVE Training", Core 5(Series / Program / Stage) **표현용** 데이터(상수 JSON 또는 `lib/`) + **피트니스형 탐색 UI**(시리즈 탭/칩 + 프로그램 그리드 + 상세/실행, 표 중심 X).
2. **기존 트레이닝과 연결 (리스크 최소)**  
   - 1단계: 각 항목이 **엔진 키 `(mode, level)`** 와 1:1·N:1 매핑이 정해지면, **"실행"은 기존 `MemoryGameApp`이 있는 route로 이동**  
     - 예: `/admin/memory-game?mode=basic&level=1` 처럼 쿼리 지원이 이미 있으면 그것을 사용, 없으면 쿼리 읽기만 얇게 추가.  
   - 또는 **iframe/embed**로 기존 페이지만 감싸서 새 UI만 교체(가장 엔진 무건드림).
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

## 구현 투두 (참고)

- [ ] `app/admin/iiwarmup/spomove/training/page.tsx` 생성 + Core 5 **피트니스형** 탐색 UI
- [ ] (선택) `training` 전용 design tokens(배경/액센트/보더/radius) + `prefers-reduced-motion`
- [ ] (선택) `core5Catalog.ts` + `(mode, level)` 맵
- [ ] `memory-game` 쿼리 `mode`/`level` — 없으면 `MemoryGameApp` 초기 `settings`에 연결
- [ ] `spomove/page.tsx` + `layout.tsx` 링크 추가/조정
- [ ] 이후: 구 `memory-game` 링크 제거는 제품 합의 후
