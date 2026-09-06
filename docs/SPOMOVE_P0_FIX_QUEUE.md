# SPOMOVE P0 Fix Queue (코드 수정 없음)

1.5단계 라이브 CMS·에셋 확인 후에도 **1–4번 순서는 유지**한다.
5번은 라이브 CMS가 Runtime보다 앞선 것이 증명되어 **추가**한다.

공통 전제:

- 수업/즐겨찾기는 `spomove_preset_id`만 저장하고 실행 시 Official Preset을 다시 lookup한다.
- 공개 카탈로그 SSOT는 `spomovePublicCatalogOrder.ts`.
- LIVE CMS: `think_asset_packs` / `spokedu_master_official_spomove_content` (2026-08-24, published 72).
- CODE SEED(`SPOMOVE_EDITORIAL_PILOT_CONTENT`)와 섞지 말 것.

---

## 1. stroop-arrow-reverse-08

1. Public ID: `stroop-arrow-reverse-08`
2. 현재 문제: 스트룹 그룹·Family `stroop-arrow`로 공개되지만 실행은 스트룹이 아니다. 공개 `reaction-cognition-space-direction-color-01b`와 TRUE DUPLICATE.
3. 실제 Runtime: `basic` L1, `spatialArrowColorMode=color`, compass 매핑. 중앙 색 화살표 → 방향 패드. 말하기/간섭 없음.
4. 기대 동작 (카탈로그 위치 기준): 스트룹 규칙(방향 vs 색 말하기 또는 간섭)이거나, 이 슬롯을 스트룹이 아닌 프로그램으로 재분류.
5. CMS 상태: **LIVE MATCH** (방향 패드 이동을 설명). displayTitle 없음. 그룹 오류를 가이드가 따라감. CODE SEED 없음.
6. Asset 상태: 썸네일 **MATCH**(파란 아래 화살표). 영상 HTTPS `hUKQl80Yp3I` — VIDEO CONTENT VERIFY REQUIRED. 비관리자 재생 503 가능.
7. Backward compatibility: **YES** — 동일 ID lookup이 스트룹이 아니라 basic 색상화살표.
8. 권장 수정 방식: **HOLD + REPLACE**
   - 이 ID는 HOLD. 스트룹 화살표가 필요하면 **NEW PRESET**.
   - 색상화살표 공개는 `…-01b` 유지 (**IN-PLACE로 01b를 바꾸지 말 것**).
9. 예상 영향 범위: 스트룹 그룹 1번 카드, 저장된 세션/즐겨찾기, Family, 가이드 영상, 썸네일, 홈 비포함. CMS는 Runtime과 맞으므로 가이드 문구보다 **카탈로그 위치·ID**가 핵심.

---

## 2. stroop-word-reverse-48

1. Public ID: `stroop-word-reverse-48`
2. 현재 문제: 제목은 보통+이나 `signals.ts` L2/L3 동일. `stroopWordDifficulty` 미전달. `stroop-arrow-bg-47`과 TRUE DUPLICATE.
3. 실제 Runtime: 검정 배경 색 단어, 의미/잉크 ± 역전, 음성.
4. 기대 동작: 실제로 더 어려운 규칙(전환 빈도, 배경 간섭 등)이거나 카탈로그에서 제거.
5. CMS 상태: **LIVE PARTIAL MATCH** — “더 빠르게 전환”만 추가. CODE SEED 없음.
6. Asset 상태: 썸네일 **MATCH**(빨간 「노랑」). 영상 `Br1Dmf41RYs` — VIDEO CONTENT VERIFY REQUIRED.
7. Backward compatibility: **NO** (L3 lookup 의미가 다른 게임으로 바뀐 재사용이 아님). 중복 노출 문제.
8. 권장 수정 방식: **HOLD + REPLACE** 또는 **PO DECISION REQUIRED**
   - 진짜 난이도 분기를 붙일 거면 옵션을 Player까지 연결하는 것은 2단계 설계.
   - 지금 큐의 최소 제품 조치는 카탈로그에서 48을 빼는 쪽(HOLD) + 47 유지.
9. 예상 영향 범위: 스트룹 4장 중 1장, 47과 썸네일/영상이 비슷해 수업 혼선. 47 썸네일(화살표)은 별도 P1.

---

## 3. simon-camouflage-center-skeleton

1. Public ID: `simon-camouflage-center-skeleton`
2. 현재 문제: `camouflagePlacement=center`가 Session까지는 가지만 Player가 `variant` 하드코딩. 카탈로그 “보통”과 `visual-reaction-blackout-37`(어려움)이 같은 루트.
3. 실제 Runtime: `CamouflageReactionTraining` placementMode=variant, concurrent는 simonPoleCount(기본 1).
4. 기대 동작: 중앙 배치 보통 vs 극단 어려움이 실제로 갈라지거나, 카드에서 가짜 난이도 쌍을 제거.
5. CMS 상태: **LIVE PARTIAL MATCH** — 넓은 시야/색 찾기. 중앙이라고 명시하지 않음.
6. Asset 상태: 썸네일 **MISMATCH** (중앙 노란 별, `CAMOUFLAGE - 빠른`). 영상 `6gzfRbS6jng` — VIDEO CONTENT VERIFY REQUIRED.
7. Backward compatibility: **YES** — center를 기대한 저장 ID가 극단으로 실행됨.
8. 권장 수정 방식: **NEW PRESET** (진짜 중앙) + 기존 ID **HOLD**, 또는 Player가 옵션을 읽게 하는 **IN-PLACE**(2단계, 세션 의미 변경 주의).
   - blackout-37과 한 세트로 설계할 것.
9. 예상 영향 범위: 사이먼 카모 2장, EngineRouter와 MemoryGameApp 양쪽 하드코딩, 썸네일 재촬영 후보, 세션 difficulty(simonPole)가 concurrent를 덮는 채널.

---

## 4. sequential-memory-color-number-exp

1. Public ID: `sequential-memory-color-number-exp`
2. 현재 문제: 순차 기억 그룹이나 엔진은 교사 Q&A. SPOMOVE 「화면→선택→움직임」과 충돌.
3. 실제 Runtime: `spatial` L4 `MemoryGameLevel4`. 10개 부호화 후 Space로 질문/정답. 패드 입력 없음.
4. 기대 동작: 퀴즈 프로그램으로 명시하거나, 패드 재현 엔진을 붙이거나, 공개 목록에서 제외.
5. CMS 상태: **LIVE MATCH** (말로 답, 교사 공개). CODE SEED 없음.
6. Asset 상태: 썸네일 **MATCH** (Q1/5, 정답 공개). 영상 `_Y2cieUDdz4` — VIDEO CONTENT VERIFY REQUIRED.
7. Backward compatibility: **NO** (원래 퀴즈).
8. 권장 수정 방식: **PO DECISION REQUIRED**
   - 퀴즈를 남기면 그룹/움직임 카피 재분류(메타, 2단계).
   - 순차 패드로 바꾸면 **NEW PRESET** 권장(같은 ID에 패드를 심으면 과거 퀴즈 세션이 다른 게임이 됨 → 그때 BC YES).
9. 예상 영향 범위: 순차 기억 6장, 가이드가 이미 퀴즈라 CMS는 상대적으로 안전.

---

## 5. sequential-memory-full-reveal-54 (1.5 추가)

1. Public ID: `sequential-memory-full-reveal-54`
2. 현재 문제: **RUNTIME BEHIND CMS**. 라이브 가이드는 패드 재현, 엔진은 Space 공개.
3. 실제 Runtime: `spatial` L5 `MemoryGameLevel5`. 패드 채점 없음.
4. 기대 동작: CMS대로 전체 공개 후 패드 순서 재현, 또는 CMS를 엔진(교사 확인)에 맞추기.
5. CMS 상태: **LIVE MISMATCH**. 가이드 영상 **NONE**.
6. Asset 상태: 썸네일은 「전체 정답」 번호-색 격자 → 엔진 공개 화면과 가깝고, CMS 패드 재현은 미표현. ASSET VERIFY REQUIRED.
7. Backward compatibility: **NO** (엔진 의미 재사용은 아님). CMS만 앞섬.
8. 권장 수정 방식: **PO DECISION REQUIRED**
   - 패드 재현을 구현하면 IN-PLACE 가능하나 채점 UX가 큼.
   - 교사 공개가 맞으면 CMS/가이드를 Runtime에 맞추는 메타 수정(2단계). 지금은 코드 금지.
9. 예상 영향 범위: 순차 기억 마지막 장, 4번 퀴즈와 UI 계열 공유(`generateLevel4Pattern`).

순서 변경 이유: 1–4는 1단계 FAIL 그대로. 5만 CMS 증거로 신규 P0.

---

## 같이 바꿔야 하는 것 (P0를 손댈 때)

| P0 ID | 같이 볼 것 |
|-------|------------|
| stroop-08 | `…-01b`(건드리지 말 것), Family `stroop-arrow`, 라이브 가이드(이미 화살표), 썸네일/영상 |
| stroop-48 | `stroop-arrow-bg-47` (TRUE 쌍, 47 썸네일 화살표는 P1), stroop L2/L3 시그널 |
| camo-center | `visual-reaction-blackout-37`, EngineRouter+MemoryGameApp L4, 세션 simonPole |
| color-number | 순차 기억 그룹 카피, Level4 QA UI |
| full-reveal-54 | Level5 UI, CMS published 가이드, 영상 없음 |

HOLD 대체 오해 금지: `stroop-missing-color-50`은 L4 missing 옵션이지 08/48 대체가 아님. mq 손발은 공개 hand-foot과 별 ID.

---

## 이번 큐에 넣지 않은 것

- Flanker ID 재사용: 신규 실행은 정상 → **P1 2단계**.
- 01b: P0 아님.
- 음성 스트룹 47/49: 움직임 정의는 PO, 47은 P1 썸네일.
- 가이드 HTTPS 503: P1 미디어 이전.
