# 05. CENTER_SETTLEMENT_RELEASE_GATE

**현재:** `IMPLEMENTATION_NOT_STARTED` / `RELEASE_BLOCKED` (운영 DB·배포 승인 전)

---

## 1. 구현 단계

| Phase | 내용 | DDL | 승인 |
|-------|------|-----|------|
| 0 | 본 감사·설계 문서 | 없음 | ✅ 제출 |
| 1 | 모달 탭·요약·기본정보/운영기록 이동 | 없음 | UI scope |
| 2 | 강사 UUID + `effectiveFees` preview (class-ops reference) | 없음 | fee fallback 정책 |
| 3 | 정산 탭: policy 역조회 + `SettlementCenterLink` | 없음 | MASTER read API |
| 4 | (선택) `center_settlement_links` + backfill | **migration** | OPS + rollback |
| 5 | 59건 `center_id` 수동/준자동 매핑 | DML **운영** | 별도 OPS gate |

---

## 2. 필수 테스트 (승인 scope에 포함 시)

| # | 대상 | 방법 |
|---|------|------|
| T1 | `centers.integration.test.ts` | CRUD·history regression |
| T2 | `settlement-sheet/route.test.ts` | locked 423, revision 409, center_id UUID validation |
| T3 | `settlement-centers/route.test.ts` | search + linked flag |
| T4 | Fee preview | unit: mock teacher → `resolveDefaultSessionPrice` parity with class list |
| T5 | Duplicate teacher ids | client validation |
| T6 | Rendered QA | desktop/tablet/mobile summary + tabs |

**금지:** 기존 테스트 기대값 임의 완화.

---

## 3. 데이터 보존 검증

| 체크 | 통과 |
|------|------|
| `admin_settlement_sheet_centers` row count | 59 ±0 |
| month payloads 2026-08~11 | byte-level or hash spot-check pre/post |
| `centers` row count | 52 ±0 (삭제 테스트 제외) |
| `settlements` | 83 ±0 |
| `center_history` | no truncate |
| locked month edit | 423 |

**Read-only baseline:** `node docs/center-settlement/_readonly_center_audit.mjs` → archive JSON.

---

## 4. 배포 차단 조건

- OPS 승인 없는 production DDL/DML
- 정산 59건 id/name payload 손실
- 확정 월 소급 수정 가능 regression
- 센터 모달에서 non-admin settlement write
- 강사료 0원 silent default (teacher missing / fee null)
- `main_teacher_2/3` reclassified as assist in persistence

---

## 5. 롤백

1. **앱:** revert deploy; feature flag if added.
2. **DB Phase 4:** run paired `down` migration dropping `center_settlement_links` only; **do not** delete sheet tables.
3. **payload.center_id:** JSON revert from backup export (MASTER restore flow exists — `kind: restore` with locked guard).
4. **Verify:** re-run `_readonly_center_audit.mjs`.

---

## 6. 검증 표 (지시서 §6) — 게이트 매핑

| 검증 대상 | Phase |
|-----------|-------|
| 기존 센터 조회 | 1 |
| 센터 등록·수정 | 1–2 |
| 정산 센터 연결 | 3–5 |
| 강사 선택·주/보조 fee | 2 |
| 등급 자동 단가 | 2 |
| 수업료 독립 | 2 |
| 교구 대여비 | 3 (read from policy) |
| 강사 변경·연기·취소 | no code change phase 1–3 |
| 월 마감 | 3 + existing API |
| RLS | service_role unchanged; no new public policies |

---

## 7. 릴리스 승인 체크리스트

- [ ] Product Decision: 보조 UUID, fee override, MASTER tab API
- [ ] OPS: mapping spreadsheet for 59 rows
- [ ] QA sign-off rendered + integration
- [ ] Migration review (if Phase 4)
- [ ] Explicit user: commit / push / deploy

---

**상태:** `RELEASE_BLOCKED` until Phase 1 implementation + QA complete
