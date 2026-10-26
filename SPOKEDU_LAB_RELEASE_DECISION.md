# SPOKEDU LAB Release Decision

결론: **출시 차단(검증 미완료)**.

Stage 2 후속 결과: 수업 출석·메모·완료 동시성 P0는 실제 PostgreSQL 검증까지 완료되어 `STAGE2_P0_READY: YES`다. 다만 환불 운영 경로, 대량 기록 완전성, SPOMOVE 동시 편집 등 이 문서의 나머지 출시 차단 사유는 해소되지 않았으므로 전체 제품의 `PRODUCTION_DEPLOY_READY`는 여전히 NO다.

## 해결됨

- 동명이인 붙여넣기 자동 제거 및 같은 이름 행의 선택상태 공유를 수정했다.
- 회원 목록 캐시를 우회하는 명시적 서버 새로고침을 추가했다.
- 기존 수업 캡처의 draft/optimistic lock/409 보호가 코드와 계약 테스트에 존재함을 재확인했다.

## 남은 P0/P1 후보

- P0: 자체 환불 요청/승인/PG 취소/권한 재조정 runtime 경로가 없다. 대체 운영 경로 증거도 저장소에서 확인되지 않았다.
- P0/P1: 수업 기록 GET이 1,000행 초과 완전성을 명시적으로 보장하지 않는다.
- P1: SPOMOVE pack 동시 편집 충돌 감지가 없다.
- P1: 토너먼트 진행 상태가 새로고침/재방문에 복원되지 않는다.
- P1/성능: 학생 bulk 등록은 학생 수만큼 순차 요청한다.

## 운영 영향

- 기존 사용자 데이터, 구독 권한, 가격, session lifecycle, SPOMOVE runtime 의미는 변경하지 않았다.
- DB migration 불필요(이번 구현 기준).
- 코드 롤백은 수정된 4개 파일의 해당 hunk를 되돌리면 된다. 데이터 롤백은 필요 없다.

## 배포 전 별도 승인/조치

1. 환불 workflow 제품/보안/회계 승인 및 migration/API 구현.
2. 로컬 격리 DB를 가동해 보관·복원, 1,001/2,500/10,000행, 동시 저장을 검증.
3. 수업 기록 pagination 소비자 계약 결정 및 구현.
4. populated desktop/mobile rendered QA와 Android/iOS 타이머 확인.
5. 남은 P1의 구현 범위를 승인한 뒤 재감사.

Commit, push, Production DB 적용, 배포는 수행하지 않았다.
