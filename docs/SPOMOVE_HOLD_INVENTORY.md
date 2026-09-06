# SPOMOVE HOLD 인벤토리 (1단계 · 충돌 탐지용)

공개 72는 `spomovePublicCatalogOrder.ts`만 SSOT다. 이 문서는 **카탈로그에 없는 프리셋**만 다룬다. 깊게 감사하지 않는다.

적용 규칙:

1. 소스 `catalogStatus: 'hold'`
2. `withSpokeduMasterCatalogHoldouts`: `basic` level 5 또는 6, 또는 `reactTrain` level 9 → 강제 `hold`
   사유 문자열: `SPOKEDU MASTER 카탈로그 제외: 3분할/랜덤분할/흰 공 찾기`

라이브러리 enrichment 이후 기준. 코드 변경 없음.

---

## 요약

```text
HOLD PRESETS FOUND: 22
```

| 묶음 | 개수 | 공개 72와의 관계 |
|------|------|------------------|
| 3분할(basic L5) 테마 | 7 | 공개 RC는 4분할·전면·2분할까지. 3분할 SELECT(세 신호 중 목표)는 비공개 |
| 랜덤분할(basic L6) 테마 | 7 | 공개에 없음 |
| 손·발 이관 잔여 (mq1–3) | 3 | 공개 `visual-reaction-hand-foot-*`와 **동일/유사 메커니즘 충돌** |
| 숫자 연산 기차 | 1 | 공개 시지각에 없음 |
| 흰 공 찾기 | 2 | 공개에 없음. 서로 VARIANT(1패널 vs 2패널) |
| 스트룹 누락 색 | 1 | 공개 단어 L4(bg)와 같은 L4 다른 옵션 |
| DIVE 랜덤 | 1 | 공개 standard/color-gate와 flow 엔진 공유 |

---

## 행 목록

### A. 3분할 · basic L5 (`reaction-triple` family)

| ID | programGroup | catalogStatus | holdReason | 공개와 유사? | ID/Family/에셋 충돌 | 향후 |
|----|--------------|---------------|------------|--------------|---------------------|------|
| reaction-cognition-triple-color-25 | reaction-cognition | hold (auto L5) | 3분할/랜덤분할/흰 공 | 공개 2분할과 레이아웃만 다름. SELECT는 세 패널 중 목표 | family `reaction-triple` 공개 미사용 | 공개 재개 시 NEW ID 권장(L5 auto-hold 유지 시) |
| reaction-cognition-l5-fruit-exp | reaction-cognition | hold (auto) | 동일 | 위 + fruit 테마 | 공개 l2/l3/l4 fruit와 테마 에셋 공유 | 테마 세트 정리 시 함께 |
| reaction-cognition-l5-animal-exp | reaction-cognition | hold (auto) | 동일 | 동일 | 공개 animal 전면/4분할과 에셋 공유 | 동일 |
| reaction-cognition-l5-food-exp | reaction-cognition | hold (auto) | 동일 | 동일 | 에셋 공유 | 동일 |
| reaction-cognition-l5-nature-exp | reaction-cognition | hold (auto) | 동일 | 동일 | 에셋 공유 | 동일 |
| reaction-cognition-l5-vehicle-exp | reaction-cognition | hold (auto) | 동일 | 동일 | 에셋 공유 | 동일 |
| reaction-cognition-l5-mix-exp | reaction-cognition | hold (auto) | 동일 | 동일 | 에셋 공유 | 동일 |

코어 `5:color`만 별도 ID(`triple-color-25`). expansion은 color 키 스킵.

### B. 랜덤분할 · basic L6 (`reaction-triple-diff`)

| ID | programGroup | holdReason | 공개와 유사? | 충돌 | 향후 |
|----|--------------|------------|--------------|------|------|
| reaction-cognition-triple-diff-color-31 | reaction-cognition | auto L6 | 전면/2분할/3분할 믹스. 공개 단일 레이아웃과 DISTINCT | family 전용 | 재공개 시 ID 유지 가능(한 번도 public catalog에 없음) |
| reaction-cognition-l6-fruit-exp | reaction-cognition | auto | 테마 VARIANT | 에셋 공유 | 테마 세트 |
| reaction-cognition-l6-animal-exp | reaction-cognition | auto | VARIANT | 에셋 | 동일 |
| reaction-cognition-l6-food-exp | reaction-cognition | auto | VARIANT | 에셋 | 동일 |
| reaction-cognition-l6-nature-exp | reaction-cognition | auto | VARIANT | 에셋 | 동일 |
| reaction-cognition-l6-vehicle-exp | reaction-cognition | auto | VARIANT | 에셋 | 동일 |
| reaction-cognition-l6-mix-exp | reaction-cognition | auto | VARIANT | 에셋 | 동일 |

### C. 손·발 이관 잔여 (명시 hold)

| ID | engine | holdReason | 공개 충돌 |
|----|--------|------------|-----------|
| reaction-cognition-mq1-32 | basic L7 color (enrichment: bodyLabel easy, cue 5s, 제목 보류) | 시지각 손발 쉬움으로 이관 예정 | **`visual-reaction-hand-foot-easy-skeleton`과 루트 동일(basic L7 easy)**. 다른 ID. 세션에 mq1이 남아 있으면 숨김 프리셋 실행 가능 여부 API가 hold를 막음 |
| reaction-cognition-mq2-33 | basic **L8** (손발 확률 규칙이 L7 normal과 다름) | 보통 이관 예정 | 공개 normal은 **L7+handFootDifficulty=normal**. **동일하지 않음**. 이관 문구 vs 실제 level 불일치 → 정리 필요 |
| reaction-cognition-mq3-34 | basic **L9** | 어려움 이관 예정 | 공개 hard는 **L7 hard**. L9는 3색 고정 패턴. **DISTINCT**. 이관 예정 카피와 불일치 |

Session API: `catalogStatus === 'hold'`면 수업 프로그램 추가 거부. 북마크된 옛 ID는 깨질 수 있음 (BACKWARD-COMPAT).

### D. 시지각 HOLD

| ID | engine | holdReason | 공개 충돌 |
|----|--------|------------|-----------|
| visual-reaction-number-cart-l2 | reactTrain L8 numberCartTier=1 | 숫자 연산 기차 숨김 | 공개 72에 없음. Flanker 숫자 ID는 canonical 후 **숫자가 아님** → 이 HOLD가 유일한 숫자-문 매칭 후보 |
| visual-reaction-color-tracker-l2 | reactTrain L9 tier1 1패널 | auto L9 흰 공 | 공개 없음 |
| visual-reaction-white-ball-hard-skeleton | reactTrain L9 tier2 dualPanel | auto L9 + expansion | color-tracker-l2의 VARIANT. 둘 다 hold |

### E. 스트룹 HOLD

| ID | engine | holdReason | 공개 충돌 |
|----|--------|------------|-----------|
| stroop-missing-color-50 | stroop L4 stroopWordMode=missing | 3/4번 정리로 숨김 | 공개 `stroop-word-bg-49`와 **같은 level 4**, 옵션만 missing vs bg. EngineRouter는 missing을 지원. Family `stroop-missing` |

### F. DIVE HOLD

| ID | engine | holdReason | 공개 충돌 |
|----|--------|------------|-----------|
| dive-random | flow L1 random layout 60s 동일 features | 액션무브/모션게이트만 공개 | `dive-standard`와 모듈 공유, layout·duration만 다름. VARIANT. 재실행 시 옛 세션 ID |

---

## 공개 72와 충돌 우선순위

1. **mq1 ↔ hand-foot-easy**: 거의 같은 게임 두 ID (하나만 공개).
2. **mq2/mq3 ↔ hand-foot-normal/hard**: 문서상 이관, 엔진 level이 다름. 잘못 합치면 규칙이 바뀜.
3. **stroop-missing ↔ word-bg-49**: 옵션 충돌이 아니라 형제. 공개 L4에 missing을 붙이면 ID 의미 변경 위험.
4. **number-cart HOLD vs remapped `*-number-exp` Public IDs**: 이름만 숫자. 런타임은 극단 테마. 사용자/CMS가 숫자 플랭커로 오인 가능.
5. **L5/L6 테마**: 공개 테마 에셋·family 파생 규칙(`deriveFamilyIdForPresetId` l2–l6)과 공유. Hub에는 안 보임.

---

## 이번 단계에서 하지 않은 것

HOLD 22개의 SIGNAL/SELECT/MOVE 전수, CMS, 에셋 정밀 감사. 공개 72 수정 없음.
