# SPOMOVE MASTER 공개 72 감사 최종판 (1.5단계)

- 확정일: 2026-09-06
- 성격: READ-ONLY VALIDATION / AUDIT FINALIZATION
- 코드·DB·CMS·Catalog·ID·HOLD 변경: **0건**
- 1단계 문서: `SPOMOVE_PUBLIC_72_AUDIT.md` / `.csv` / `SPOMOVE_HOLD_INVENTORY.md`
- 본 파일이 1.5단계 이후 **집계·위험도 SSOT**다.

라이브 조회 시각: 2026-09-06T06:04:11Z
테이블: `think_asset_packs` (Hub/Dashboard/guide-video 라우트가 실제로 읽는 팩만)

| Pack ID | updated_at (LIVE) | 내용 |
|---------|-------------------|------|
| `spokedu_master_official_spomove_content` | 2026-08-24 | `content` 72키 (Public 72 전부) |
| `spokedu_master_official_spomove_thumbnails` | 2026-09-04 | `thumbnails` 91키 (Public 72 + HOLD 잔여) |
| `spokedu_master_official_spomove_guide_videos` | 2026-08-25 | `guideVideos` 67키 (Public 59 HTTPS + HOLD 8) |
| `spokedu_master_home_spomove_featured` | 2026-09-03 | slots: `space-direction-01`, `l3-fruit-exp`, `mole-l1`, `simon-random-hard-skeleton` |

---

## 숫자 보고 (Markdown = CSV)

```text
PUBLIC TOTAL: 72

PASS: 35
WARN: 32
FAIL: 5
VERIFY: 0

P0: 5
P1: 27
P2: 40

TRUE DUPLICATE: 2 pairs (3 IDs)
EFFECTIVE DUPLICATE / COLLISION: 1 pair (2 IDs)
VARIANT ROOTS: 10

BACKWARD-COMPATIBILITY RISKS: 20

CMS MATCH: 68
CMS MISMATCH: 1
CMS NONE: 0
CMS VERIFY: 0
CMS PARTIAL MATCH: 3

ASSET MATCH: 8
ASSET MISMATCH: 2
ASSET VERIFY: 62
```

PARTIAL MATCH는 CMS 집계에서 MATCH/MISMATCH/NONE/VERIFY와 **별도 3건**이다. 합 68+1+0+0+3=72.

---

## 1단계 문서와의 정합성 수정 (판정 뒤집기 아님 · 기준 충돌 제거)

| 1단계 | 문제 | 1.5 확정 |
|-------|------|----------|
| P0=5에 `space-direction-color-01b` 포함 | 정상 Runtime을 중복 때문에 P0로 올림 | **P2 / PASS**. 책임은 `stroop-arrow-reverse-08` |
| Flanker remapped를 P0-historical과 혼용 | 신규 실행은 제목과 맞음 | **WARN / P1 + BACKWARD-COMPATIBILITY YES** |
| TRUE DUPLICATE 3 pairs에 camouflage `≈` 포함 | cue·썸네일 차이 | **EFFECTIVE DUPLICATE / COLLISION** |
| `full-reveal-54` VERIFY | 라이브 CMS가 패드 재현을 명시 | **FAIL P0 · RUNTIME BEHIND CMS** |
| CMS 전부 VERIFY | 라이브 72 published 확인 | 아래 CMS 절 |

---

## P0 / P1 / P2 재고정

- **P0**: 지금 사용자가 실행하는 의미가 잘못됨 (엔진/level/옵션 붕괴, 표시≠규칙, 공개 두 ID가 완전 동일 Runtime, 정의 충돌, **CMS가 새 규칙을 말하는데 Runtime이 옛 게임**).
- **P1**: 지금 게임은 돌아가지만 ID 재사용·세션 lookup·Family·옛 description·CMS/에셋 불일치·가이드 접근.
- **P2**: 제목·카피·난이도 이름만.

CODE SEED (`SPOMOVE_EDITORIAL_PILOT_CONTENT` 7개)는 Public fallback이 아니다. 아래 CMS는 전부 **LIVE CMS**.

---

## LIVE CMS vs Runtime (우선 ID)

출처: LIVE `spokedu_master_official_spomove_content`. displayTitle override는 Public 72 전부 **없음**(카드 제목=Official Preset canonical). `movementGuideStatus=published` 72/72.

### stroop-arrow-reverse-08

```text
RUNTIME TRUTH:
basic L1 고정 색상 화살표(위빨·좌초·우노·하파). 방향 패드로 이동.

CMS CLAIM (LIVE):
방향별 색 화살표를 보고 방향 패드로 이동. 색은 단서.

판정: MATCH
```

카탈로그 그룹은 스트룹. CMS는 현 Runtime과 같다(잘못된 분류를 가이드가 따라감). **FAIL P0 유지**. 썸네일: 파란 아래 화살표 → **ASSET MATCH**. 영상: `https://youtu.be/hUKQl80Yp3I` → VIDEO CONTENT VERIFY REQUIRED.

### stroop-arrow-bg-47

```text
RUNTIME TRUTH:
stroop L2 단어 의미/잉크 ± 역전. 음성.

CMS CLAIM (LIVE):
검정 배경 색 단어. 의미 또는 잉크. 역전이면 반대로 말함.

판정: MATCH
```

썸네일: **파란 배경 + 빨간 왼쪽 화살표** → 구 화살표+배경. **ASSET MISMATCH**. 영상 `S5orM63nLwU` 내용 미시청.

### stroop-word-reverse-48

```text
RUNTIME TRUTH:
L2와 동일 시그널 분기. 추가 난이도 옵션 없음.

CMS CLAIM (LIVE):
의미·잉크·역전을 더 빠르게 전환.

판정: PARTIAL MATCH
```

난이도 카피만 앞서 있고 엔진은 동일 → **TRUE DUPLICATE / FAIL P0 유지**. 썸네일: 빨간 글자 「노랑」 → 단어 스트룹 **MATCH**.

### stroop-word-bg-49

```text
RUNTIME TRUTH:
L4 배경간섭. voice=잉크.

CMS CLAIM (LIVE):
단어·배경 무시, 잉크만 말하기.

판정: MATCH
```

썸네일: 빨간 배경 + 초록 「노랑」 → **MATCH**. 음성 MOVE는 제품 정의 긴장 → WARN P1.

### simon-camouflage-center-skeleton

```text
RUNTIME TRUTH:
EngineRouter/MemoryGameApp이 placementMode=variant 하드코딩. 극단.

CMS CLAIM (LIVE):
노이즈에서 색 찾아 패드로. 중앙이라고 쓰지 않음.

판정: PARTIAL MATCH
```

썸네일: 노이즈 **중앙 노란 별**, HUD `CAMOUFLAGE - 빠른` → Runtime(극단)과 **ASSET MISMATCH**. **FAIL P0 유지**.

### visual-reaction-blackout-37

```text
RUNTIME TRUTH:
simon L4 카모 variant, 기본 concurrent=1, cue 5s.

CMS CLAIM (LIVE):
극단·가장자리까지 넓게 보고 색 이동.

판정: PARTIAL MATCH
```

썸네일: 도형 2개, `CAMOUFLAGE - 보통 - 변형`. 카탈로그 제목은 어려움. ASSET VERIFY. EFFECTIVE DUPLICATE 쌍의 공개 “어려움” 쪽.

### sequential-memory-color-number-exp

```text
RUNTIME TRUTH:
부호화 후 Space Q&A. 패드 재현 없음.

CMS CLAIM (LIVE):
색·번호 쌍 기억 후 말로 답, 교사 공개.

판정: MATCH
```

썸네일: 「숫자 2는 무슨 색깔이었을까요?」+ 정답 공개 → **MATCH**. 그룹은 순차 기억·움직임 계약과 충돌 → **FAIL P0 유지**.

### sequential-memory-full-reveal-54 — 1.5에서 FAIL 승격

```text
RUNTIME TRUTH:
MemoryGameLevel5. 제시 후 Space로 공개/완료. 패드 채점 루프 없음.

CMS CLAIM (LIVE):
전체 순서 공개 후 같은 순서로 패드를 밟아 재현.

판정: MISMATCH
Issue: RUNTIME BEHIND CMS
```

썸네일: 「전체 정답」 번호-색 격자(엔진 공개 화면과 유사, CMS의 패드 재현은 안 보임). 가이드 영상 **NONE**.

### Flanker remapped 대표

LIVE 가이드는 **현재 canonical Runtime**(가운데 화살표 / 극단 가운데 색)을 설명한다. 코드 파일의 옛 `description`과 달리 **LIVE CMS는 MATCH**.

| ID | CMS | 썸네일(실사) | 영상 |
|----|-----|--------------|------|
| flanker-uniform-07 | 가운데 좌우 화살표 MATCH | 5흰화살표 불일치 자극 MATCH | NONE |
| flanker-nested-circles-04 | 극단 가운데 색 MATCH (동심원 아님) | 크기 다른 색 원 가로열 MATCH | NONE |
| flanker-uniform-number-exp | 자연 테마 극단 색 MATCH (숫자 아님) | 구름·불·클로버 등 MATCH | NONE |
| flanker-random-number-exp / 5circle-number-exp | 탈것/믹스 극단 MATCH | (미확대) VERIFY | NONE |
| flanker-extreme-arrow-hard-skeleton | 극단 가운데 화살표 MATCH | 크기 다른 화살표 MATCH | NONE |

신규 실행은 맞다. **P0 아님.** **P1 + BC YES.**

---

## 가이드 영상

- Public 59: `https://youtu.be/...` (**LIVE**)
- Public 13: **NONE** — uniform-07, arrow-udlr, nested-circles-04, 5circle-46, arrow-05, 세 number-exp, extreme-arrow, seq 10color, custom-10color, full-reveal-54, dive-color-gate-61
- Private bucket ref: Public **0**
- `GET /api/spokedu-master/spomove/guide-video`: 비관리자+HTTPS는 `PREMIUM_MEDIA_NOT_MIGRATED` 503. 구독자 허브에서 영상이 안 열릴 수 있음 → P1 접근. 내용 시청은 하지 않음 → **VIDEO CONTENT VERIFY REQUIRED**

CODE SEED 파일에는 영상이 없다.

---

## Backward Compatibility (재확정 20)

기준: preset ID만 저장 후 현재 Official lookup.

YES 20건 (CSV 문장과 동일): stroop-08, stroop-arrow-bg-47, camo-center, blackout-37, Flanker remapped 16 (udlr-exp 제외).

`stroop-word-reverse-48`는 L3 의미가 바뀐 재사용이 아니라 **지금 카탈로그에 중복 ID가 있는 문제** → BC **NO**.

---

## Duplicate 재분류

### TRUE DUPLICATE (SIGNAL=SELECT=MOVE)

1. `stroop-arrow-reverse-08` ↔ `reaction-cognition-space-direction-color-01b`
   - 잘못된 쪽만 P0: **08**. 01b는 PASS.
2. `stroop-word-reverse-48` ↔ `stroop-arrow-bg-47`
   - 중복 엔진: 둘 다 L2/L3 동일 분기. 48을 P0 (거짓 난이도). 47은 단어 스트룹으로 동작하므로 Status WARN P1 + Duplicate 표시.

### EFFECTIVE DUPLICATE / COLLISION

- `simon-camouflage-center-skeleton` ↔ `visual-reaction-blackout-37`
  같은 카모 Player·variant 고정. cue 2s vs 5s, 썸네일(중앙 vs 2도형) 다름. 완전 동일이라고 단정하지 않음.

### VARIANT ROOTS (10)

rc-quad / rc-full / rc-split / mole / goalkeeper / hand-foot / simon 보통·어려움 쌍 / flanker 랜덤 테마7 / flanker 극단 테마7 / seq 3·5·램프

---

## HOLD 충돌 (재확인, 재활성화 없음)

- Public과 **동일 ID 없음**.
- LIVE content: HOLD **0** (설명 팩에 없음).
- 썸네일 잔여 19, 영상 잔여 8 (mq1–3, 흰공, missing stroop, L5/L6 일부, dive-random 등).
- mq1 ↔ 공개 hand-foot-easy: 메커니즘 충돌 후보. mq2/mq3는 level이 공개 L7과 다름.
- 옛 세션이 HOLD ID를 들고 있으면 API가 hold를 거부할 수 있음.

---

## 집계 변경이 2단계 순서에 미치는 영향

기본 P0 큐 1–4는 유지. 1.5에서 **full-reveal-54를 5번으로 추가** (CMS가 패드 재현을 요구하는데 엔진이 안 받음). 1–4 순서는 바꾸지 않음.

상세: `SPOMOVE_P0_FIX_QUEUE.md`
72행: `SPOMOVE_PUBLIC_72_AUDIT_FINAL.csv`
