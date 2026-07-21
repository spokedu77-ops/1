# SPOMOVE Phase 실행계약 (최종)

상태: **Phase 0 Closure 완료 대기 → Phase 1A Triage / Commit B 대기**  
이 문서는 **Audit·기술 수단**의 실행계약이다. 제품 성공 기준이 아니다.

**North Star (우선):** [`SPOMOVE_COMMERCIAL_PRODUCT_PLAN.md`](./SPOMOVE_COMMERCIAL_PRODUCT_PLAN.md)  
**1차 보고:** [`SPOMOVE_COMMERCIAL_V1_REPORT.md`](./SPOMOVE_COMMERCIAL_V1_REPORT.md)

- Phase 0 QA = **타임박스(반나절)** · 전략 토론 금지 · 승인 후만 다음.
- Audit CSV = 도구. **전체 Commit D 완료는 Phase 2A 진입 조건이 아니다.**
- Phase 2A 진입 = **Golden Family 3** C1/D1 승인 (+ Brief·공식 세트 3).
- 전체 Library C2/D2는 2A와 **병렬**. Golden Slice를 막지 않는다.

---

## 0. 엄격 순서 (개정)

```
1. Phase 0 자동 테스트 + 수동 QA 13 + 승인
        ↓
2. Commit B — 전체 자동 인벤토리 (generated.csv)
        ↓
3. Phase 1A / Commit C1 — 출시 후보·Golden 3·보류·축 공백 결정서
4. Commit D1 — 출시 후보(Golden) 검증
        ↓
5. Phase 1B — Golden Brief×10 · Hub카피 · Guide · 공식 세트 3
        ↓
6. Phase 2A — Golden Vertical Slice
   (Catalog · Resolver · 카드 · Theme/Stage · Start/Settings 연결
    · 최소 Guide · 공식 세트 3 · 최소 이벤트)
        ‖ 병렬
7. Commit C2 / D2 — 나머지 Library 전체 매핑·Canonical·Legacy
        ↓
8. Phase 2B — Launch Catalog 8~10
        ↓
9. Phase 3 → 4 → 5  (North Star 문서)
```

### 게이트 규칙

- 자동 테스트 PASS만으로 Phase 1 **불가**.
- QA 실패 수정 = **Phase 0 Closure만**. Seed·Slice와 커밋 분리.
- **전체 Human Decisions(C2) 완료를 기다리지 않고** 2A 진행 가능.
- Commit B / C1 / D1 / (C2/D2)를 한 커밋으로 합치지 않는다.
- Phase 2A에 **공식 수업세트 3개** 없으면 “준비 절감” 검증 실패로 간주.
---

## A. Phase 0 종료 증거

### A-1. 체크리스트 문서

경로: `docs/SPOMOVE_PHASE0_QA_CHECKLIST.md`

문서 상단 필수 메타:

| 필드 | 예시 |
| --- | --- |
| 실행일 | YYYY-MM-DD |
| 담당자 | |
| 커밋 SHA | |
| 배포 URL | |
| 환경 | local / staging / production |
| 브라우저 | |
| 기기·화면 크기 | |
| `test:spomove-phase0` 결과 | 7/48 PASS (일시·로그) |
| 발견 이슈 링크 | |
| 최종 판정 | Pass / Fail |

표 열: `# | 시나리오 | Pass 조건 | 결과 | 증빙`

### A-2. 13개 시나리오

| # | 시나리오 | Pass 조건 | 증빙 |
| --- | --- | --- | --- |
| 1 | Selectable · 시작 | Start 요약 → 명시 시작 → Running은 Engine only | URL·화면 캡처 |
| 2 | Selectable · 설정 | Compact 움직임·속도·난이도 → 명시 시작 | 화면 캡처 |
| 3 | sameSide / opposite | 안내 문구가 실제로 다름 | **두** 화면 캡처 |
| 4 | Fixed MQ1 | 움직임 선택 없음 · fixed 요약 유지 | 화면 캡처 |
| 5 | bodyCue MQ2~4 | 화면 손·발 안내 분기 유지 | 화면 캡처 |
| 6 | DIVE | diveBuiltIn · 움직임 행 없음 | 화면 캡처 |
| 7 | Recent | `같은 설정으로 시작` → `entry=start` (즉시 Running 금지) | URL 캡처 |
| 8 | Result 재실행 | `같은 설정으로 시작` → Start 확인 (즉시 Intro 금지) | URL·화면 캡처 |
| 9 | done Space | 완료 화면에서 Space로 재실행 안 됨 | 동작 메모·캡처 |
| 10 | Legacy URL | `?autostart=1`만 → 자동시작 / `?entry=start&autostart=1` → Start | URL 두 개 캡처 |
| 11 | 모바일 가이드 | 「가이드 보기」 항상 노출 · Sheet 열림 | **실기기 터치** 캡처 |
| 12 | Hub 헤더 | 「사전 설정된 공식 조건…」 없음 | 화면 캡처 |
| 13 | Projector | Fullscreen/Audio 차단 복구 UI 유지 | 화면 캡처 |

**#11 주의:** 데스크톱 폭만 줄인 반응형 확인으로 **대체하지 않는다**. 실제 터치 환경 필수.

### A-3. Phase 0 종료 승인 문구

13개 전부 Pass일 때만 체크리스트 하단에 기록:

> **Phase 0 종료 승인**  
> Public 즉시 실행, 과밀 Settings, 양산형 description 노출이 차단됐으며 Phase 1 Catalog Family 감사로 진입한다.

이 문구가 없으면 Commit B를 시작하지 않는다.

---

## B. Phase 1 — Catalog Family Audit 실행계약

### B-1. 목적

실행 가능한 모든 Preset을 분석해 다음을 결정한다.

- 어떤 Preset이 **고유 활동(Catalog Family)** 인지
- 어떤 Preset이 동일 활동의 **Theme · Stage · Variant** 인지

흐름:

```
Preset 분석 → Catalog 후보 분류 → 사람 검수
→ Canonical · Legacy 정책 확정 → Phase 2 구현 명세
```

### B-2. Phase 1 비범위 (전부 금지)

- `SpomoveHubView.tsx` 수정
- Session · Start · Settings 수정
- Catalog Family 운영 타입 신설
- Family 카드 렌더링 · 테마 선택 UI · 직접 카피 노출
- Preset 삭제 · Preset ID 변경 · Expansion 삭제
- Activity Family · Movement Profile · Resolver · Engine 변경
- 썸네일 · 가이드 자산 변경

Phase 1 = **감사와 판정**만. Hub/상품 코드 구현은 Phase 2.

### B-3. 커밋 구조 (분리 유지)

| 커밋 | 이름 | 내용 |
| --- | --- | --- |
| **B** | Audit Seed | 전체 자동 인벤토리 + Signature + 감사 원칙 문서 |
| **C1** | Golden Human Decisions | 출시 후보·Golden 3 판정 |
| **D1** | Golden Verification | Golden 3 승인 → **Phase 2A 허용** |
| **C2** | Full Library Decisions | 나머지 전체 Preset 판정 (2A와 병렬 가능) |
| **D2** | Full Verification | 전체 Library 승인 → **Phase 2B 조건** |

---

## C. Commit B — Audit Seed (Phase 0 종료 후에만)

### C-1. 산출물

```
docs/
├─ SPOMOVE_PHASE0_QA_CHECKLIST.md   # 종료 증거 (이미 Pass·승인 기록)
├─ SPOMOVE_FAMILY_AUDIT.md          # 감사 원칙·판정 문법·Batch
└─ spomove-family-audit.generated.csv

scripts/
├─ generate-spomove-family-audit.ts
└─ verify-spomove-family-audit.ts

package.json
  "audit:spomove-family": "tsx scripts/generate-spomove-family-audit.ts"
  "verify:spomove-family-audit": "tsx scripts/verify-spomove-family-audit.ts"
```

- `tsx`가 없으면 Seed 커밋에서 **devDependency만** 추가. 런타임 dependency 추가 금지.
- `generated.csv`는 **사람이 직접 수정하지 않음**.

### C-2. Generator SSOT

반드시:

```ts
OFFICIAL_SPOMOVE_LIBRARY
```

완성본을 import한다. (Core+Expansion 병합 · Activity Family · Movement Profile enrichment 포함)

**금지**

- `officialSpomovePresets.ts` 정규식 파싱
- Expansion 소스 문자열 직접 분석
- ID 접미사만으로 Expansion 단정
- Raw Library만 읽기

### C-3. Seed CSV 헤더 (한 줄, 고정)

```
sortOrder,presetId,title,programGroup,axis,engineMode,engineLevel,engineOptionsJson,activityFamilyId,movementProfileId,theme,rounds,cueSeconds,isReady,description,recommendedUse,runtimeSignature,mechanicSignature,themeSignature,stageSignature
```

### C-4. 필드 규칙

| 필드 | 규칙 |
| --- | --- |
| `engineOptionsJson` | `mode`·`level` 제외, **키 정렬** JSON. 없으면 `{}` |
| 빈 문자열 | `""` (undefined / null / N/A / `-` 혼용 금지) |
| Boolean | `true` \| `false` |
| 숫자 | 원래 숫자 |
| `theme` | 코드 ID (`fruit` 등). 표시명 금지. 없으면 정규화 결과 `none` |
| 파일 | UTF-8, BOM 없음, LF, RFC 4180 escaping |
| 정렬 | `sortOrder ASC` → `presetId ASC` |

사람 검수 열(`proposedCatalogFamilyId` 등)은 Seed에 **넣지 않는다**. (Commit C)

### C-5. Signature 공통

- Signature = 최종 Family 판정이 **아님**. 후보 그룹 보조값.
- 같은 Signature ≠ 같은 Family. 다른 Signature ≠ 다른 Family.
- 모든 Signature 접두: `v1|...`  
  규칙 변경 시 조용히 덮어쓰지 말고 **v2**로 올린다.

#### Runtime

실행 구성 전체. mode · level · 전 option · theme · rounds · cueSeconds 포함.

권장: Canonical JSON + `stableStringify`

```ts
const runtimeSignature = `v1|${stableStringify({
  mode, level, options: normalizedEngineOptions, theme, rounds, cueSeconds,
})}`;
```

#### Mechanic

Theme · cueSeconds · rounds · 자산·BGM·제목·설명 **제외**.  
mode별 **판단 규칙 영향 키 allowlist**만 포함.

```ts
const MECHANIC_KEYS_BY_MODE = { basic: [...], simon: [...], flanker: [...], flow: [...], /* ... */ } as const;
```

알 수 없는 mode → `[WARN] mechanic key policy missing: mode=...`  
Generator 경고 + Verification **실패**. 빈 Signature 금지.

#### Theme

```ts
function resolveAuditTheme(preset): string {
  return preset.engine.variantColorTheme ?? 'none';
}
// v1|theme=fruit | v1|theme=none
```

#### Stage

같은 규칙 안 난이도·길이·진행 후보: level · 자극 수 · 순서 길이 · 방해 수 · 노출 · cue · rounds · flowDuration · tier · bonus 등.  
최종 Stage 판정 아님 (level이 규칙까지 바꾸면 사람 검수에서 Family 분리 가능).

### C-6. Generator 동작 순서

1. `OFFICIAL_SPOMOVE_LIBRARY` 로드  
2. Row 변환  
3. Engine option canonicalize  
4. Theme 정규화  
5~8. Runtime / Mechanic / Theme / Stage Signature  
9. sortOrder · presetId 정렬  
10. CSV 기록  
11. 통계·경고 출력  

콘솔 예 (숫자는 **실제 Library**, 코드 하드코딩 금지):

```
SPOMOVE Family Audit Seed
Presets: N
Ready: …
Not ready: …
Engine modes: …
Mechanic candidate groups: …
Theme-bearing presets: …
Warnings: 0
Generated: docs/spomove-family-audit.generated.csv
```

### C-7. Seed Verification Gate

`verify-spomove-family-audit.ts` 필수:

- 행 수 = `OFFICIAL_SPOMOVE_LIBRARY.length`
- presetId 고유 · Library ↔ CSV ID 완전 일치 (누락·잉여 0)
- 모든 행에 runtime / mechanic / theme / stage Signature 존재
- `engineOptionsJson` 유효 JSON
- sortOrder → presetId 정렬 유지
- **재생성 결과 byte-for-byte 동일**
- 미지원 Engine mode 경고 0

권장 CI:

```bash
npm run audit:spomove-family
git diff --exit-code -- docs/spomove-family-audit.generated.csv
npm run verify:spomove-family-audit
```

### C-8. `SPOMOVE_FAMILY_AUDIT.md` 목차 (고정)

1. 목적  
2. 비범위  
3. 세 계층 (Preset / Activity Family / Catalog Family)  
4. 분류 계층 (Family / Theme / Stage / Variant)  
5~8. Family · Theme · Stage · Variant 판정 기준  
9. Signature (Runtime / Mechanic / Theme / Stage)  
10. Canonical 선정 기준  
11. Legacy 정책  
12. 검수 절차  
13. Batch A — 반응인지 Theme 클론  
14. Batch B — Simon / Flanker / Stroop  
15. Batch C — 순차 기억 / Flow / DIVE / Game-specific  
16. Phase 1 완료 기준  
17. Phase 2 인계 항목  

### C-9. 분류 원칙 (요약)

| 계층 | 판정 |
| --- | --- |
| **Catalog Family** | 자극 문법 · 판단 정보 · 정답 규칙 · 반응 매핑 · 시간/진행 · 피드백/목표 중 **본질 차이** → 별도 Family |
| **Theme** | 규칙 동일, 자산만 (fruit / animal / food / nature / vehicle / color) |
| **Stage** | 같은 규칙, 수행 부담 증가 (순서·방해·노출·라운드 등) |
| **Variant** | 규칙 본질 유지, 표현만 (배치·아이콘·보너스 유무) |

### C-10. Batch 검수 순서

- **A** 사분할·전면·2분할·3패널·3패널 다른색 → Family/Theme 문법 기준 샘플  
- **B** Simon / Flanker / Stroop → Uniform·Random·숫자/색·Mixed Size·Congruency를 Family vs Stage vs Theme로 **사람** 판정 (Signature 자동 채택 금지)  
- **C** 순차 기억 / Flow / DIVE / Game-specific → 길이·Bonus·시간·목표·Built-in 움직임  

### C-11. Commit B 완료 기준

- [ ] Phase 0 QA 13 Pass + 종료 승인 문구  
- [ ] generated.csv 행 수 = Library  
- [ ] 모든 자동 Signature 존재  
- [ ] Generator 재실행 동일  
- [ ] verify 통과  
- [ ] 문서에 Batch A→B→C 명시  
- [ ] **사람 판정 값 없음**  
- [ ] Hub / Session / Preset / Engine 변경 0  

**Commit B 완료 선언:**

> 전체 SPOMOVE Preset을 빠짐없이 해부할 자동 인벤토리와 후보 Signature가 생성됐으며, 사용자 표면 코드에는 변화가 없다.

---

## D. Commit C1 / D1 — Golden만 (→ Phase 2A)

### C1 — Golden Human Decisions

범위: **출시 후보 중 Golden Family 3** (+ 필요 시 Launch 후보 목록 메모).  
전체 Library 판정은 C2.

산출: `docs/spomove-family-audit.golden.review.csv` 또는 동등 결정서  
(`generated.csv`는 유지, 사람 열은 Golden 행만)

열:

```
proposedCatalogFamilyId, relationType, themeId, stageId, variantId,
canonicalPresetId, hubVisibility, legacyPolicy, copyStatus,
decisionRationale, reviewStatus, reviewOwner
```

| 필드 | 값 |
| --- | --- |
| `relationType` | `canonical` \| `theme-member` \| `stage-member` \| `variant-member` \| `unique-family` \| `review-required` |
| `hubVisibility` | `canonical` \| `hidden-member` |
| `legacyPolicy` | `preserve-direct` \| `map-to-family-option` \| `manual-review` |

### D1 — Golden Verification → Phase 2A 허용

- Golden 3 Family에 Canonical 각 1
- Brief 10필드 · 공식 세트 3 초안 연결 가능
- 해당 Preset 행 reviewStatus=approved

**D1 PASS = Phase 2A 진입 가능.** 전체 D2 불필요.

### Canonical 선정 순서 (C1·C2 공통)

1. `isReady=true`  
2. 규칙이 가장 기본·설명 쉬움  
3. Core 우선  
4. 기본 Theme 우선  
5. 썸네일·가이드 안정  
6. 기존 URL 사용 가능성  
7. 동률 → sortOrder → presetId  

---

## E. Commit C2 / D2 — 전체 Library (→ Phase 2B · 2A와 병렬)

### C2 — Full Human Decisions

나머지 Preset 전부 Theme·Stage·Variant·Canonical·Legacy·숨김 판정.  
파일: `docs/spomove-family-audit.review.csv` (전체)

### D2 — Full Verification → Phase 2B 조건

- 전 Preset에 `proposedCatalogFamilyId` · `relationType`
- Family당 Canonical **정확히 1**
- member의 `canonicalPresetId` 유효
- hidden member에 `legacyPolicy`
- 전 행 `decisionRationale` · `reviewStatus=approved` · `reviewOwner`
- orphan / 중복 매핑 0 · Preset ID 변경·삭제 0

```
SPOMOVE Catalog Audit — FULL APPROVED (D2)
… (현황 숫자)
```

**D2 PASS = Phase 2B Launch Catalog 확장 조건.** Phase 2A를 소급 차단하지 않음.

---

## F. Phase 1 완료 / Phase 2 인계

### Phase 1 완료 한 줄 (기술 · D2)

> 모든 Preset이 어떤 Catalog Family에 속하고, 대표 Preset이 무엇이며, Theme·Stage·Variant 중 무엇으로 취급되고, 기존 URL을 어떻게 유지할지 확정됐다.

### Phase 1 완료 추가 조건 (상품 — North Star 우선)

- **Phase 2A:** Golden 3 Brief(10필드) Pass + 공식 세트 3 + **C1/D1**. 전체 D2 **불필요**.
- **Phase 2B:** Launch 8~10 + **C2/D2** APPROVED + 축 공백 문서.
- 상세: `SPOMOVE_COMMERCIAL_PRODUCT_PLAN.md` · `SPOMOVE_COMMERCIAL_V1_REPORT.md`

### Phase 2A 인계물 (Golden)

- Golden 3 Brief · Hub 카피 · Guide · Canonical Preset 매핑
- 공식 수업세트 3 실행 순서
- Theme·Stage·Movement 옵션 (Golden만)
- Lite/Premium에서 Golden 위치

### Phase 2B 인계물 (전체 Catalog)

- approved full `review.csv` (D2)
- Family별 Canonical · Theme/Stage/Variant · Legacy · 숨김
- 직접 카피 필요 목록 · 축 공백 · Phase 1 검증 보고서

Phase 2 개발자가 Preset을 **다시 임의 그룹화하지 않는다**.

### Phase 3 Preview 성격 (고정)

Phase 4 Entitlement 완성 **전**:

- 허용: **무료 내부 테스트 / 협력자 테스트**만
- 금지: 유료 Preview · 실제 판매 · 외부 공개 Trial  
- Session URL 직접 접근으로 Premium 실행이 막히기 **전**에 돈을 받지 않는다.

### 완료해도 아직 없는 것 (Phase 2+)

Family Hub · Theme 선택기 · 직접 카피 · Catalog Resolver · Legacy redirect · 저장 조합 · 신규 UI

---

## G. 지금 / 다음

| 지금 | 다음 |
| --- | --- |
| Phase 0 QA 타임박스 + 승인 | Commit B |
| Commit B 완료 후 | C1 (Golden 3 · Launch 후보 · 클론 숨김 · 세트 3 순서) |

**현재 허용:** Phase 0 Closure · Commit B Audit Seed.  
**현재 금지:** Hub/Session 상품 구현 · C2를 핑계로 2A 지연 · Phase 3 유료 Preview.
