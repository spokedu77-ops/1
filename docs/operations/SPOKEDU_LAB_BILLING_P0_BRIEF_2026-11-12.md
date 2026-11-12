# 결제 P0 복구 범위 — 2026-11-12

## SPRINT NAME
기존 승인 조회 실패로 인한 신규 결제 차단 조사·복구·재발 방지.

## PRODUCT PROBLEM / CURRENT BEHAVIOR
운영의 기존 승인 조회 예외가 `payment_recovery_lookup_failed`로 저장되고 고객에게는 `billing_issue_failed`로 표시된다. 제보 시간대에 HTTP 502 두 건이 확인됐다. 조사 근거는 같은 날짜의 incident 문서에 기록한다.

## USER JOURNEY / TARGET USERS
DISCOVER → 유료 구독으로 PREPARE/RUN 진입. 최초·복귀 Free/Lite/Premium 고객과 결제 운영 관리자.

## APPROVED PRODUCT DECISIONS
PD-011/019의 가격·상품·권한 및 기존 Toss billing 계약을 유지한다. 사용자가 2026-11-12 원인 규명, 해결 및 재발 방지에 필요한 조치를 승인했다. Git stage/commit/push는 별도의 정확한 요청 없이 수행하지 않는다.

## TARGET REFERENCE
None. 결제창·페이지 시각 재설계 없음.

## IN SCOPE
배포 코드·환경·요청 기록 대조, 동일 서버 환경의 청구 없는 진단, 결제 조회/오류 처리의 원인 기반 수정, 제한된 재시도와 안전한 진단 정보, 회귀 검증 및 필요한 운영 배포. 진단 배포는 사용자 도메인에 연결하지 않는다.

## OUT OF SCOPE
무관한 리팩터링, 가격·권한 변경, 고객 카드의 임의 청구·환불, 주문 이력 초기화, 인증 우회.

## FILES / SURFACES TO INSPECT
`spokeduMasterBillingProvider`, `payment/billing/issue`, billing order claim/recovery, monitoring, admin recovery preview, success response consumption, 관련 테스트, Vercel 설정·배포 소스.

## CONTRACTS TO PRESERVE / APPROVED CONTRACT CHANGES
소유자/관리자 권한, 서버 금액 검증, 원 주문·주기의 멱등성, 불명확한 승인 결과에 대한 재청구 금지, 승인 후 원 결제 재적용, Vault 보관, 기존 구독/갱신/웹훅 의미 유지. 보호 계약 변경 없음.

## STOP CONDITIONS
새 상품·권한·가격·의미 변경, 검증할 수 없는 고객 금융 변경 또는 무관한 변경의 운영 반영이 필요하면 그 부분을 중단하고 보고한다.

## ACCEPTANCE CRITERIA
원인과 추정을 구분한다. 실제 서버 환경의 제공자 읽기 전용 조회를 검증한다. 재발 방지 수정에는 조회 장애·정상 미결제·기승인·불명확한 청구·동시 요청의 회귀 근거가 있어야 한다. 운영 반영 시 실제 배포와 조회 결과로 확인하며 실제 카드 결제 E2E를 대신했다고 주장하지 않는다.

## REGRESSION CHECK / TEST / QA SCOPE
사용자 승인 범위에 필요한 targeted unit/contract tests, 변경 파일 lint, TypeScript, 필요 시 production build 및 청구 없는 로컬/서버 smoke를 실행한다. 신규/기존 주문·갱신·웹훅과 entitlement/금액 보존을 검토한다. 화면 변경 시만 populated desktop/mobile rendered QA를 추가한다.

## FINAL REPORT FORMAT
확정 원인, 수정·배포, 회귀 결과, 잔여 한계, 파일 범위와 근거.
