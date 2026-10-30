# SPOKEDU 교구 재고 — 기능 패리티 매트릭스

**기준:** 현행 `app/admin/inventory/page.tsx`, `app/teacher/inventory/page.tsx` vs `교구 수불대장.html`  
**판정:** KEEP · ADAPT · REJECT · INVESTIGATE  
**날짜:** 2026-10-30

---

## 1. 화면·정보 구조

| 기능 | 현행 SPOKEDU | HTML V2 | 판정 | 비고 |
|------|-------------|---------|------|------|
| 3탭 (재고 / 강사 / 이력) | 없음 (사이드 catalog + 강사 선택 1뷰) | 있음 | **ADAPT** | 지시서 §5 확정 UI |
| 교구별 총보유·대여중·가용 | 없음 | `renderTable` | **KEEP** (업무) / **ADAPT** (DB) |
| 전체 교구 수량 KPI 카드 | 없음 | 강사 카드 “총 대여 수량” | **REJECT** (지시서 §1.2) |
| 관리번호 (PE-xxx) | 없음 | `code` | **ADAPT** | catalog 확장 필드 후보 |
| 카테고리 필터 | catalog에 category 있으나 UI 필터 없음 | 검색만 | **ADAPT** | |
| 교구 이미지·상세·활용 | **있음** (모달) | 없음 | **KEEP** | SPOKEDU 우위 |
| 강사 DB 연동 | **users** | 하드코드 TEACHERS | **KEEP** SPOKEDU / **REJECT** HTML |
| 강사 카드 그리드 | 드롭다운만 | `renderTeachers` | **ADAPT** | |
| 대여·반납 이력 테이블 | 텍스트 로그 패널 | `renderRentals` | **ADAPT** | 원장 모델 필요 |
| CSV 내보내기 | 없음 | exportItemsCSV / exportRentalsCSV | **ADAPT** | 서버 페이지네이션 후 |
| 모바일 | 사이드바·그리드 | 반응형 CSS | **KEEP** both / **ADAPT** merge |

---

## 2. HTML 함수별 분류

| 함수/영역 | 업무 요약 | 판정 | 통합 방향 |
|-----------|-----------|------|-----------|
| `renderTable` | 교구별 재고 표 | **KEEP** | React 테이블 + 서버 집계 |
| `renderTeachers` | 강사 카드 | **KEEP** | DB users + 보유 종류 수 (수량 합 KPI 제외) |
| `renderRentals` | 이력 테이블 | **KEEP** | `equipment_transactions` SSOT |
| `getRentedQty` | item별 미반납 합 | **KEEP** | DB view/RPC, 클라이언트 최종 검증만 |
| `getAvailableQty` | total − rented | **ADAPT** | 격리/점검 qty 포함 (지시서 §3.2) |
| `openItemModal` / entryForm | 교구 CRUD | **ADAPT** | SPOKEDU catalog 필드 + qty_total 분리 |
| `deleteItem` | 교구 삭제 | **ADAPT** | soft-delete / active rental 차단 |
| `openRentalModal` | 대여 UI | **KEEP** | Admin API + 트랜잭션 |
| `returnRental` | 전량 반납 1건 | **ADAPT** | 부분 반납 + 전량 반납 |
| `deleteRental` | 이력 삭제 | **REJECT** | 원장 append-only |
| `applyPresetsToTeacher` | 15종 일괄 | **INVESTIGATE** | 승인 후; 자동 catalog/재고 생성 **금지** |
| `clearAll` | localStorage 초기화 | **REJECT** | |
| `downloadCSV` / export* | CSV | **KEEP** | |
| localStorage `save` | 영속 | **REJECT** | Supabase only |
| `showToast` | 피드백 | **ADAPT** | sonner (현행) |

---

## 3. 현행 SPOKEDU 기능별 분류

| 기능 | 판정 | 통합 시 |
|------|------|---------|
| catalog CRUD (메타) | **KEEP** | 마스터 SSOT 유지 |
| catalog DELETE | **INVESTIGATE** | rental/inventory 참조 정책 필요 |
| 이미지 업로드 API | **KEEP** | 유지 |
| DnD 배부 | **ADAPT** | “대여” 플로우 + 수량 입력 |
| +1 고정 배부 | **REJECT** | 가용 재고 검증 대여로 대체 |
| 강사별 inventory 스냅샷 | **ADAPT** | 원장 파생 또는 `catalog_id` FK 보유 |
| `name` merge | **REJECT** | `catalog_id` 필수 |
| 수량 직접 수정 (관리자) | **INVESTIGATE** | “조정” vs “반납/대여” 분리 (§4.4) |
| 전량 반납 DELETE | **REJECT** | 반납 거래 + qty 0 |
| inventory_logs 텍스트 | **ADAPT** | 구조화 이력 + 선택적 요약 로그 |
| 로그 DELETE | **REJECT** | |
| 로그 limit 50/30 | **REJECT** | 페이지네이션 |
| teacher 읽기 전용 | **KEEP** | 반납은 admin 또는 정책 승인 후 |
| teacher `Total: length` | **KEEP** (종류 수) | 지시서와 충돌 없음 |
| fetchTeachers is_active only | **ADAPT** | role=teacher(?) 필터 — **DB role enum NOT_VERIFIED** |

---

## 4. 지시서 목표 vs 현행 vs HTML

| 요구 (§1) | 현행 | HTML | 목표 구현 |
|-----------|------|------|-----------|
| 창고 총보유 | ✗ | ✓ (items.qty_total) | DB 컬럼/테이블 |
| 대여 중/가용 | ✗ | ✓ (rentals) | 원장 SUM |
| 대여 버튼 | △ (+1 배부) | ✓ | 모달 + RPC |
| 부분 반납 | ✗ (수량 edit) | ✗ (전량만) | 신규 |
| 이력 추적 | △ 텍스트 | △ 단순 rental row | append-only ledger |
| 프리셋 15종 | ✗ | ✓ (위험) | INVESTIGATE |
| 무의미 KPI 합산 | ✗ | △ 강사 카드 | REJECT |

---

## 5. 회귀 보존 필수 (FUNCTIONAL_PARITY)

다음은 리팩터 후 **반드시 유지** (KEEP):

1. `catalog` 교구명, 카테고리, image, simple_desc, key_points, usage_examples  
2. 관리자·강사 상세 모달 (활용 방법 링크 렌더)  
3. `/teacher/inventory` 강사 조회 경로  
4. `/api/admin/inventory/images` + bucket  
5. Sidebar / teacher nav 링크  
6. `sync-by-email` 시 inventory user_id 이관 (병합 시)

---

## 6. 요약

- **HTML:** 업무 흐름·3탭·표 형태는 **참고 원본 (ADAPT)**; localStorage·clearAll·이력삭제·프리셋 자동 생성·innerHTML은 **REJECT**.  
- **SPOKEDU:** 교구 **콘텐츠·이미지·강사 DB**는 **KEEP**; 수불 **데이터 모델 전체**는 **ADAPT/교체**.  
- **승인 필요:** 프리셋 정책, 관리자 수량 직접 수정 범위, catalog 삭제 규칙, teacher 반납 권한.
