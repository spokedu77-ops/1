# 02. TEACHER_FEE_INTEGRATION_AUDIT

**범위:** `users`, `teacher_tier_fees`, 수업 기본가, 정산 policy 금액  
**판정:** 감사 완료 — **기존 함수 재사용 필수**

---

## 1. 테이블·코드 SSOT

### 1.1 `public.users` (강사)

운영 필드 (센터·수업·정산에서 실제 사용):

| 필드 | 역할 |
|------|------|
| `fee_private` | 개인/기본 private |
| `fee_group` | 그룹 |
| `fee_center_main` | **센터 주강** 회당 |
| `fee_center_assist` | **센터 보조** 회당 |
| `fee_auto_from_tier` | UI/저장: 등급표 일괄 적용 플래그 (`users/page.tsx`) |
| `session_count` | 등급 산정 입력 (+ logs) |
| `role`, `is_active` | 센터 `getActiveTeachers` 필터 |

**실측:** `fee_auto_from_tier = true` → **75**명 (`_audit_output.json`).

### 1.2 `teacher_tier_fees`

- **5** tier rows (`teacher_tier_fees` count).
- 로드: `app/lib/teacherTierFeesStore.ts` → `TierFeeMap`.
- 관리 UI: `app/admin/users/page.tsx` (등급별 draft 저장).

### 1.3 `teacher_profiles`

- **저장소 코드 참조 0건** (`grep teacher_profiles` — app/supabase migrations 외 없음).
- 지시서의 `teacher_profiles.grade`는 **현재 앱 SSOT가 아님**. 등급은 **`computeTier(session_count + logCount)`** 로 파생.

---

## 2. 단가 우선순위 (실행 코드 기준)

**SSOT 함수:** `app/lib/teacherTierSchedule.ts` → `effectiveFees(tier, stored, feeMap)`

```105:121:app/lib/teacherTierSchedule.ts
export function effectiveFees(
  tier: TeacherTierId,
  stored: {
    fee_private: number | null;
    fee_group: number | null;
    fee_center_main: number | null;
    fee_center_assist: number | null;
  },
  feeMap?: Partial<TierFeeMap>
): TierDefaultFees {
  const d = getTierDefaultFees(tier, feeMap);
  return {
    fee_private: stored.fee_private ?? d.fee_private,
    fee_group: stored.fee_group ?? d.fee_group,
    fee_center_main: stored.fee_center_main ?? d.fee_center_main,
    fee_center_assist: stored.fee_center_assist ?? d.fee_center_assist,
```

**규칙 (신규 정의 금지):**

1. `computeTier(totalLessons)` — `session_count` + `logCount` (`totalLessonsFromCounts`).
2. 각 fee 컬럼: **DB 값이 null이면** 해당 tier의 `teacher_tier_fees` (없으면 `HARD_CODED_TIER_FEES`).
3. **`fee_auto_from_tier`는 `effectiveFees`에서 읽지 않음.**  
   - 관리 UI는 수동 입력 시 `fee_auto_from_tier: false`, 등급표 적용 버튼 시 필드를 tier 값으로 채우고 `true` (`users/page.tsx`).
   - 따라서 런타임 우선순위는 **「컬럼 null → tier fallback」** 이며, “자동 모드”는 **컬럼이 tier와 동기화된 상태**로 표현됨.

### 2.1 수업 타입별 적용 (주/보조)

**파일:** `app/admin/classes/lib/bulkSessionDefaults.ts`

| 함수 | 센터 수업 | 그룹 | 그 외 |
|------|-----------|------|-------|
| `resolveDefaultSessionPrice` | `fee_center_main` | `fee_group` | `fee_private` |
| `resolveDefaultAssistSessionPrice` | `fee_center_assist` | `fee_group` | (동일 assist 경로 아님 — non-center는 group) |

- `isCenterSessionType` / `isRegularGroupSessionType` — `sessionTypeCategory.ts`.
- **teacher null 시 하드코드 fallback** 30_000 / 25_000 — 센터 모달 설계 시 **「미설정」표시** 요구와 충돌 → 구현 시 null teacher는 0원 자동 책정 금지, fallback 제거 또는 UI 분기 필요 (Product Decision).

**호출 예:** `ClassBundlePanel.tsx`, `app/admin/classes/list/page.tsx`, `app/admin/classes/calendar/page.tsx`.

### 2.2 강사 reference API (수업용 풀 데이터)

`GET /api/admin/class-ops/reference` — `users` fee 컬럼 + `fetchTeacherLogCounts` → `log_count` (`app/api/admin/class-ops/reference/route.ts`).

**센터 모달은 현재 이 API를 쓰지 않음** — `getActiveTeachers()` only.

---

## 3. 주강사 · 공동 주강 · 보조 (배정 구조)

| 역할 | 센터 관리 저장 | 수업 런타임 | 정산 policy |
|------|----------------|-------------|-------------|
| 주강 1 | `main_teacher_id` UUID | session main teacher | `instr` (및 rates) |
| 공동 주강 2·3 | `main_teacher_2_id`, `main_teacher_3_id` UUID | **센터 JSON과 직접 연동 없음** — 수업별 배정 | policy는 **센터 단위** instr/assist; 강사 ID 없음 |
| 보조 1·2 | `instructors_default.backup[]` **이름**; `sub` deprecated | memo `extraTeachersFromMemo` 등 | `assist` |
| 레거시 문자열 | `instructors_default.main/sub` | 거의 미사용 | — |

**지시서 준수:** `main_teacher_2/3`을 보조로 **재해석하지 않음** — migration 주석 「메인 강사 2/3」.

**보조 2명:** 센터 테이블에 **UUID 2슬롯 없음**. 수업은 memo 다중 보조; 정산은 **금액 합산 `assist`**. 센터 모달에서 보조 1·2 UUID 도입 시 **신규 컬럼 또는 JSON 스키마 확장** + 수업/정산 스냅샷 설계 필요 (승인 항목).

---

## 4. 등급 변경 시 단가 반영

- 등급은 **수업 횟수 누적**에 따라 `computeTier`가 매 요청/일괄 적용 시 재계산.
- `users` fee 컬럼을 비워 두면 tier 변경 시 `effectiveFees` 결과가 **즉시** 바뀜.
- 수동 fee 저장 시 해당 컬럼 고정 → tier 올라도 **금액 불변** (null이 아니므로).
- **과거 확정 정산:** 시트 `locked` month + row 스냅샷; policy `rates[]`로 **월별 instr/assist** 이미 분리 가능 → 등급 변경 **소급 방지**는 시트/월 lock + rate history로 달성 (센터 모달에서 policy 직접 수정 시 rev conflict).

---

## 5. 수업 연기·취소·복구

- `sessions.status`, assistant trigger: `20261026163542_stage2a_sync_assistant_teacher_counts.sql` (contract test `sessionCountLogsSsot.contract.test.ts`).
- 강사료 금액: session row에 저장된 price 필드 + memo 보조 — **센터 `session_fee`와 독립**.
- 센터 모달 작업 범위: **기존 수업 연기·취소 로직 변경 금지** (지시서 §7).

---

## 6. 정산 연계 (강사료)

- **기관별 정산:** `admin_settlement_sheet_centers.payload` — `instr`, `assist`, `rental`, `cost`, `rates` (강사 UUID 없음).
- **강사별 레거시:** `settlements` + `TeacherSettlementReport.tsx` — session/ adjustment 기반.
- **목표 연동:** 센터 모달에서 강사 선택 → `effectiveFees` / `resolveDefault*` 로 **표시·제안** → 저장 시:
  - **운영:** `main_teacher_*` UUID (기존)
  - **정산 policy (선택):** `instr`/`assist` **스냅샷** — 자동 양방향 sync 금지; MASTER 시트 PUT은 별도 사용자 확인.

---

## 7. 센터 모달 구현 시 필수 재사용

```text
computeTier, totalLessonsFromCounts, effectiveFees  ← app/lib/teacherTierSchedule.ts
fetchTeacherLogCounts + tier map                    ← class-ops/reference 패턴
resolveDefaultSessionPrice                          ← 주강 (센터 session type 가정)
resolveDefaultAssistSessionPrice                    ← 보조
```

**금지:** 새 tier 우선순위, duplicate fee calculator, teacher 없을 때 0원 기본값 (지시서 §4).

---

## 8. 검증 매핑 (지시서 §6)

| 항목 | 통과 조건 | 근거 테스트/코드 |
|------|-----------|------------------|
| 주강사료 | `resolveDefaultSessionPrice` + center type | `bulkSessionDefaults` + class list |
| 보조 | `resolveDefaultAssistSessionPrice` | 동일 |
| 등급 자동 | null → tier map | `effectiveFees` unit behavior (calendar page) |
| 개별 단가 | non-null users column wins | `effectiveFees` |

---

## 9. 승인 필요 결정

1. 센터 모달 **보조 2 UUID** 저장 위치 (`instructors_default` 스키마 vs 신규 FK).
2. 공동 주강 2·3 선택 시 **강사료 UI** — 각각 `fee_center_main` 동일 적용 vs 정책상 공동 배분 (현재 코드 규칙 없음).
3. 정산 `instr/assist` **자동 제안 저장** 범위 — 표시 only vs MASTER payload 업데이트 (분리 원칙).

---

**상태:** `AUDIT_COMPLETE` (강사료 통합)
