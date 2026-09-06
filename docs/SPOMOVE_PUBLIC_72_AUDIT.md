# SPOMOVE MASTER 공개 72 전수감사 (1단계 · READ-ONLY)

- 감사일: 2026-09-06
- SSOT 공개 여부·순서: `app/spokedu-master/spomove/spomovePublicCatalogOrder.ts`
- 실제 동작 SSOT: Official Preset engine → `session/page.tsx` → `EngineRouter.tsx` → Player / `signals.ts`
- 본 문서는 **코드·프리셋·CMS·DB를 수정하지 않고** 작성했다.
- 라이브 `think_asset_packs` 행은 이 환경에서 조회하지 않았다. CMS·썸네일·가이드 영상은 **코드 경로 + 파일 존재**만 확인했다.

---

## 숫자 보고

```text
PUBLIC TOTAL: 72

PASS: 39
WARN: 28
FAIL: 4
VERIFY: 1

P0: 5
P1: 23
P2: 44

HOLD PRESETS FOUND: 22
TRUE DUPLICATE CANDIDATES: 3 pairs
BACKWARD-COMPATIBILITY RISKS: 27
```

행 집계는 `SPOMOVE_PUBLIC_72_AUDIT.csv` Status/Risk 컬럼과 일치시킨다.

- FAIL 4: `stroop-arrow-reverse-08`, `stroop-word-reverse-48`, `simon-camouflage-center-skeleton`, `sequential-memory-color-number-exp`
- P0 5: 위 4 + `reaction-cognition-space-direction-color-01b`(Status는 WARN, 중복 쌍의 공개 쪽)

- P0/P1/P2는 **프로그램 행의 최고 위험도** 개수다. 한 ID가 여러 레이어 문제를 가져도 최고값만 센다.
- PASS여도 CMS/에셋 컬럼은 대부분 `VERIFY`(라이브 팩 미조회)다.

---

## 감사 방법 (요약)

1. `SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER` 72개를 모집단으로 고정. 프리셋 파일에만 있는 ID는 공개로 치지 않음.
2. `OFFICIAL_SPOMOVE_LIBRARY`는 코어 + expansion 이후 `withCanonicalFlankerCatalog` / Simon·Stroop 제목 정규화 / HOLD 함수가 **엔진·제목을 덮어쓴다**. 최종 라이브러리 기준.
3. Session은 `preset` 쿼리로 `findOfficialSpomovePreset` → `EngineRouter`에 `mode/level/options`를 그대로 전달.
4. SIGNAL/SELECT/MOVE는 `signals.ts` / `createSimonSignalGenerator` / reactTrain 플레이어 / MemoryGame / FlowEngine에서만 채움. 증명 안 되면 `VERIFY`.

---

## 카탈로그 무결성 (A)

| 검사 | 결과 |
|------|------|
| Flat 72개, 그룹 합 23+10+10+17+4+6+2 | 일치 |
| 중복 Public ID | 없음 |
| Catalog에 있으나 라이브러리 누락 | 없음 (코드상 `findOfficialSpomovePreset` 전제) |
| `programGroup` vs SSOT 그룹 | `visual-reaction-blackout-37`만 ID가 visual-reaction인데 **group=simon** (의도적 재배치). 그 외 Public 72는 그룹 일치 |
| 순서 | SSOT가 Hub 정렬을 덮음 (`comparePresetsByPublicCatalogOrder`) |

---

## 시스템 레벨 발견 (72행보다 먼저 볼 것)

### 1) Flanker Public ID가 예전 게임 자리에 새 게임을 심음 — BACKWARD-COMPATIBILITY RISK (P0 이력 / 현재 제목은 맞춤)

`withCanonicalFlankerCatalog`가 Public 17개 ID에 대해 **level·theme·extremeMode·arrowMode를 재지정**하고 `flankerStimulusType`을 `'color'`로 고정한다. 원본 코어/expansion 설명·chips·executionFacts는 **그대로 남는다**.

| Public ID | 원본 engine (파일) | 최종 engine (canonical) | 현재 카드 제목 |
|-----------|-------------------|-------------------------|----------------|
| `flanker-uniform-07` | L1 동일 원 | L5 화살표 lr | 화살표 · 보통 (좌우) |
| `flanker-nested-circles-04` | L4 동심원 | L3 극단 · 색상 | 극단 · 색상 |
| `flanker-random-43` | L2 랜덤 원 | L3 극단 · 과일 | 극단 · 과일 |
| `flanker-5circle-46` | L3 극단 원 | L3 극단 · 동물 | 극단 · 동물 |
| `flanker-arrow-05` | L5 화살표 | L3 극단 · 음식 | 극단 · 음식 |
| `flanker-uniform-number-exp` | L1 숫자 | L3 극단 · 자연 | 극단 · 자연 |
| `flanker-random-number-exp` | L2 숫자 | L3 극단 · 탈 것 | 극단 · 탈 것 |
| `flanker-5circle-number-exp` | L3 숫자 | L3 극단 · 믹스 | 극단 · 믹스 |
| `flanker-extreme-arrow-hard-skeleton` | L5 화살표 | L3 극단 화살표 | 극단 · 화살표 · 어려움 |
| 테마 skeleton + `flanker-theme-06` | 다수 L6 | 전부 L2 랜덤 자극 | 랜덤 자극 · 테마 |

**현재 Hub 제목은 최종 엔진과 대체로 맞다.** 문제는 (1) **같은 preset ID로 과거 세션/즐겨찾기가 다른 규칙의 게임을 실행**할 수 있음 (2) `description`/`settingChips`가 옛 규칙 (3) `PRESET_FAMILY_MAP`이 **옛 family**를 유지 (`flanker-uniform-07` → `flanker-uniform`, 런타임은 화살표).

숫자 플랭커·동심원 플랭커는 **공개 72에 런타임으로 존재하지 않는다.**

Recommended Next Action: **NEW PRESET 권장 + 기존 ID HOLD**. 동일 ID 재사용 금지.

### 2) `stroop-arrow-reverse-08` — FAIL P0 (재검증 완료)

처음부터 다시 추적:

- Public: `stroop` 그룹 1번.
- 최종 제목: `색상화살표 · 보통 (기본)`.
- engine: **`mode: 'basic', level: 1`, `spatialArrowColorMode: 'color'`, `spatialArrowColorMapping: 'compass'`**. `mode: 'stroop'`가 아님.
- Session → EngineRouter MemoryGameApp `initialMode=basic` `initialLevel=1`.
- `generateSignal('basic', 1)` 색상 모드: 중앙 화살표, 방향별 고정 채움(위빨·좌초·우노·하파), **음성 과제 없음**.
- `stroop` L1 `pickArrowStroop`와 다름 (그쪽은 매 신호 랜덤 채움 + 방향/색 말하기 ± 역전).

즉 **스트룹이 아니라 반응인지 색상 화살표와 동일 루트**다.

TRUE DUPLICATE: `reaction-cognition-space-direction-color-01b`.

Family는 여전히 `stroop-arrow`. Display `displayModeId`는 **programGroup=stroop**라 카드 축이 스트룹으로 보일 수 있다.

### 3) `stroop-word-reverse-48` vs `stroop-arrow-bg-47` — FAIL P0 (동일 SIGNAL)

- `stroop-arrow-bg-47`: `stroop` **L2**. 제목은 이미 `단어 · 보통 (의미/잉크 전환)`.
- `stroop-word-reverse-48`: `stroop` **L3**. 제목 `단어 · 보통+`.
- `signals.ts`: `if (level === 2 || level === 3)` **동일 분기**. 차이점은 `stroopWordDifficulty === 'bg'`인데 **프리셋/EngineRouter가 이 옵션을 전달하지 않음** (MemoryGameApp 기본 `'basic'`).
- 따라서 L2와 L3는 **의미/잉크 ± 역전, 검정 배경, 음성 정답**이 같다.

### 4) Simon 카모플라쥬 2개 — FAIL / WARN

`EngineRouter`와 `MemoryGameApp` 모두 `simon && level === 4`에서 **`placementMode="variant"` 하드코딩**. `camouflagePlacement`는 Session이 넘기지만 Player가 읽지 않는다.

- `simon-camouflage-center-skeleton`: 설명은 중앙, 실행은 극단. **FAIL P0** (옵션 미전달 + 보통/어려움 구분 붕괴).
- `visual-reaction-blackout-37`: 극단 설명과 실행은 맞음. ID·옛 시지각 잔존. cue 5초 vs 2초. **WARN P1**.

세션 난이도 `getSpomoveDifficultyKind`는 **모든 simon에 `simonPole`**을 걸어 `simonPoleCount`를 덮을 수 있다. 카모는 L4라 생성기의 poleCount 2가 아니라 **Camouflage concurrent**로만 2개가 된다. 카탈로그 “어려움” ID(`blackout-37`)의 기본 `simonPoleCount`는 1이다.

### 5) 음성·교사 진행 프로그램 vs SPOMOVE 정의

화면 → 선택 → **실제 움직임**과 충돌하는 Public 항목:

| ID | MOVE (런타임) | 판정 |
|----|----------------|------|
| `stroop-arrow-bg-47` / `stroop-word-reverse-48` / `stroop-word-bg-49` | 말로 색/의미 답, 교사 확인. 패드 이동 강제 없음 | WARN (제품이 음성 스트룹을 공개한 상태) |
| `sequential-memory-color-number-exp` | 10개 부호화 후 Space로 Q&A. 엔진이 패드 재현을 받지 않음 | **FAIL P0** |

### 6) Family 오분류 (고치지는 않음)

- 손·발 3종: runtime `basic` L7 + `handFootDifficulty`. Family **`visual-flow`**.
- Flanker remapped ID: Family가 옛 메커니즘.
- `stroop-arrow-reverse-08`: Family `stroop-arrow`, runtime basic 화살표.

### 7) CMS / Asset

- Public Hub는 `think_asset_packs` (`SPOMOVE_CONTENT_PACK_ID`, thumbnail pack, guide video pack)를 런타임 fetch.
- 레포 파일 `SPOMOVE_EDITORIAL_PILOT_CONTENT`는 **7개 ID 시드**이며 주석상 **Public fallback이 아님** (Admin apply 전용).
- Pilot 7: `reaction-cognition-space-direction-01`, `visual-reaction-flash-33`, `simon-pole-arrows-41`, `flanker-uniform-07`(현 화살표 L5와 정합), `stroop-arrow-bg-47`(단어 L2와 정합), `sequential-memory-3color-09`, `dive-standard`.
- 라이브 override가 옛 규칙이면 **WARN/FAIL**. 미조회이므로 전 ID CMS=`VERIFY`.
- 가이드 영상 맵·썸네일 맵도 팩 JSON. 로컬에는 DIVE 포즈 PNG, 손·발 아이콘, 레거시 spokedu 에셋만 확인. 카드 썸네일 **ASSET VERIFY REQUIRED**.

### 8) Session / 재실행

- 북마크·수업 프로그램은 **`spomove_preset_id`만** 저장 (`spokedu_master_session_programs`).
- 엔진이 ID lookup으로 다시 해석되므로 **ID 의미 변경 = 과거 세션이 다른 게임**.
- `officialPresetSessionHref`는 `preset`+`rounds`+operation query. 엔진 mode/level은 URL에 없음.
- `autostart`는 public href에서 끈다. `entry=start|settings`.
- 같은 설정 재실행: `canReproduceSpomoveSameSettings` + operation snapshot v2. **presetId 불일치 시 재현 불가**.

---

## P0 — 즉시 검토 (실행 의미)

1. **`stroop-arrow-reverse-08`**: 스트룹 그룹에서 basic 색상화살표 실행. 공개 반응인지 색상화살표와 실질 중복.
2. **`stroop-word-reverse-48`**: L3가 L2와 동일 시그널. “보통+”가 코드에 없음.
3. **`simon-camouflage-center-skeleton`**: center 옵션 무시, 매직아이와 메커니즘 충돌.
4. **`sequential-memory-color-number-exp`**: 순차 패드 재현이 아니라 교사 Q&A.
5. **Flanker 17개 중 ID 재사용 세트**: 현재 제목은 맞을 수 있으나 **과거 세션이 다른 플랭커를 실행**. (표에서는 해당 행 Backward Compatibility=YES)

## P1 — 다음 단계 정합성

- Family 재매핑 (플랭커 remapped, 손·발, 가짜 스트룹).
- Flanker/Stroop/Simon **원본 description vs canonical 제목**.
- `camouflagePlacement` 미사용.
- CMS 라이브 vs runtime (특히 remapped ID, 스트룹 1번).
- 전 simon에 `simonPole` 난이도 오버레이 → 카탈로그 보통/어려움 이중 채널.
- Operation interval은 MemoryGameApp 경로만. reactTrain/spatial 일부는 미전달.
- `cueSeconds` vs spatial L1/L2 실제 1–2.5초 랜덤 (`MemoryGame`이 speedSec를 무시).

## P2 — 네이밍·표현 (별도 한글 네이밍 작업 유지)

- 시지각 “파도 피하기” vs 색 파동 패드 반응.
- 손·발을 시지각 그룹에 둔 제품 표현 vs basic L7.
- 스트룹 음성 3종의 움직임 레이어 카피.
- 전면단일·2분할 제목 불균일.

---

## Root Mechanic 묶음 (테마 7종은 반복 분석하지 않음)

| Root | Public IDs | 런타임 |
|------|------------|--------|
| RC 공간방향 | `…-01`, `…-01b` (+ FAIL 스트룹 08과 동일 루트 01b) | basic L1 중앙 화살표 |
| RC 4분할 | quad-color/fruit + l2-*-exp | basic L2 think_quad + theme slides |
| RC 전면단일 | full-* + l3-*-exp | basic L3 full_color |
| RC 2분할 | split-color + l4-*-exp | basic L4 좌우 패널 |
| Flanker 화살표 | uniform-07, arrow-udlr-exp | L5 lr / udlr |
| Flanker 랜덤 테마 | 7 IDs | L2 5원, 가운데 색 |
| Flanker 극단 테마 | 7 IDs | L3 크기 극단 5원 |
| Flanker 극단 화살표 | extreme-arrow-hard | L3 extremeMode=arrow |
| Simon 도형/화살표/테마 | pole + hard | L1 색, L2 방향, L3 이미지색; poleCount 1/2 |
| Simon 풍선 | balloon + hard | VisualReaction balloonSimon concurrent 1/2 |
| Simon 카모 | 2 IDs | Camouflage variant (둘 다) |

테마 variant 검사: `variantColorTheme`는 Session → EngineRouter → MemoryGameApp `fruitSlides`로 전달. `color` 테마는 이미지 없이 팔레트. mix/simon L3는 all-variant slides. **특정 Public variant만 예외 분기하는 코드는 확인되지 않음** (에셋 로드 실패 시 시그널 null 가능 → VERIFY 운영).

---

## 중복 분류

### TRUE DUPLICATE

1. `stroop-arrow-reverse-08` ≡ `reaction-cognition-space-direction-color-01b` (SIGNAL/SELECT/MOVE).
2. `stroop-word-reverse-48` ≡ `stroop-arrow-bg-47` (동일 stroop L2/L3 분기).
3. `simon-camouflage-center-skeleton` ≈ `visual-reaction-blackout-37` (동일 Player·placement; cue 2s vs 5s만 다름 → 거의 중복).

### VARIANT (같은 SELECT, 테마·난이도·동시 개수만)

- RC 테마 7종 × 레이아웃.
- Flanker 랜덤 7 / 극단 7.
- Simon 보통 vs `*-hard-skeleton` (`simonPoleCount` 2 / balloon concurrent 2).
- 두더지 classic vs variant; 골키퍼 tier 1 vs 2.
- 순차 기억 3색/5색/램프.

### DISTINCT (소재 같아도 SELECT 다름)

- 반응인지 화살표(방향=답) vs Simon 화살표(위치 무시, 방향=답, 극단 배치) vs Flanker 화살표(가운데만) vs (미공개) stroop 화살표 말하기.

---

## 72행 매트릭스

전체 행: `docs/SPOMOVE_PUBLIC_72_AUDIT.csv`

아래는 FAIL/VERIFY와 핵심 WARN만.

| Public ID | Status | Risk | 한 줄 |
|-----------|--------|------|--------|
| stroop-arrow-reverse-08 | FAIL | P0 | basic 색상화살표. 스트룹 아님. 01b와 중복 |
| stroop-word-reverse-48 | FAIL | P0 | L3=L2 동일 시그널 |
| simon-camouflage-center-skeleton | FAIL | P0 | center 미적용, 매직아이와 충돌 |
| sequential-memory-color-number-exp | FAIL | P0 | 퀴즈/Space. 패드 순차 재현 없음 |
| sequential-memory-full-reveal-54 | VERIFY | P1 | 제시 후 Space 공개. 패드 채점 여부 코드만으로 불확실 |
| stroop-arrow-bg-47 | WARN | P1 | 런타임은 단어 스트룹. ID는 arrow-bg. 음성 MOVE |
| stroop-word-bg-49 | WARN | P1 | L4 배경간섭, 잉크 말하기 |
| visual-reaction-blackout-37 | WARN | P1 | 카모 극단 OK. ID 잔존. 센터 프리셋과 충돌 |
| flanker remapped 다수 | WARN | P1 | 제목=현행, 설명/Family/세션이력=구 게임 |
| hand-foot-* | WARN | P1 | basic L7인데 Family visual-flow |
| visual-reaction-rush-39 | WARN | P2 | 파도 피하기 카피 vs 색 세그먼트 패드 |

---

## Recommended Next Action (수정 금지 · 제안만)

- NEW PRESET: 진짜 스트룹 화살표, 동심원/숫자 플랭커(필요 시), 카모 중앙, 순차 퀴즈를 기억과 분리.
- 기존 ID HOLD: `stroop-arrow-reverse-08`, remapped flanker 숫자/동심원 ID, `simon-camouflage-center-skeleton`.
- Metadata only: Flanker description/chips를 canonical 엔진에 맞춤; Simon 주석(L1 화살표라고 적힌 `createSimonSignalGenerator` 주석은 **코드와 반대**, 실제 L1=도형색 L2=화살표).
- Family 재분류: 손·발, remapped flanker, 가짜 스트룹.
- 가이드 재촬영 후보: 스트룹 1번, remapped 플랭커, 카모 중앙, 색-번호 퀴즈.
- 음성 스트룹 3종: 제품 정의를 움직임을 포함할지 **PO 결정** 후 카피/Family.

---

## 코드 변경

0건. DB/CMS/프리셋/카탈로그 변경 0건.

HOLD 목록: `docs/SPOMOVE_HOLD_INVENTORY.md`
