# Play Studio 코드 및 구조 정리

Play Phase 관련 코드·데이터 흐름·역할을 한곳에 정리한 문서입니다. 개선 시 이 구조를 기준으로 수정 범위를 잡을 수 있습니다.

---

## 1. 개요

| 구분 | 설명 |
|------|------|
| **Play Studio** | Admin에서 Play 구간을 테스트/검증하는 페이지. 현재는 “엔진 테스트” 용도. |
| **Play Asset** | 주차별 BGM + 20슬롯 이미지(5 action × set1/set2 off·on) 업로드·관리. |
| **Play 엔진** | `PlayDraft` + `AssetIndex` → `compile` → `buildTimeline` → tick 기반 `PlayTimeline`. |
| **구독자 재생** | `weekKey` → `play_asset_packs` 조회 → `AssetIndex` 생성 → `RuntimePlayer` + BGM(think150Audio). |

---

## 2. 디렉터리/파일 맵

### 2.1 Admin — 라우트·UI

| 경로 | 역할 |
|------|------|
| `app/admin/iiwarmup/play/page.tsx` | **Play Studio 페이지**. 제목 + `PlayTestContent`(mock draft, mockAssetIndex, 디버그). |
| `app/admin/iiwarmup/page.tsx` | IIWarmup Admin 메인. “Play Studio” 링크 등. |
| `app/admin/iiwarmup/assets/page.tsx` | **Asset Hub**. 탭(Think / Play / Flow). Play 탭에서 `PlayAssetPanel` 사용. |

### 2.2 Admin — Play Asset (에셋 관리)

| 경로 | 역할 |
|------|------|
| `app/components/admin/assets/PlayAssetPanel.tsx` | 주차(year, month, week) 받아 `PlayBgmUploader` + `PlayImageGridUploader` 렌더. |
| `app/components/admin/assets/PlayBgmUploader.tsx` | BGM 업로드/삭제/미리듣기(선택). |
| `app/components/admin/assets/PlayImageGridUploader.tsx` | 20슬롯 그리드. `PLAY_SLOT_KEYS` 기준 라벨·업로드/삭제. |
| `app/lib/admin/hooks/usePlayAssetPack.ts` | `play_asset_packs` 조회/저장. `bgm_path`, `images_json`(20키). 10키→20키 호환. |
| `app/lib/admin/assets/storagePaths.ts` | `PlaySlotKey`, `PLAY_SLOT_KEYS`, `playAssetPath()`, `playAssetBgmPath()`, `generateWeekKey()`. |

### 2.3 Play 엔진 (핵심 파이프라인)

| 경로 | 역할 |
|------|------|
| `app/lib/engine/play/index.ts` | public API: `compile`, `buildTimeline`, presets, types export. |
| `app/lib/engine/play/types.ts` | `MotionAssets`, `AssetIndex`, `ResolvedBlock`, `ResolvedPlayDraft`, `PlayTimeline`, `VisualEvent`, `AudioEvent` 등. |
| `app/lib/engine/play/compiler.ts` | `PlayDraft` + `AssetIndex` → `ResolvedPlayDraft`. motion별 set1/set2 off·on 반영. |
| `app/lib/engine/play/timeline.ts` | `ResolvedPlayDraft` → `PlayTimeline`. EXPLAIN / set1 / set2 / TRANSITION tick 생성, BGM_START·BGM_STOP·SFX. |
| `app/lib/engine/play/buildPlayAssetIndex.ts` | `play_asset_packs` 조회 결과(20슬롯 + BGM) → `AssetIndex` 생성. |
| `app/lib/engine/play/presets.ts` | `MOTION_IDS`, `MOTION_LABELS`, motion별 허용 operator 패턴. |
| `app/lib/engine/play/mockAssetIndex.ts` | 테스트용 `AssetIndex` (picsum 등). |

### 2.4 규칙·스키마

| 경로 | 역할 |
|------|------|
| `app/lib/constants/rules.ts` | `PLAY_RULES`: `TICK_MS`, `TICKS.EXPLAIN/SET/TRANSITION/BLOCKS`. |
| `app/lib/constants/schemas.ts` | `PlayBlockSchema`, `PlayDraftSchema` (blocks length=5). |

### 2.5 런타임 재생 (공통)

| 경로 | 역할 |
|------|------|
| `app/components/runtime/RuntimePlayer.tsx` | `tMs` 상태, 재생 루프, `onAudioEvent` 디스패치, `PlayRenderer` 호출. |
| `app/components/runtime/PlayRenderer.tsx` | tick별 `VisualEvent` 렌더 (EXPLAIN, BINARY, REVEAL_WIPE, DROP, TRANSITION). |
| `app/components/runtime/PlayTestDebugOverlay.tsx` | 디버그용 tick/phase 표시. |

### 2.6 Admin 테스트 vs 구독자 재생

| 경로 | 역할 |
|------|------|
| `app/components/play-test/PlayTestContent.tsx` | **Admin Play Studio용**. `DEFAULT_DRAFT` + `mockAssetIndex` → compile → buildTimeline → `RuntimePlayer` (디버그 on). |
| `app/components/subscriber/PlayRuntimeWrapper.tsx` | **구독자용**. `weekKey` → `usePlayAssetPack` → `buildPlayAssetIndex` → compile → buildTimeline → `RuntimePlayer` + `onAudioEvent`(think150Audio startBGM/stopBGM). |

### 2.7 구독자 진입점

| 경로 | 역할 |
|------|------|
| `app/iiwarmup/page.tsx` | 구독자 IIWarmup. WeekSelector → `weekKey` → FullSequencePlayer. |
| `app/components/subscriber/FullSequencePlayer.tsx` | phase별 렌더. Play 시 `renderPlay({ weekKey, onEnd })` → `PlayRuntimeWrapper`. |

### 2.8 기타(참고용, 현재 미연결)

| 경로 | 역할 |
|------|------|
| `app/lib/admin/logic/generatePlayTimeline.ts` | **고수준** PlayBlock[] 생성 (intro → explain+set×5 → outro). 125초 규칙. **엔진 timeline.ts와 별개** — 엔진에는 intro/outro 없음. |
| `docs/CREATOR_STUDIO_*.tsx|.md` | 예전 Creator Studio/PlayStudio 설계·참고용. |

---

## 3. 데이터 흐름 요약

### 3.1 Admin — Play Studio(테스트) 페이지

```
PlayStudioPage (app/admin/iiwarmup/play/page.tsx)
  → PlayTestContent
      → DEFAULT_DRAFT (고정 5블록) + mockAssetIndex
      → compile → buildTimeline → PlayTimeline
      → RuntimePlayer(timeline, debug, onAudioEvent 로그)
```

- Draft/에셋 선택 UI 없음. “엔진 동작 검증” 용도.

### 3.2 Admin — Play Asset 업로드

```
AssetHub (Play 탭) → PlayAssetPanel(year, month, week)
  → usePlayAssetPack(year, month, week)
      → play_asset_packs (week_key) 조회: bgm_path, images_json(20키)
      → 업로드: /api/admin/storage/upload (서버 경유 → RLS 통과)
  → PlayBgmUploader, PlayImageGridUploader(20슬롯)
```

### 3.3 구독자 — Play 재생

```
iiwarmup 페이지 → WeekSelector → weekKey
  → FullSequencePlayer(mode=play) → renderPlay({ weekKey, onEnd })
      → PlayRuntimeWrapper(weekKey, onEnd)
          → parseWeekKey(weekKey) → usePlayAssetPack(year, month, week)
          → buildPlayAssetIndex(images, getImageUrl, bgmPath) → AssetIndex
          → DEFAULT_DRAFT + assetIndex + seed → compile → buildTimeline → timeline
          → RuntimePlayer(timeline, autoPlay, onAudioEvent)
          → onAudioEvent: BGM_START → think150Audio.startBGM, BGM_STOP → stopBGM
```

- Draft는 현재 **고정** `DEFAULT_DRAFT`. 주차별 draft 저장/불러오기는 없음.
- `weekKey` 출처: WeekSelector → state(year, month, week) → `generateWeekKey()`.

---

## 4. 타임라인 규칙 (엔진)

- **규칙**: `app/lib/constants/rules.ts`  
  - `TICK_MS = 500`, `TICKS = { EXPLAIN: 5, SET: 20, TRANSITION: 5, BLOCKS: 5 }`.
- **블록 1개**: EXPLAIN 5 tick → set1 20 tick → set2 20 tick → TRANSITION 5 tick.
- **전체**: 5블록 → 총 5×(5+20+20+5) = 250 tick (125초).
- **오디오**: BGM_START(tick 0), BGM_STOP(마지막 tick), SFX는 action phase tick에서만.
- **비고**: intro/outro는 `generatePlayTimeline.ts`에만 있고, 엔진 `timeline.ts`에는 없음.

---

## 5. 20슬롯 구조

- **PlaySlotKey**: `a1_set1_off`, `a1_set1_on`, `a1_set2_off`, `a1_set2_on`, … `a5_set2_on` (20개).
- **Draft 블록 순서**: say_hi, walk, throw, clap, punch → 각각 a1~a5에 대응.
- **AssetIndex**: motion별 `set1: { off, on }`, `set2: { off, on }` 있으면 컴파일러가 set1/set2에 각각 매핑.
- **DB**: `play_asset_packs.images_json`에 20키 저장. 기존 10키 데이터는 `usePlayAssetPack`에서 20키로 읽을 때 자동 보정.

---

## 6. 개선 시 참고 포인트

1. **Play Studio 페이지**  
   - 현재: 테스트 전용(mock draft + mockAssetIndex).  
   - 개선 시: 액션 5개 선택 UI, 선택 결과로 draft 생성, 필요 시 주차별 draft 저장/불러오기.

2. **Draft 출처**  
   - 구독자: `PlayRuntimeWrapper` 내부 `DEFAULT_DRAFT` 고정.  
   - 주차별/시나리오별 draft를 쓰려면 draft 저장소(테이블/API)와 조회 로직 추가 필요.

3. **타임라인 규칙**  
   - intro/outro를 실제 재생에 넣으려면 `rules.TICKS` 확장 + `timeline.ts`에서 앞뒤 구간 생성 필요.
   - EXPLAIN/TRANSITION 구간 UI는 `PlayRenderer.tsx`에서 이벤트 종류별 분기.

4. **에셋**  
   - Play Asset은 20슬롯 + BGM만 담당. 배경/테마 등은 엔진 `AssetIndex.background` 등과 연동 시 별도 경로 필요.

5. **BGM**  
   - 구독자: think150Audio `startBGM`/`stopBGM` 사용(Think와 동일). Admin Play Studio 테스트 화면에서는 `onAudioEvent` 로그만 있음.

---

## 7. 한눈에 보는 파일 의존 관계

```
[Admin]
  play/page.tsx → PlayTestContent → compile, buildTimeline, RuntimePlayer (mock)
  assets/page.tsx → PlayAssetPanel → usePlayAssetPack, PlayBgmUploader, PlayImageGridUploader

[엔진]
  compile(draft, assetIndex, seed) → ResolvedPlayDraft
  buildTimeline(resolved) → PlayTimeline
  buildPlayAssetIndex(images, getImageUrl, bgmPath) → AssetIndex

[구독자]
  iiwarmup/page → FullSequencePlayer → PlayRuntimeWrapper(weekKey)
  PlayRuntimeWrapper → usePlayAssetPack, buildPlayAssetIndex, compile, buildTimeline, RuntimePlayer, think150Audio
```

이 문서는 Play Studio 관련 코드와 구조를 한곳에 모은 정리본이며, 개선 시 수정 대상과 데이터 흐름을 찾는 데 사용할 수 있습니다.
