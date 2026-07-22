# SPOMOVE 5축 운영 레이어 — 구현 계약 SSOT (최종 동결)

상태: **O1~O4 최종 구현 SSOT 동결**  
구현 진행: **O1 Foundation 코드 반영됨** · Physical Contract **미승인(초안)** · O2 착수 금지  
범위: **5축 Operation Layer만.** Phase 0 QA·Catalog Commit 게이트를 대체하지 않음.

---

## 0. 한 줄

아키텍처·O1~O4·저장 분리·Engine 경계 **확정**.  
아래 4건(legacy 표기·Snapshot union·O1 Preference 모듈·Contract **승인** 게이트) 반영 후 **동결**.

---

## 1. 확정 아키텍처

| 계층 | 담당 |
| --- | --- |
| Movement | 접촉·착지·지지·자세 완성 (`MovementCompletionBehavior`) |
| Operation | 출발·복귀·왕복·다음 자극 (`startZone` + `timing`) |

- Family = 허용 · Preset = 공식 대표 (Patch)  
- Engine ← timing만  
- Hub 카드 증가 없음 · Variant = Class Set · Shuttle 후순위  
- `declaredOperation` vs `effectiveOperation` (capability sanitize)  
- Preference에는 sanitize 결과 저장 금지  

### 시간 SSOT
| pattern | 시간 |
| --- | --- |
| continuous / responseWindow | `effectiveCueSeconds` |
| interval | cue + work/rest/sets |
| shuttle | 별도 Lifecycle (범위 외) |
| sequence / builtIn | Engine 내부 |

---

## 2. 저장 · 상태 타입 (동결)

### Preference (Patch) — Preset별 사용자 선택

```ts
type PresetConfigPreferenceV1 = {
  schemaVersion: 1;
  presetId: string;
  movement?: MovementPick;
  operationPatch?: ActivityOperationPatch;
  cueSeconds?: number;
  difficultyValue?: string;
};
```

키: `spokedu-master.spomove.preference.preset.{presetId}`

### Session Snapshot V2 (Full) — Recent 재현 · discriminated union

```ts
type OperationResolutionStatus =
  | 'ready'
  | 'legacyDisabled'
  | 'sanitized'
  | 'fallback';

type SpomoveSessionSnapshotV2 =
  | {
      schemaVersion: 2;
      presetId: string;
      movement: MovementPick | null;
      operationLayerStatus: 'legacyDisabled';
      operation?: never;
      cueSeconds: number;
      difficultyKind?: string;
      difficultyValue?: string;
    }
  | {
      schemaVersion: 2;
      presetId: string;
      movement: MovementPick | null;
      operationLayerStatus: 'ready' | 'sanitized' | 'fallback';
      operation: ActivityOperationConfig;
      cueSeconds: number;
      difficultyKind?: string;
      difficultyValue?: string;
    };
```

- **`'legacy'` 표기 금지** — 전부 `'legacyDisabled'`.  
- legacyDisabled ⇒ Operation 없음 · ready/sanitized/fallback ⇒ Operation 필수.

### legacyFixed Sentinel

```ts
exposure: 'legacyDisabled'
```

Settings Operation UI / Start Operation 요약 / Operation Query / Preference Operation 저장 / Engine Operation **전부 금지**.

---

## 3. Physical Contract (O2 게이트)

문서: `docs/SPOMOVE_MOVEMENT_PHYSICAL_CONTRACT.md`

**포함:** 목표 색 접촉 · 발·손 착지/지지 · 동작 완료 · 매트 위/밖 사용 · 필요 공간 · 안전 · minimumCue / impact / jumpFree  
**제외:** 복귀 (Operation: startZone + timing)

**게이트:** 링크만 있음 ≠ 통과. **내용 승인된 확정본**이어야 O2 착수.

---

## 4. 기타 동결 규칙

- `ActivityOperationPatch` + `mergeOperationConfig`  
- `themedFullResponse` — `reaction-full`만  
- Profile: `immediateResponse` | `choiceControl` | `builtIn` | `legacyFixed`  
- Constraint + 축 단위 sanitize  
- sequence → sequential-memory · DIVE → builtIn  
- Query: `opv=1` + canonical write  
- `ResolvedMatGuidance` (required 명칭 폐기)  
- O3: interval capability **false** · O4: true  
- 전면 6 Seed ID (Core/Exp 표)

| Theme | Preset ID |
| --- | --- |
| color | `reaction-cognition-full-color-03` |
| fruit | `reaction-cognition-l3-fruit-exp` |
| animal | `reaction-cognition-full-animal-18` |
| nature | `reaction-cognition-full-nature-19` |
| food | `reaction-cognition-l3-food-exp` |
| vehicle | `reaction-cognition-l3-vehicle-exp` |

---

## 5. 커밋 계약 (동결)

### O1 Foundation
- types · Patch · merge · Profile 3+legacyFixed · constraints · sanitize  
- Family `operationProfileId` 필수  
- Snapshot union · Query opv 타입 · MatGuidance · ResolutionStatus  
- **`operations/presetConfigPreferenceStorage.ts`**  
  - `preferenceStorageKey` / `read` / `write` / `remove`  
  - Session **미연결** · 단위 테스트만  
- Legacy start 변환 · Class Set Item 타입만  
- Library/Engine props 불변 테스트  

### O2 전면 6 Seed
- **Physical Contract 승인본** 링크 필수  
- themedFullResponse · 5종 registry · 6 Preset recommended  
- Preference **키 독립성** 테스트 (과일 ≠ 색상) — O1 저장 모듈 사용  
- Operation UI 비노출 가능 · declared interval 가능  

### O3 Compact Settings · Recent · Query
- Preference Patch Session 연결 · Snapshot V2 · Query ser/de  
- legacyDisabled UI/Query/Preference 제외  
- MatGuidance · interval capability false  
- unsupported interval sanitize → Preference 미저장 테스트  

### O4 Interval
- AutoLaunch work/rest/sets + resume/exit 보존  
- EngineRouter · capability true · continuous 무회귀  
- shuttle 없음  

---

## 6. 착수 순서 (동결)

```
O1 Foundation ─────────┐
                       ├─→ O2 전면 6 Seed → O3 → O4
Physical Contract 승인 ┘
```

- O1과 Contract **작성·승인**은 **병렬 가능**  
- O2 = **O1 완료 ∧ Contract 승인** 둘 다  
- “초안” 또는 “파일만 존재”로는 O2 불가  

이후: 현장 검증 → 투게더 Class Set → Shuttle 단일 Preset  
Phase 0 / Catalog 게이트는 **별도 문서**.

---

## 7. 동결 체크 (이번 라운드 4건)

1. `'legacy'` 삭제 → `'legacyDisabled'`만  
2. Snapshot = discriminated union (legacy: no op / else: op required)  
3. O1에 Preference 저장 모듈 · O2 독립성 테스트 · Session 연결은 O3  
4. Contract **승인된 확정본** · O1∥Contract → 둘 다 후 O2  

**추가 반박 없음. 이 문서를 O1~O4 SSOT로 동결한다.**
