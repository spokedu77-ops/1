# I.I.Warm-up Asset Hub — 최종 구현 계획 (보강 체크리스트 반영)

## 전체 목표

Asset Hub 리팩토링(Theme Manager / Play / Think 분리) 이후에도 **운영 P0 버그(포맷/참조/삭제/검증/정합성)** 를 방지하고, 보강 체크리스트 5개를 구현해 **운영 가능한 수준**의 신뢰성을 확보한다.

---

## 0) 전제(고정 규칙)

- **physics.ts**의 `ACTION_KEYS`와 타입은 **절대 수정 금지**.
- **play_scenarios** 테이블을 Source로 사용:
  - `asset_pack`: `scenario_json = { theme, assets: { actions: Record<ActionKey, {...slots}> } }`
  - `think_asset_pack`: `scenario_json = { name, theme_ref, assets: { think: { objects: { red, blue, yellow, green } } } }`
- UI **다크 모드(slate-900 계열)** 유지.
- Storage path는 **storagePaths.ts** 유틸만 사용, **임의 경로 하드코딩 금지**.

---

## 1) ThemeId 정책 확정 + Scheduler/Generator 연동 (가장 중요)

### 1.1 정책(고정)

- **Asset Pack ID(themeId)는 “버전 기반”만 허용:** `generateThemeId(theme, version)` → 예: `kitchen_v1`.
- **`generateWeekBasedThemeId(yyyy, mm, w, theme)`는 더 이상 asset_pack id로 쓰지 않는다.**  
  (레거시 호환을 위해 함수는 남겨둘 수 있으나, **신규 생성/조회 키로 사용 금지**)

### 1.2 Week(주차)와 ThemeId의 관계

- 주차는 테마를 “소유”하지 않고 **“테마를 참조”**한다.
- Scheduler는 **weekKey → themeId(버전 기반)** 매핑.

### 1.3 구현 지시

- **WeekSelector.tsx**는 유지. **AssetHubContainer / PlayAssetSection**은 **themeId**로 자산을 조회한다.
- **Theme Manager**에서 테마 선택 시:
  - **Play Editor:** `themeId = kitchen_v1`로 `asset_pack` 로드.
  - **Think Editor:** `thinkPackId = generateThinkPackId(themeId)`로 think pack 로드.
- **Scheduler/Generator**가 현재 주차 기반 id를 참조 중이면 아래 중 하나로 **반드시 정리**:
  - **권장 A:** `rotation_schedule`(또는 스케줄 테이블)에 **theme_id** 컬럼 추가/사용. (weekKey는 그대로, 값만 themeId 저장)
  - **대안 B:** `program_snapshot` 등에 themeId를 넣고, 렌더링 시 themeId로 asset_pack fetch.

### 1.4 DoD(완료 기준)

- 특정 주차(예: 2026-01-W1)에 `kitchen_v1`을 할당하면, **Creator Studio / Scheduler / Asset Hub** 모두 동일한 `kitchen_v1` 에셋을 바라본다.
- **더 이상 `2026-01-W1_kitchen` 같은 id로 asset_pack이 생성/조회되지 않는다.**

---

## 2) 업로드 중복 정책 확정 (Play=덮어쓰기 / Think=중복 방지)

### 2.1 정책(고정)

| 구분 | 정책 | 목적 | 경로 예시 |
|------|------|------|-----------|
| **Play(슬롯형)** | 경로 고정 + **덮어쓰기(upsert=true)** | 슬롯 업데이트 | `themes/{themeId}/actions/{ACTION}/{slot}.webp` |
| **Think(리스트형)** | 경로 유니크 + **중복 스킵(해시 기반)** | 오브젝트 카탈로그 확장 | `themes/{thinkPackId}/think/{color}/{slug}_{hash}.webp` |

- Think: 동일 파일(해시 동일) 업로드 시 → Storage 업로드는 스킵하거나, 업로드하더라도 **scenario_json에는 중복 path를 넣지 않는다.**

### 2.2 구현 지시

**usePlayAssets.ts**

- `uploadPlayAsset(themeId, actionKey, slot, file)`:
  1. WebP 변환(섹션 3 참고).
  2. `path = actionImagePath(themeId, actionKey, slot)`.
  3. `uploadToStorage(path, webpFile, 'image/webp')` with **upsert=true**.
  4. `asset_pack.scenario_json.assets.actions[actionKey][slot] = path` 후 upsert.

**useThinkAssets.ts**

- `uploadThinkObjects(playThemeId, color, files[])`:
  1. `thinkPackId = generateThinkPackId(playThemeId)`.
  2. `fileHash = calculateFileHash(originalFile)`.
  3. `slug = sanitize(file.name without ext)`.
  4. `path = thinkObjectPath(thinkPackId, color, \`${slug}_${hash}\`)`.
  5. 업로드 후 `objects[color]`에 추가. **Set으로 중복 제거**.
  6. upsert think_asset_pack.

### 2.3 DoD

- **Play:** 같은 슬롯에 새 파일 올리면 **항상 교체**된다.
- **Think:** 같은 파일(내용 동일) 여러 번 올리면 **리스트에 중복 추가되지 않는다.**

---

## 3) imageOptimizer “WebP 강제 통일” + slot 확장

### 3.1 문제 배경

- 현재는 원본 타입 유지 가능성이 있어 `.webp` 확장자 / content-type / 실제 파일 내용 불일치 위험이 있음.
- **모든 업로드는 최종적으로 진짜 WebP여야 한다.**

### 3.2 구현 지시

**imageOptimizer.ts**

- **variant/slot 타입 확장:**  
  `type Slot = 'off1'|'off2'|'on1'|'on2'` (필요 시 레거시 `'off'|'on'` 포함 가능).
- **optimizeToWebP(file, { maxW, maxH, quality }):**
  1. canvas resize.
  2. `canvas.toBlob('image/webp', quality)`로 **반드시 webp blob** 생성.
  3. 반환은 File로 만들되 **type='image/webp'**, 파일명도 **.webp**로 강제.
- **uploadToStorage** 호출 시 **contentType을 명시적으로 'image/webp'** 전달.

### 3.3 DoD(검증)

- 업로드 후 Storage publicUrl을 브라우저에서 열었을 때:
  - 네트워크 response header의 **content-type이 image/webp**.
  - 실제로 깨짐 없이 렌더링된다(특히 **iOS/Safari**에서도).
- **.png를 업로드해도 최종 저장은 .webp + content-type image/webp로 통일.**

---

## 4) Readiness 검증 배치화 (개별 HEAD 폭탄 금지)

### 4.1 정책

- validateStorage 모드에서 파일 검증을 **“path당 HEAD 요청”**으로 하지 않는다.
- 다음 둘 중 하나로 구현:
  - **권장 A (서버 배치 API):** `/api/admin/storage/exists`에서 path 배열을 받아 존재 여부를 **한 번에** 반환.
  - **대안 B (prefix list):** Storage list를 디렉터리별로 한 번(또는 소수) 호출해 존재 파일 Set을 만들고 비교.

### 4.2 권장 A 구현(강추)

- **API Route:** `POST /api/admin/storage/exists`
  - body: `{ paths: string[] }`
  - response: `{ exists: Record<string, boolean> }`
  - 서버에서 Supabase service role 또는 권한 있는 방식으로 Storage list/metadata 체크.
- **프론트 AssetReadinessIndicator:**
  - validateStorage=true 시 **해당 API 1회** 호출.
  - 로딩 상태(“검증 중…”) 표시.
  - 결과 반영하여 ready/missing 계산.

### 4.3 DoD

- **20 actions × 4 slots(80개)** 검증 시, **네트워크 요청이 80개가 아니라 1~3개 이내**로 끝난다.
- 로딩/실패 시 UI가 멈추지 않고, **“검증 실패(네트워크)”**를 명확히 안내한다.

---

## 5) 삭제 정책: Soft → Hard 2단계 + 삭제 대상 path 확정 + 실패 대비

### 5.1 정책(고정)

- **deleteTheme(themeId)**는 기본적으로 **Soft delete(is_active=false)** 만 수행한다.
- **Hard delete**는 별도 버튼(“영구 삭제”) + **2차 확인(문자 입력 등)** 후 수행.
- **Hard delete** 시:
  1. `checkAssetDeletion(themeId)`로 사용 중 여부 **하드 블록**.
  2. 삭제할 storage paths 목록을 **DB에서 먼저 추출**.
  3. **Storage delete 성공 후** DB delete.
  4. 중간 실패 시 UI에 **“부분 삭제/재시도 필요”**를 남긴다(로그 포함).

### 5.2 구현 지시

**useAssetManager.ts**

- **softDeleteTheme(themeId):**  
  `play_scenarios` row update: `is_active = false`.
- **hardDeleteTheme(themeId):**
  1. `await checkAssetDeletion(themeId)` (사용 중이면 throw).
  2. asset_pack row fetch → `scenario_json.assets.actions`에서 **모든 path 수집** (배경/BGM path 포함).
  3. **deleteFromStorage(paths[])** (storageClient에 **batch remove** 함수 추가 권장).
  4. `play_scenarios` row delete.
- **Think pack:** theme 삭제 시 thinkPackId도 함께 처리할지 정책 결정. 권장: theme 삭제 시 think pack도 함께 처리(단, think pack도 check 필요하면 추가).

**storageClient**

- **deleteFromStorage(paths: string[])** 또는 batch remove 함수 추가 권장. (한 번에 여러 path 삭제)

### 5.3 DoD

- 사용 중인 themeId는 **Hard delete가 항상 차단**되고, UI에 **“어디에서 사용 중인지”**가 표시된다.
- **Soft delete**는 즉시 반영되며 목록에서 숨기거나 “비활성” 상태로 표시된다.
- **Hard delete** 중 Storage 삭제 실패 시:
  - **DB 삭제가 먼저 일어나지 않으며**,
  - 사용자에게 **재시도 안내**가 남는다.

---

## 6) 추가 구현 메모 (권장 품질 기준)

### 6.1 공통 타입 정의(프론트 도메인 모델)

- 내부적으로 **Slot**을 명시 타입으로 고정:
  - `export type Slot = 'off1'|'off2'|'on1'|'on2';`
  - `export type PlayAssets = Record<ActionKey, Record<Slot, string>>;`
- DB 호환을 위해 `off`/`on`이 남아 있더라도 **UI/로직은 Slot만** 바라보게 강제.

### 6.2 React Query 키 설계(권장)

- `['asset_pack', themeId]`
- `['think_pack', thinkPackId]`
- `['asset_pack_list']`
- `['action_catalog']`

### 6.3 기타 보완(이전 계획에서 유지)

- **배경/BGM:** PlayAssetSection 하단에 Play/Think/Flow 배경 슬롯, BGM 업로드·선택. `backgroundPath`, `bgmPath` 사용.
- **Think 레이블:** `assets.think.objects.{color}: [{ path, label }, ...]` 스키마 및 UI(선택 구현).
- **테마 복제(Clone):** Storage 파일 복사(`copy()`) 후 DB upsert. `storageClient.copyInStorage` 추가.

---

## 7) 최종 Acceptance (전체 통합 테스트 시나리오)

1. **Theme Manager**에서 `kitchen_v1` 생성 → **PlayAssetSection**에서 4슬롯 업로드 → 프리뷰 정상.
2. **ThinkAssetSection**에서 `kitchen_v1` 입력 → red에 파일 3개 업로드 → **중복 파일 재업로드 시 개수 증가 없음**.
3. **Readiness** validateStorage=true → **요청 1~3개 이내**로 검증 완료.
4. **Scheduler**에서 2026-01-W1에 `kitchen_v1` 할당 → **Creator Studio**에서 해당 주차 선택 시 **kitchen_v1 에셋**으로 렌더.
5. **사용 중인 themeId** hard delete 시도 → **checkAssetDeletion**에 의해 차단 + 이유 표시.
6. **사용 안 하는 themeId** soft delete → 목록에서 비활성 처리.
7. **사용 안 하는 themeId** hard delete → **Storage → DB** 순서로 삭제, 중간 실패 시 **DB는 남고 재시도 가능**.

---

## 8) 구현 순서 제안

1. **0·1)** 전제 규칙 정리 + ThemeId 정책: ID는 버전 기반만, Scheduler/Generator 연동(theme_id 또는 snapshot themeId).
2. **WeekSelector.tsx** 유지, AssetHubContainer/PlayAssetSection은 **themeId** 기준 조회로 전환.
3. **3)** imageOptimizer: Slot 타입 확장, **optimizeToWebP** 강제 WebP 통일.
4. **storageClient:** upload 시 contentType 'image/webp', **deleteFromStorage(paths[])** batch 추가.
5. **2)** usePlayAssets / useThinkAssets: 업로드 정책(Play 덮어쓰기, Think 해시·중복 제거).
6. **4)** POST /api/admin/storage/exists 배치 API + AssetReadinessIndicator 연동.
7. **5)** useAssetManager: softDeleteTheme / hardDeleteTheme, checkAssetDeletion, path 수집 후 Storage → DB 삭제.
8. **AssetCard.tsx**, **PlayAssetSection**(배경/BGM 포함), **ThinkAssetSection**, **AssetHubContainer** 조합.
9. 테마 복제(Storage copy) 및 기존 AssetHub.tsx 정리.

이 문서는 **보강 체크리스트 구현 지시서**를 반영한 **최종 계획**이며, 위 DoD·Acceptance를 만족할 때 “운영 가능한 수준”으로 간주한다.
