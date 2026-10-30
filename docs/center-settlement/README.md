# 센터 관리 · 정산 연동 — 감사 및 설계 (Stage 0)

**판정:** `AUDIT_COMPLETE` / `DESIGN_READY` / `IMPLEMENTATION_NOT_STARTED` / `RELEASE_BLOCKED`

**운영 DB 직접 변경·DDL/DML·배포:** 승인 전 금지.

## 제출물

| 문서 | 내용 |
|------|------|
| [CENTER_SETTLEMENT_CODE_AUDIT.md](./CENTER_SETTLEMENT_CODE_AUDIT.md) | 센터·정산 코드 경로, 데이터 흐름, `centers` 0건 불일치 규명 |
| [TEACHER_FEE_INTEGRATION_AUDIT.md](./TEACHER_FEE_INTEGRATION_AUDIT.md) | 강사 DB, `effectiveFees`, 수업·정산 연계 |
| [CENTER_SETTLEMENT_MAPPING_PLAN.md](./CENTER_SETTLEMENT_MAPPING_PLAN.md) | 59개 정산 항목 분류, UUID↔TEXT 연결 설계 |
| [CENTER_MODAL_REFACTOR_PLAN.md](./CENTER_MODAL_REFACTOR_PLAN.md) | 상세 모달 탭 구조, 필드 SSOT |
| [CENTER_SETTLEMENT_RELEASE_GATE.md](./CENTER_SETTLEMENT_RELEASE_GATE.md) | 구현 단계, 검증, 롤백, 배포 차단 조건 |

## Read-only 실측 (로컬 `.env.local` → Supabase ref `mwgvserdyflsqyhcqecp`)

```bash
node docs/center-settlement/_readonly_center_audit.mjs
```

결과 스냅샷: [`_audit_output.json`](./_audit_output.json) (2026-10-30 실행).

## 관련 기존 감사

- [CENTER_QUERY_AUDIT.md](../../CENTER_QUERY_AUDIT.md) — 목록/상세 쿼리 (승인 전 기록)
- [CENTER_OPTIMIZATION_IMPLEMENTATION_REPORT.md](../../CENTER_OPTIMIZATION_IMPLEMENTATION_REPORT.md) — 목록 DTO 최적화 반영
