# SPOKEDU 교구 재고 — 출시 승인 게이트 (Stage 5)

**현재 릴리스 상태:** `RELEASE_BLOCKED`  
**사유:** 구현·QA·DB 실측 **미착수**; DATA/FUNCTIONAL/SECURITY 게이트 **미검증**

---

## 1. DATA_INTEGRITY (필수 0건)

| 검사 | 기준 | 현재 |
|------|------|------|
| 재고 수량 불일치 | catalog total vs rentals+quarantine+available | **NOT_RUN** |
| 음수 가용 | available < 0 | **NOT_RUN** (현행: 창고 개념 없음 → N/A) |
| 중복 대여 | 동일 idempotency 2회 반영 | **NOT_RUN** |
| 중복 반납 | returned > lent | **NOT_RUN** |
| 기존 데이터 손실 | catalog/inventory/logs row count 감소 (cutover 전후) | **NOT_RUN** |

**현행 코드 사전 리스크 (감사):** 무한 배부·last-write-wins — **릴리스 전 Must Fix**.

---

## 2. FUNCTIONAL_PARITY

| 항목 | 기준 | 현재 |
|------|------|------|
| 미승인 기능 삭제 | 0건 | N/A (미구현) |
| 교구 사진·상세 | 보존 | **DESIGN:** KEEP |
| 강사 DB | users 연동 | **PASS** (현행) |
| 대여·반납 시나리오 | §5 QA 목록 | **NOT_RUN** |
| teacher 읽기 | /teacher/inventory | **PASS** (현행) |
| CSV·3탭 | 지시서 | **NOT_RUN** |

---

## 3. SECURITY

| 항목 | 기준 | 현재 |
|------|------|------|
| 비로그인 admin | 차단 | **PARTIAL** — layout check-admin (**E2E NOT_RUN**) |
| 비관리자 write | 차단 | **RISK** — inventory/catalog **client write** (**RLS NOT_VERIFIED**) |
| server qty 검증 | RPC | **FAIL** (현행 없음) |
| 원장 무단 삭제 | UI/API 불가 | **FAIL** (inventory_logs delete UI) |
| 이미지 upload | requireAdmin | **PASS** (images route) |
| RLS 우회 | service_role server only | **PARTIAL** |

---

## 4. RELEASE_READINESS

| 항목 | 요구 | 현재 |
|------|------|------|
| TypeScript | changed files clean | **NOT_RUN** |
| ESLint | changed files | **NOT_RUN** |
| Production build | pass | **NOT_RUN** |
| Vitest (equipment) | contract tests | **NOT_RUN** |
| Playwright E2E | rent/return paths | **NOT_RUN** |
| Staging migration | expand applied + backfill | **NOT_RUN** |
| Rollback plan | documented | **PASS** (DATA_MIGRATION §6) |
| 사용자 배포 승인 | explicit | **PENDING** |

---

## 5. 필수 QA 체크리스트 (실행 시 기록)

### 재고 정합성

- [ ] 교구 신규 등록  
- [ ] 교구 수정  
- [ ] 정상 입고 (adjust)  
- [ ] 정상 대여  
- [ ] 가용 초과 대여 차단  
- [ ] 부분 반납  
- [ ] 전체 반납  
- [ ] 중복 반납 차단  
- [ ] 총보유 감소 검증 (outstanding 존재 시 차단)  
- [ ] 점검 재고 분리  
- [ ] 조정 이력 보존  

### 강사별

- [ ] 강사 선택 (role filter)  
- [ ] 보유 교구 조회  
- [ ] 동일 교구 반복 대여  
- [ ] 복수 강사 동일 교구  
- [ ] 강사별 합계 = 원장 SUM  
- [ ] 비활성 강사 이력 보존  
- [ ] 강사 전환 시 데이터 혼입 없음  

### 동시성

- [ ] 동시 대여  
- [ ] 대여+반납 동시  
- [ ] 중복 클릭 / idempotency  
- [ ] 네트워크 재시도  
- [ ] 지연 중 중복 제출  
- [ ] 부분 성공 없음 (atomic)  

### 회귀

- [ ] catalog 메타·이미지  
- [ ] image upload  
- [ ] sync-by-email inventory  
- [ ] teacher inventory  
- [ ] 타 기능 catalog 혼동 없음  

### 보안

- [ ] 비로그인 API 401  
- [ ] teacher rent API 403  
- [ ] 타 user inventory 접근 불가  

### 품질·반응형

- [ ] desktop / tablet / mobile  
- [ ] 대량 이력 페이지네이션  

**규칙:** 체크는 실제 수행 후 PASS/FAIL만 기록. 추측 PASS **금지**.

---

## 6. 차단 조건 (하나라도 해당 시 RELEASE_BLOCKED)

1. DATA_INTEGRITY 미충족  
2. FUNCTIONAL_PARITY — KEEP 항목 회귀  
3. SECURITY — server 검증·삭제 정책 미해결  
4. Staging migration 실패  
5. Rollback 미검증  
6. 운영 DB DDL/RLS **`NOT_VERIFIED`** 상태에서 cutover  

---

## 7. 잔여 위험 (승인 시 수용 가능 목록 — 현재)

| ID | 위험 | 심각도 | 완화 일정 |
|----|------|--------|-----------|
| R1 | Repo에 DDL 없음 | High | P0 schema export |
| R2 | Legacy name-linked inventory | High | P3 backfill |
| R3 | 창고 total 미입력 | High | 실사 |
| R4 | Client direct write | High | P6 |
| R5 | 프리셋 정책 미정 | Medium | PD |

---

## 8. 롤백 절차 (요약)

1. Feature flag OFF → legacy page (read-only warehouse 권고).  
2. 신규 RPC disable (migration rollback **마지막 수단**).  
3. Restore pg_dump if data corruption.  
4. Post-mortem + UNMAPPED 재처리.

---

## 9. 최종 판정 템플릿

```text
RELEASE_DECISION: BLOCKED | APPROVED
DATE:
VERIFIED_BY:
DATA_INTEGRITY: PASS|FAIL|NOT_RUN
FUNCTIONAL_PARITY: PASS|FAIL|NOT_RUN
SECURITY: PASS|FAIL|NOT_RUN
RELEASE_READINESS: PASS|FAIL|NOT_RUN
```

**2026-10-30 기록:** `RELEASE_BLOCKED` / 전 항목 `NOT_RUN` 또는 `FAIL`(현행 보안·무결성)
