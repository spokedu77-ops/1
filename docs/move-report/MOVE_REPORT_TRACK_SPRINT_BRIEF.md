# MOVE REPORT TRACK — Sprint Brief (수정본)

**Sprint ID:** `MOVE-TRACK-FIELD-CAPTURE-v0.1`
**Status:** **Field Capture v0.1 완료 · MOVE REPORT 개발 동결** (커밋 `979128b` 이후 범위)
**Companion:** [DB Design](./MOVE_REPORT_TRACK_DB_DESIGN.md) · [Migration SSOT](../../supabase/migrations/20260829130000_move_report_track_core.sql) · [Migration Draft (historical)](./MOVE_REPORT_TRACK_MIGRATION_DRAFT.sql) · [Scoring Manual v0.1](./MOVE_REPORT_SCORING_MANUAL_v0.1.md)

---

## PO APPROVED (기반)

| 항목 | Status |
|------|--------|
| `mr_` prefix | ✅ Approved |
| MOVE PROFILE ↔ TRACK 물리적 DB 분리 | ✅ Approved |
| Phase 0–2 `/move-report` Profile URL 유지 | ✅ Approved |
| Program ↔ Institution M:N | ✅ Approved |
| Server API + service_role write path | ✅ Approved |
| Scoring Manual = Phase 1 UI blocker | ✅ Approved |

---

## SPRINT NAME

`MOVE-TRACK-FOUNDATION-01` — MOVE TRACK 기반 설계 (Sprint Brief + DB 스키마)

---

## PRODUCT PROBLEM

강사·기관이 SPOKEDU 프로그램 현장에서 **참여 방식·지원 필요·독립적 시작·움직임 경험 확장**을 회기별로 구조화 기록할 시스템이 없다.
부모용 MOVE PROFILE과 혼재되어 **현장 관찰 데이터**와 **공개 설문 데이터**가 분리되지 않는다.

---

## APPROVED PRODUCT STRUCTURE

```
MOVE REPORT
├── MOVE PROFILE   (기존 유지 — move_report_*)
├── MOVE TRACK     (신규 — mr_*)
└── MOVE IMPACT    (Phase 2 — App-layer 집계)
```

| 원칙 | 내용 |
|------|------|
| Profile 유지 | Phase 0–2 `/move-report` = Profile (SEO·공유·coach 링크 보호) |
| 데이터 분리 | Profile `move_report_*` ↔ Track `mr_*` — FK 없음 |
| 허브 | `/move-report` 3카드 허브 — Phase 3 REPLACE (별도 승인) |

---

## MOVE TRACK 핵심 목적

운동능력 **점수화·순위**가 아닌 **현장 관찰 기록**.
North Star: **Performance보다 Participation, Experience Expansion**.

### 4 Impact Dimensions (Score 아님)

Dimensions는 **DB field 1:1 점수가 아니라** Impact 분석용 **proxy indicator 묶음**이다.
Dimension별 합산·총점 **생성 금지** (I1, I9).

| Dimension | Proxy Indicators (MVP) | DB Fields |
|-----------|------------------------|-----------|
| **ACCESS** | 출석 + 활동 진입 | `attendance_status`, `participation_level` (진입 단계) |
| **INVOLVEMENT** | Participation Pathway + 실제 참여 Domain | `participation_level`, `mr_movement_experiences` |
| **INDEPENDENCE** | Support + Independent Initiation | `support_level`, `independent_initiation` |
| **EXPERIENCE BREADTH** | 실제 참여 Movement Domains | `mr_movement_experiences` (distinct domain) |

> Impact Phase 구간(EARLY/MID/LATE)은 **session record에 저장하지 않음** — 사업 `total_sessions` 기준 App 계산 (§ Impact Periods).

---

## MVP CORE FIELDS (회기별 아동 기록)

| Field | Source | Scale / Type | Manual |
|-------|--------|--------------|--------|
| `attendance_status` | CONTEXT | present / absent | — |
| `observation_opportunity_band` | CONTEXT | NULL · one · two · three_plus | SM-02 |
| `participation_level` | OBSERVED | NULL · 0–4 (Typical) | SM-03 |
| `support_level` | OBSERVED | NULL · 0–4 (Typical) | SM-06 |
| `independent_initiation` | OBSERVED | NULL · 0–3 | SM-04 |
| `self_reengagement` | OBSERVED | NULL · false · true | SM-07 |
| `spomove_used` | CONTEXT | boolean | SM-08 |
| `frw_seconds` | SYSTEM | NULL · 1–6 | SM-08 |
| `frw_status` | SYSTEM | NULL · exploratory · observed_stable · not_determined | SM-08 |
| `movement_domains` | OBSERVED | domain + subtag (실제 참여만) | SM-12 |
| `observation_note` | OBSERVED | max 150, Meaningful Change | SM-11, SM-14 |

### 수정 1 · Initiation Construct 분리

**`independent_initiation`** (frequency construct):

| Value | Meaning |
|-------|---------|
| NULL | Not Assessed / Not Observable |
| 0 | 관찰기회 있었으나 독립적 시작 없음 |
| 1 | 1회 |
| 2 | 2회 이상 |
| 3 | 활동 전반에서 반복적으로 관찰 |

**`self_reengagement`** (별도 construct — 재참여):

| Value | Meaning |
|-------|---------|
| NULL | 관찰기회 없음 (평가하지 않음) |
| false | 관찰기회 있었으나 재참여 관찰되지 않음 |
| true | 이탈/종료 이후 스스로 다시 활동에 참여 |

> ~~`voluntary_initiation`~~ 및 level 3 "재참여" **폐기**.

### 수정 2 · Independent Initiation 판정 원칙 (PO 확정)

다음 조건을 **모두** 만족할 때만 `independent_initiation ≥ 1`:

1. 시각 자극 또는 활동환경이 **제시된 뒤**
2. **직접적인 움직임 지시** 없음 (예: "가", "빨간색 밟아", "공 잡아" → **포함 안 함**)
3. **신체적 촉진** 없이 목적성 있는 움직임 **시작**

주의환기 수준 **general cue** 허용 범위 → Scoring Manual SM-05에서 정의.

### 수정 3 · NULL ≠ 0 (전 관찰값 공통)

| 표기 | 의미 | UI |
|------|------|-----|
| **NULL** | Not Assessed / Not Observable | `[이번 회기 평가하지 않음]` |
| **0** | 관찰기회 있었으나 해당 행동 **없음** | 명시적 0 선택 |
| **1–n** | 실제 관찰값 | |

적용 필드: `participation_level`, `support_level`, `independent_initiation`, `self_reengagement`, `frw_seconds`/`frw_status`, movement domains (미선택 ≠ 0 domains).

### 수정 4 · 회기 대표값 = Typical Performance

Structured field는 **Typical Performance**(회기 대표 수준)만 기록:

- 주 활동에서 가능하면 **최소 3회**의 의미 있는 참여기회 기준
- **가장 빈번하게 관찰된 수준**(mode) 기록
- 두 단계가 비슷하면 → **성과 과장 방지**: 더 많은 지원 필요 수준 또는 **더 낮은 participation** 선택

**`observation_note`** = **Meaningful Change** (의미 있는 최고 수행·후반 변화·특이 관찰).

```
structured fields  →  Typical Performance
observation_note   →  Meaningful Change
```

### 수정 6 · Functional Response Window

단일 enum 필드 대신:

| Column | Type | Notes |
|--------|------|-------|
| `frw_seconds` | smallint 1–6 | 1 = Challenge Setting |
| `frw_status` | enum | exploratory · observed_stable · not_determined |

- SPOMOVE 미실시 → both NULL
- **Reaction Time 표현 금지** (I3)
- **1초 + 성장단계 Impact 제외** (I5) — `frw_seconds = 1` 또는 `frw_status <> observed_stable` 시 growth KPI 제외

### 수정 7 · Movement Experience

- Experience Breadth = 아동이 **실제로 움직임에 참여**한 Domain만
- 단순 관찰·교구 탐색(참여 이전) → Domain Count **제외**, `observation_note`에 기록

### 수정 8 · Assessment / Impact Periods

| Layer | Period Storage |
|-------|----------------|
| **MOVE TRACK session record** | ❌ EARLY/MID/LATE ENUM **없음** |
| **MOVE IMPACT 계산** | App: `total_sessions` 기준 25% × 3 구간 동적 계산 |
| **외부 표준화 검사** | `mr_measurement_timing`: PRE · MID · POST · FOLLOW_UP |

---

## PRODUCT INVARIANTS (I1–I9)

| # | 불변식 |
|---|--------|
| I1 | 총점·합산점수·Dimension 합산 **금지** |
| I2 | 아동 간 Ranking **금지** |
| I3 | FRW ≠ Reaction Time |
| I4 | FRW 숫자 작을수록 우수 표현 **금지** |
| I5 | `frw_seconds = 1` Challenge — 성장단계 Impact **제외** |
| I6 | Movement Domain = **실제 참여**만 |
| I7 | `% 향상` 자동문구 **금지** |
| I8 | TRACK 관찰 ↔ 외부 검사 **합산 금지** |
| I9 | NULL(미평가) ≠ 0(관찰했으나 없음) — **혼동 금지** |

---

## SCORING MANUAL v0.1 — Field Pilot (확정)

**SSOT:** [MOVE_REPORT_SCORING_MANUAL_v0.1.md](./MOVE_REPORT_SCORING_MANUAL_v0.1.md)
**Status:** Field Pilot Version — UI label·도움말·품질 경고는 본 Manual 기준.

| Section | Content |
|---------|---------|
| SM-01 | Meaningful Participation Opportunity |
| SM-02 | `observation_opportunity_band` |
| SM-03~06 | Participation · Independent Initiation · Support |
| SM-05 | General Cue decision tree |
| SM-07~08 | Self Re-engagement · FRW |
| SM-09~11 | Fallback · Typical Performance · Meaningful Change |
| SM-12~18 | Domains · Edge cases · Pilot rules |

> Phase 1 UI 착수: Manual v0.1 Field Pilot 기준. Pilot 일치도(SM-17) 결과는 v0.2 반영.

---

## CURRENT STATE (2026-08-29 · 커밋 `979128b` 기준)

| 축 | 현재 |
|----|------|
| MOVE PROFILE | ✅ `/move-report`, submissions, coach, educator beta |
| MOVE TRACK DB | ✅ `mr_*` — Migration `20260829130000_move_report_track_core.sql` **적용됨** (smoke 통과) |
| Phase 0 alias/auth | ✅ `/move-report/profile` alias · `requireMoveReportTrackInstructor()` · Track layout instructor/admin only |
| Track skeleton | ✅ `/move-report/track/*` — programs, session new, session detail, child record |
| **Field Capture v0.1** | ✅ 회기 생성 + 아동 기록 + autosave + prev/next + 미기록/기록중/완료 |
| MOVE IMPACT | ❌ **동결** (Field Data 축적 후 재개) |

Profile 테이블·URL **변경 없음** (Phase 0–2).

### Field Capture v0.1 — 구현 범위 (완료)

| 영역 | 내용 |
|------|------|
| 회기 생성 | program · session number · date · main activities · `[회기 시작]` |
| 아동 기록 | attendance · observation_opportunity_band · participation · support · independent_initiation · self_reengagement · SPOMOVE/FRW · movement domains · observation_note |
| API | `POST /api/move-report/track/sessions` · `GET/PUT .../sessions/:sessionId/records/:childId` (movement_experiences 포함) |
| Validation | SM-08: `frw_status=observed_stable` → `observation_opportunity_band=three_plus` only (blocking) |
| UX | autosave 700ms · 이전/다음 아동 · 아동별 미기록/기록중/완료 · 모바일 우선 sticky bar |

### MOVE REPORT 개발 동결 (이번 Sprint 이후 구현 금지)

아래 기능은 **Field Data 축적 + ESG Core Deck + Pilot 요구 확정** 전까지 보류:

- MOVE IMPACT Dashboard
- 기업 Dashboard
- PDF Report · AI Summary · Case Study Builder
- External Assessment UI · Viewer UI · Parent Report · Benchmark
- `/move-report` 허브 REPLACE (CC-MR-03)

**Definition of Done (달성):**

> **현재 운영 중인 특수체육 현장에서 강사가 실제 회기 데이터를 MOVE TRACK에 누적할 수 있다.**

---

## ROUTING (Approved)

Phase 0–2: `/move-report` = Profile · `/move-report/profile` alias · `/move-report/track/*` 신규
Phase 3: 허브 REPLACE (Pending `CC-MR-03`)

---

## API ENDPOINT (Field Capture v0.1)

Base: `/api/move-report/track/` — Server API + `service_role`, `requireMoveReportTrackInstructor()`

| Method | Path | Notes |
|--------|------|-------|
| GET | `/programs` | 강사 접근 가능 사업 목록 |
| POST | `/sessions` | 회기 생성 |
| GET | `/sessions/:sessionId` | 회기 메타 |
| GET | `/sessions/:sessionId/records/:childId` | 아동 + record + movement_experiences |
| PUT | `/sessions/:sessionId/records/:childId` | upsert; `is_draft` true=임시저장, false=완료 |

Record PUT body: `independent_initiation`, `self_reengagement`, `frw_seconds`, `frw_status`, per-field NULL, `movement_experiences[]`.

Completed session PATCH (`status = locked`) + `change_reason` — **v0.1 미구현** (동결).

---

## PHASE 1 SCREENS (Field Capture v0.1 — shipped)

| Route | Screen |
|-------|--------|
| `/move-report/track` | Track hub |
| `/move-report/track/programs` | 사업 목록 |
| `/move-report/track/programs/[id]` | 사업 상세 · 회기 시작 CTA |
| `/move-report/track/sessions/new` | 회기 생성 |
| `/move-report/track/sessions/[id]` | 아동 목록 (미기록/기록중/완료) |
| `/move-report/track/sessions/[id]/children/[childId]` | 아동 기록 (autosave) |

P1-08 입력: NULL `[이번 회기 평가하지 않음]` per field, FRW seconds + status, initiation + reengagement 분리.

---

## AUDIT (수정 9)

`mr_record_audit_log.change_reason` — `mr_record_change_reason` ENUM:

| Value | Label |
|-------|-------|
| `input_error` | 입력 오류 |
| `missing_record` | 기록 누락 |
| `field_verification` | 현장기록 확인 후 수정 |
| `admin_correction` | 관리자 수정 |
| `other` | 기타 |

완료(`locked`) 세션 수정 시 API에서 **필수**.

---

## APPROVED CONTRACT CHANGES

| ID | Decision | Status |
|----|----------|--------|
| CC-MR-01 | `mr_*` TRACK 모델 | ✅ Approved |
| CC-MR-02 | `/move-report/profile` alias | ✅ Approved (REFINE) |
| CC-MR-03 | 허브 REPLACE | Phase 3 Pending |
| CC-MR-04 | voluntary → independent + self_reengagement | ✅ Governance Rev.1 |
| CC-MR-05 | FRW → frw_seconds + frw_status | ✅ Governance Rev.1 |
| CC-MR-06 | NULL ≠ 0 semantics | ✅ Governance Rev.1 |

---

## STOP CONDITIONS

1. Scoring Manual v0.1 미승인 → label PR
2. I1–I9 위반
3. Dimension 합산 score 컬럼/API 추가
4. Session record에 assessment_period ENUM
5. Direct action cue를 independent_initiation에 포함

---

## NEXT STEPS

1. ~~Scoring Manual v0.1~~ → **Field Pilot 확정** ([Manual](./MOVE_REPORT_SCORING_MANUAL_v0.1.md))
2. ~~Migration Rev.2~~ → **적용 완료** ([SSOT](../../supabase/migrations/20260829130000_move_report_track_core.sql))
3. ~~Phase 0 alias + auth~~ → **완료**
4. ~~Field Capture v0.1~~ → **완료**
5. **MOVE REPORT 개발 동결** — 현장 Field Data 축적 · Pilot 일치도(SM-17) · ESG Deck 확정 후 IMPACT/Viewer 등 재개 여부 PO 결정
