# 04. CENTER_MODAL_REFACTOR_PLAN

**대상:** `CenterDetailClient.tsx` (+ `CenterDetailModal.tsx` shell)  
**목표:** 정보 구조·탭화·정산/강사료 SSOT 연결 (동작 보존)

---

## 1. 현재 문제 (코드 근거)

| 문제 | 근거 |
|------|------|
| 카드 평면 나열 — 운영 메모·계약·강사·회보서·시간표 혼재 | `CenterDetailClient.tsx` L671+ 다수 `rounded-xl border` 카드 |
| 강사료·교구·비용 구분 없음 | `session_fee`만 표시; instr/assist/rental 없음 |
| 정산 연동 UI 없음 (센터 쪽) | `SettlementCenterLink`는 **MASTER 시트 전용** |
| 강사 선택 시 fee 미표시 | `getActiveTeachers` id/name; onChange fee 없음 |
| 보조 = backup **문자열** | L765–768, edit L1220 |
| 시설 PW 상세 노출 | reveal 버튼 있음 — 지시서는 권한 검토·제한 요구 |
| 저장 시 `instructors_default.sub` 강제 null | L523–524 |

---

## 2. 변경 후 구조

### 2.1 상단 고정 요약 (sticky)

| 필드 | SSOT | 빈 값 |
|------|------|--------|
| 센터명 | `centers.name` | — |
| 운영 상태 | `status` | — |
| 지역 | `region_tag` | 미설정 |
| 주 담당 강사 | `main_teacher_name` | 미배정 |
| 회당 수업료 | `session_fee` | **미설정** (0 표시 금지) |
| 강사료 요약 | computed `effectiveFees` 주/보조 | **확인 필요** |
| 정산 연동 | policy `center_id` 역조회 | 미연결 |
| 수정 | 기존 edit modal | — |

**정산 역조회:** 신규 server action or API — `admin_settlement_sheet_centers` where `payload->>center_id = $uuid` (service_role, requireAdmin).

### 2.2 탭

#### 탭 1 — 기본정보

- 기관명·주소·연락처·담당자·계약·주간 일정·출입·highlights
- 긴 텍스트: `<details>` 또는 truncate + expand
- **시설 인증:** `criminal_check_facility_id`만 기본; PW/파일은 **별도 「민감 정보」** 접근 (기존 `getCenterCriminalCheckPassword` + role gate 유지/강화)

#### 탭 2 — 수업 및 금액

**수업 운영**

- `weekly_schedule`, session type default (없으면 product default `center` 가정 명시)
- `main_teacher_id`, `main_teacher_2_id`, `main_teacher_3_id` — select UUID
- 보조: Phase 1 backup 문자열 유지 + Phase 2 UUID (승인 후)

**금액**

- 센터 청구: `session_fee` (독립)
- 주강/보조 **표시:** teacher 선택 onChange → `class-ops/reference` 또는 확장 `getActiveTeachers` + tier map → `resolveDefaultSessionPrice` / `resolveDefaultAssistSessionPrice`
- **저장:** UUID만 centers; **강사료 숫자는 users SSOT** (센터 row에 중복 저장하지 않음 — 예외 단가 필요 시 별도 `center_teacher_fee_overrides` PD)
- 교구/기타/VAT: **센터 탭에 저장하지 않음** — 정산 policy SSOT (read-only 요약)

#### 탭 3 — 정산

- 연결 policy id(들), `SettlementCenterLink` **재사용 또는 공유 컴ponent 추출**
- 월별: `GET /api/admin/settlement-sheet` scoped read — **MASTER_EMAIL** 제한 → 센터 모달은 **requireAdmin + 동일 MASTER gate** 또는 read-only subset API (PD)
- 표시: sessions, fee total, instr/assist/rental from `rateFor(center, monthKey)`
- 확정 상태: `locked`

#### 탭 4 — 운영기록

- 기존 `center_history` UI 이동 (CRUD 유지)
- 형식 변환·삭제 금지

---

## 3. 강사 선택 → 자동 책정 (필수)

```text
1. User selects teacher UUID in edit form
2. Load TeacherFeeRow (+ log_count) — reuse class-ops/reference fetch pattern
3. tier = computeTier(session_count + log_count)
4. fees = effectiveFees(tier, user fees, tierFeeMap)
5. Display: main → fee_center_main path via resolveDefaultSessionPrice(teacher, 'center_regular', map)
            assist slot → resolveDefaultAssistSessionPrice(...)
6. Save updateCenter({ main_teacher_id, ... }) only
7. Settlement month aggregates unchanged until MASTER edits policy/month rows
```

**검증:** duplicate UUID across main1/2/3 — client + zod.

---

## 4. 변경 파일 (예상)

| 파일 | 변경 |
|------|------|
| `app/admin/centers/[id]/CenterDetailClient.tsx` | 탭·요약·fee preview |
| `app/admin/centers/components/CenterDetailModal.tsx` | layout width/scroll |
| `app/admin/centers/actions/centers.ts` | optional `getSettlementPoliciesForCenter` |
| `app/admin/master/reports/SettlementCenterLink.tsx` | extract `SettlementCenterLinkCore` for reuse |
| `app/lib/centers/types.ts` | UI-only types for fee preview |
| `app/admin/centers/centers.integration.test.ts` | fee preview mock, tab smoke |

**신규 금지:** duplicate `effectiveFees`, new settlement tables.

---

## 5. 전후 (ASCII)

**Before:** Header → Grid 6~8 cards → History block → Edit dialog (all fields)

**After:**

```text
[Summary bar: name | status | region | main | session_fee | fee hint | settlement link | Edit]
[ Tab: 기본 | 수업·금액 | 정산 | 운영기록 ]
  ... tab panel ...
```

---

## 6. 반응형

- 탭: horizontal scroll mobile; summary 2-column → stack
- 기존 `max-w-4xl`, safe-area padding 유지

---

**상태:** `DESIGN_READY` (UI — MASTER read gate 결정 pending)
