# MOVE REPORT TRACK — DB Design (수정본)

**Status:** **Migration 적용됨** — SSOT: [`supabase/migrations/20260829130000_move_report_track_core.sql`](../../supabase/migrations/20260829130000_move_report_track_core.sql)
**Revision:** Governance Rev.1 + Scoring Manual v0.1 sync + Field Capture v0.1
**Companion:** [Sprint Brief](./MOVE_REPORT_TRACK_SPRINT_BRIEF.md) · [Migration Draft (historical/reference)](./MOVE_REPORT_TRACK_MIGRATION_DRAFT.sql) · [Scoring Manual v0.1](./MOVE_REPORT_SCORING_MANUAL_v0.1.md)

> **Draft SQL** (`MOVE_REPORT_TRACK_MIGRATION_DRAFT.sql`)는 Rev.2 설계 과정의 **historical reference**입니다. 스키마·RLS·ENUM의 **단일 진실 공급원(SSOT)** 은 위 정식 migration 파일입니다.

---

## 1. ERD (수정본)

```mermaid
erDiagram
    mr_institutions ||--o{ mr_program_institutions : hosts
    mr_programs ||--o{ mr_program_institutions : "M:N"
    mr_programs ||--o{ mr_program_instructors : assigns
    mr_programs ||--o{ mr_program_viewers : grants
    mr_programs ||--o{ mr_program_children : enrolls
    mr_programs ||--o{ mr_track_sessions : runs
    mr_children ||--o{ mr_program_children : enrolled_in
    mr_children ||--o{ mr_session_child_records : observed
    mr_track_sessions ||--o{ mr_session_child_records : contains
    mr_session_child_records ||--o{ mr_movement_experiences : expands
    mr_session_child_records ||--o{ mr_record_audit_log : versions
    mr_children ||--o{ mr_external_assessments : "v1.1"

    mr_session_child_records {
        uuid id PK
        mr_attendance_status attendance_status
        mr_observation_opportunity_band observation_opportunity_band "NULL|one|two|three_plus SM-02"
        smallint participation_level "NULL|0-4 Typical SM-03"
        smallint support_level "NULL|0-4 Typical SM-06"
        smallint independent_initiation "NULL|0-3 SM-04"
        boolean self_reengagement "NULL|false|true SM-07"
        boolean spomove_used CONTEXT
        smallint frw_seconds "NULL|1-6 SYSTEM SM-08"
        mr_frw_status frw_status "NULL SYSTEM SM-08"
        text observation_note "Meaningful Change SM-11"
        int record_version
    }

    mr_track_sessions {
        uuid id PK
        int session_number
        date session_date
        mr_session_status status
    }

    mr_external_assessments {
        mr_measurement_timing timing "PRE|MID|POST|FOLLOW_UP"
    }
```

> **없음:** session/record上的 `assessment_period` (EARLY/MID/LATE) — Impact App 계산 only.

---

## 2. 변경된 Table / Column / ENUM 요약

### 신규·변경 ENUM

| ENUM | Values | 용도 |
|------|--------|------|
| `mr_observation_opportunity_band` | `one`, `two`, `three_plus` (+ NULL = 평가하지 않음) | SM-02 참여기회 |
| `mr_frw_status` | `exploratory`, `observed_stable`, `not_determined` | FRW 안정성 (SYSTEM) |
| `mr_record_change_reason` | `input_error`, `missing_record`, `field_verification`, `admin_correction`, `other` | Audit |
| `mr_measurement_timing` | `pre`, `mid`, `post`, `follow_up` | 외부 검사 only |

### 폐기

| Item | 대체 |
|------|------|
| `voluntary_initiation` | `independent_initiation` + `self_reengagement` |
| `mr_frw_seconds` enum | `frw_seconds` smallint 1–6 + `frw_status` |
| `functional_response_window` column | `frw_seconds` + `frw_status` |
| `mr_assessment_timing` | `mr_measurement_timing` (+ follow_up) |

### `mr_session_child_records` — MVP Core (Rev.1)

| Column | Type | Null | Source | Semantics |
|--------|------|------|--------|-----------|
| `attendance_status` | mr_attendance_status | NO | CONTEXT | |
| `absence_reason` | mr_absence_reason | YES | CONTEXT | |
| `observation_opportunity_band` | mr_observation_opportunity_band | YES | CONTEXT | SM-02; NULL=평가하지 않음 |
| `participation_level` | smallint | YES | OBSERVED | NULL=NA, 0–4=Typical (SM-03, SM-10) |
| `support_level` | smallint | YES | OBSERVED | NULL=NA, 0–4 |
| `independent_initiation` | smallint | YES | OBSERVED | NULL=NA, 0–3 frequency |
| `self_reengagement` | boolean | YES | OBSERVED | NULL=NA, false/true |
| `spomove_used` | boolean | YES | CONTEXT | |
| `frw_seconds` | smallint | YES | SYSTEM | 1–6; spomove false → NULL |
| `frw_status` | mr_frw_status | YES | SYSTEM | |
| `observation_note` | text | YES | OBSERVED | Meaningful Change, ≤150 |
| `record_version` | int | NO | — | |
| `is_draft` | boolean | NO | — | |
| `quality_flags` | jsonb | YES | — | |
| `created_by` / `updated_by` | uuid | | — | |
| `created_at` / `updated_at` | timestamptz | NO | — | |

**CHECK:**

- `participation_level`, `support_level`: NULL OR 0–4
- `independent_initiation`: NULL OR 0–3
- `frw_seconds`: NULL OR 1–6
- absent → observational + FRW fields NULL
- `spomove_used = false` → `frw_seconds`, `frw_status` NULL

### `mr_record_audit_log` (Rev.1)

| Column | Type | Notes |
|--------|------|-------|
| `change_reason` | mr_record_change_reason | locked 수정 시 API 필수 |
| `change_reason_note` | text | `other` 시 |
| `snapshot` | jsonb | row + movement_experiences |

### `mr_external_assessments`

| Column | Type |
|--------|------|
| `measurement_timing` | mr_measurement_timing (PRE/MID/POST/FOLLOW_UP) |

---

## 3. ENUM 상세

### `mr_observation_opportunity_band` (SM-02)

| Value | UI Label | Structured field rule |
|-------|----------|----------------------|
| NULL | 평가하지 않음 | Related fields NULL |
| `one` | 1회 | 입력 가능; 대표값 해석 제한 (SM-09) |
| `two` | 2회 | mode 또는 보수적 tie-break |
| `three_plus` | 3회 이상 | Typical Performance mode (SM-10) |

### `independent_initiation` (SM-04)

| Value | Label |
|-------|-------|
| NULL | Not Assessed |
| 0 | 없음 (기회 있었으나) |
| 1 | 1회 |
| 2 | 반복 (동일 활동/유형 2회+) |
| 3 | 활동 전반 반복 (서로 다른 기회/구간) |

### `self_reengagement` (boolean nullable)

| Value | Label |
|-------|-------|
| NULL | 관찰기회 없음 |
| false | 관찰되지 않음 |
| true | 이탈 후 스스로 재참여 |

### `frw_seconds` + `frw_status`

| frw_seconds | UI Label | Growth Impact |
|-------------|----------|---------------|
| 6 | Extended Access | ✅ if observed_stable |
| 5 | Standard Access | ✅ |
| 4 | Progressive | ✅ |
| 3 | Condensed | ✅ |
| 2 | Advanced | ✅ |
| 1 | Challenge Setting | ❌ excluded (I5) |

| frw_status | Meaning |
|------------|---------|
| `exploratory` | 탐색·변동 중 |
| `observed_stable` | 안정적 참여 확인 |
| `not_determined` | 판정 보류 |

Growth-phase KPI: `frw_seconds BETWEEN 2 AND 6 AND frw_status = 'observed_stable'` (SM-08: min 3 meaningful opportunities for observed_stable).

### `mr_record_change_reason`

`input_error` · `missing_record` · `field_verification` · `admin_correction` · `other`

### `mr_measurement_timing` (external only)

`pre` · `mid` · `post` · `follow_up`

---

## 4. NULL Semantics (I9)

```
NULL  = Not Assessed / Not Observable  →  UI: [이번 회기 평가하지 않음]
0     = Assessed, behavior not observed
1..n  = Observed value
```

`self_reengagement`: NULL / false / true (tri-state, 0 is **not** used).

---

## 5. Impact Dimensions → Proxy (No DB Score)

| Dimension | Proxy | Storage |
|-----------|-------|---------|
| ACCESS | attendance + participation entry | fields above |
| INVOLVEMENT | participation pathway + domains | fields + `mr_movement_experiences` |
| INDEPENDENCE | support + independent_initiation | fields above |
| EXPERIENCE BREADTH | distinct participated domains | `mr_movement_experiences` |

**No** `access_score`, `dimension_total`, or composite columns.

### Impact Period (App only)

```text
total_sessions = N
EARLY = sessions in [1, floor(N*0.25)]
MID   = sessions in [floor(N*0.375)+1, floor(N*0.625)]  -- center 25%
LATE  = sessions in [N - floor(N*0.25) + 1, N]
```

(session_number 기준, record에 ENUM 저장 안 함)

---

## 6. Typical Performance vs observation_note

| Storage | Role |
|---------|------|
| `participation_level`, `support_level`, `independent_initiation`, `self_reengagement`, FRW | **Typical Performance** (mode, ≥3 opportunities, conservative tie-break) |
| `observation_note` | **Meaningful Change** |

---

## 7. `mr_field_source_catalog` (updated seed)

| field_key | source_type |
|-----------|-------------|
| `observation_opportunity_band` | CONTEXT |
| `independent_initiation` | OBSERVED |
| `self_reengagement` | OBSERVED |
| `frw_seconds` | SYSTEM |
| `frw_status` | SYSTEM |
| (removed `voluntary_initiation`, `functional_response_window`) | |

---

## 8. RLS 정책표

Migration SSOT [`20260829130000_move_report_track_core.sql`](../../supabase/migrations/20260829130000_move_report_track_core.sql) 적용.

Server API + service_role write; authenticated read via `mr_can_read_program`.
Viewer: `mr_children` direct SELECT 불가 — `mr_children_impact_safe` view 사용.

---

## 9. Indexing (unchanged)

`uk_session_child`, `idx_records_child`, `idx_audit_record`, etc.

---

## 10. Profile 분리 (unchanged)

`move_report_*` ↔ `mr_*` — no FK.
