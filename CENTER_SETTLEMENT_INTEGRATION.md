# 센터관리와 정산 연결 설계

> 2026-10-30 구현 반영: 기존 정책 id/월행 centerId는 유지하고 정책 JSON에 nullable center_id를 명시 선택해 저장한다. 새로운 master 전용 검색은 id/name/status/linked만, 선택한 센터 상세는 계약·session_fee 참고 필드만 반환한다. 연결은 금액/수금/과거 월을 갱신하지 않는다. 초기 scope=sheet GET은 정책 쿼리를 생략한다. 전체 정책은 기존 관리·일괄·기관명 입력·백업 기능 사용 시 지연 로딩해 기능을 보존한다. 정책 수정은 revision 조건으로 보호한다. 확정 월 보호를 위해 내용 변경을 동반한 unlock 및 확정 월 존재 시 전체 restore는 거부한다. DDL/migration 없음. [최종 보고](CENTER_OPTIMIZATION_IMPLEMENTATION_REPORT.md)가 최신 상태다. 아래는 승인 전 설계 기록이다.

상태: 제품 의미 확인 및 PO 승인 대기. 기존 `/admin/master/reports?tab=sheet`와 저장 데이터를 유지한다.

## D — 전체 정산 정책 선로딩 제거 영향도

| 항목 | 판정 |
|---|---|
| 실제 성능 병목 여부 | 정상 master 세션 미확보로 정책 수/payload bytes/조회·렌더 시간 미측정 |
| 정적 확인 | GET이 전체 정책 id/payload/revision을 반환하며 rate history도 payload에 포함. 전체 public.centers preload는 현재 없음 |
| 예상 효과(추정) | 월 첫 진입의 정책 payload 전송·파싱·상태 보관 감소 가능. 별도 정책 검색·선택 요청이 생겨 총 요청 수는 증가할 수도 있음 |
| 변경 파일 | settlement-sheet/route.ts, SettlementSheet.tsx, settlementSheetCore.ts, 필요 시 범위가 제한된 검색/정책 상세 endpoint |
| 회귀 위험 | 기존 월 생성/정규 일괄 추가/기관관리/미확정 반영/내보내기·복원 의존성 손실, 정책 revision 경쟁, 이름과 운영센터 ID 혼동 |
| 우선순위 | P1 정산 독립 작업. 전체 월 history 지연화는 P2 별도 검토 |

정책 payload가 작다면 endpoint 분리의 왕복 비용이 더 클 수 있다. 실제 첫 화면 필수 필드와 정책 조회량을 먼저 측정하고, 모든 정책을 감춘 채 동일 전체 JSON을 뒤에서 받아오는 변경은 최적화로 인정하지 않는다. 정책 검색과 운영센터 검색은 다른 데이터 계약이며 자동 통합하지 않는다.

센터관리의 상세/활성 강사 지연화와 정산 preload 제거를 한 번에 수행해 효과를 합산하지 않는다. 각각 전후 요청/bytes/시간을 기록한다. 정산의 일반 admin 차단 및 master 허용도 독립 검증한다.

## DB 마이그레이션 판정

현재 제안 범위의 목록 DTO, 모달, 조회 분리에는 DB 마이그레이션이 필요하지 않다. nullable center_id를 기존 정산 정책 JSON payload에 보존형으로 추가하는 안 역시 DDL 없이 가능하지만 코드 검증·호환 처리는 필요하다. 정책 id 및 과거 월 centerId를 변경하거나 데이터를 일괄 backfill하지 않는다.

FK/실제 컬럼/유일성 제약/검색 인덱스는 이번 승인 요청에 포함하지 않는다. 필요성이 실제 쿼리 및 데이터 무결성 검토로 입증되면 migration **제안**을 별도로 제출한다. 이번 단계 migration 작성·실행 및 운영 DB 변경은 NONE이다.

## 현재 실제 연결

- GET `/api/admin/settlement-sheet`는 months/policies/settings 세 테이블을 조회한다. 정책 테이블은 `admin_settlement_sheet_centers`이고 `public.centers`와 다르다.
- `settlementSheetCore.ts`: 월행 `centerId`는 SettlementCenter.id(정산 정책 ID)다. 현재 이를 센터관리 UUID라고 해석하면 안 된다.
- SettlementSheet의 기관명 blur는 이름 일치 정책을 찾아 rowFromCenter로 채운다. 미확정 월 반영도 정책 ID 다음에 이름 fallback을 쓴다. 월에서 정책 생성은 이름으로 중복 제거한다.
- 신규 월의 ‘센터 DB’ 선택은 정산 정책 집합을 사용한다. 연간 뷰, 정규 일괄 추가, 전체 월 export/restore 등도 현재 전체 정책·월 상태에 의존한다.

## ID 보존형 확장 제안

기존 SettlementCenter.id와 월행 centerId의 의미를 유지한다. 정산 정책 payload에 nullable `center_id`(public.centers.id)를 추가하는 안을 우선 제안한다. 필요 시 새 월행의 source 정보에도 별도 필드로 기록하되 과거 월은 수정하지 않는다. 기존 JSON payload 구조이므로 이를 위해 운영 DDL을 수행할 필요는 없다. 실제 컬럼/FK 도입은 무결성 요구와 별도 승인이 있을 때만 검토한다.

서버에서 UUID·센터 존재·master 권한을 검증하고 연결 저장 시 기존 payload의 요율/이력/기타 키를 보존한다. 정책 수정 경쟁 충돌도 revision으로 보호하는 방안을 포함한다. 기존 center upsert는 revision 조건 없이 덮어쓰므로 연결 추가가 타 편집 값을 잃지 않게 해야 한다.

이름이 같아도 자동 연결하지 않는다. 사용자가 검색 결과의 센터 ID를 명시적으로 선택한다. 기존 미연결 정책 및 개인수업은 그대로 사용 가능하다. 이름 fallback의 기존 정산 정책 편의 기능을 운영 센터 자동 연결로 확대하지 않는다. 기존 이름 기반 요율 적용의 제거/변경은 기능 영향이 있으므로 PO가 별도로 확인해야 한다.

## 경량 조회와 화면 분리

master 권한의 서버 검색은 public.centers에서 id/name/status와 연결 여부만 페이지 단위로 반환한다. 연결 여부는 현재 검색 페이지의 ID 집합에 해당하는 정책 연결만 한번에 조회한다. 센터별 N+1과 전체 centers/정책 preload를 금지한다.

현재 월 첫 진입에서 모든 정책 payload를 가져오는 GET을 그대로 둔 채 새 검색만 추가하면 preload 제거가 아니다. 따라서 다음 호환 설계가 필요하다:

1. 월 화면은 필요한 월행과 연결 정책 최소 인덱스만 가져온다. 원래 snapshot 금액을 정책 조회로 다시 계산하지 않는다.
2. 기관 관리/선택 시 정책 검색을 서버에서 하고 선택된 정책 상세·rates와 선택한 운영 센터 계약만 조회한다. 운영 센터의 비밀번호·연락처·첨부는 정산에 제공하지 않는다.
3. 정규 일괄 추가/월 생성/연간 뷰/export/backup/restore는 명시적 동작에서 필요한 범위를 별도 조회한다. 일괄 기능은 서버에서 해당 결과를 생성하는 방안도 검토한다. 전체 정책의 장기 클라이언트 보관으로 회귀시키지 않는다.
4. 기존 GET 소비자는 SettlementSheet뿐인지 재확인 후 응답 분리 및 타입 변경을 함께 수행한다. 오래된 클라이언트/응답 계약의 호환성도 확인한다.

모든 월 preload 제거는 더 넓은 정산 데이터 접근 변경이다. 이번 P1의 필수 범위는 전체 정책 preload 제거와 기능 보존이며, 월 history 전체를 지연 로딩하는 추가 최적화는 측정 효과와 PO 승인에 따라 분리한다.

## 단가 의미와 선택 반영

상세 session_fee는 ‘회당 수업료’. 정산 centerFee는 instr/assist/rental 중 양수 값의 합산 식을 우선 사용하고 없으면 fee를 사용한다. 값이 같더라도 개념이 같다는 증거가 아니다. session_fee를 instr 또는 합계로 자동 대입하지 않는다.

연결 센터 최신 조회는 원본 name/status/contract/session_fee와 updated_at을 읽기 전용 참고로 제공한다. 요율·인건비·세금·지급조건·유효월은 정산 정책에 유지한다. 사용자가 변경 비교를 보고 항목 및 적용할 미확정 월을 명시적으로 선택한 뒤에만 반영한다. 기존 월 금액 자동 갱신은 없다.

확정 월은 이번 연결/반영 경로에서 쓰기 대상에서 제외하고 서버에서도 차단한다. 기존 API는 의도된 확정 해제 경로와 restore 경로도 있어 잠금 불변식을 모든 요청에 보장한다고 단정할 수 없다. restore/upsert의 광범위 수정은 별도 승인 없이 하지 않는다. 새 연결이 기존 기록 삭제·월 restore를 실행하지 않도록 경계를 둔다.

## 미확정 제품 결정

- 단일 운영 센터와 복수 정산 정책(프로그램/기간별)의 연결을 허용할지: 기존 정책 보존을 위해 기본 제안은 허용, 자동 병합 금지.
- 기존 이름 기반 정산 정책 선택을 명시적 ID 선택 UI로 바꾸는 범위.
- session_fee와 요율 합계의 관계: 의미 확인 전 자동 매핑 없음.
- 연결/최신 원본 조회는 가능하되 반영은 사용자가 선택하며 기존 확정 월/개인수업은 그대로 보존.
