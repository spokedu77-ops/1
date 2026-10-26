# SPOKEDU LAB 수정 구현 기록

## 구현함

1. 동명이인 일괄 등록 보존
   - `classManagementModel.ts`: 빈 행만 제거하고 같은 이름의 행을 유지한다.
   - `ClassRosterSheet.tsx`: 기존학생/신규학생 선택 상태, radio group, React key를 이름이 아닌 행 인덱스로 분리했다.
   - `classManagementModel.test.ts`: 김민준 두 명이 모두 반환되는 회귀 사례로 변경했다.

2. 회원 목록 강제 서버 갱신
   - `MemberListPanel.tsx`: 캐시 clear + refresh version으로 같은 검색/페이지에서도 새 fetch를 강제하는 버튼을 추가했다.
   - 기존 30초 캐시, 검색, 필터, 페이지 동작은 유지했다.

## 구현하지 않음

- 환불: runtime schema/API/PG 취소/권한 재계산 정책이 승인·적용되지 않았다. draft SQL을 운영 migration으로 승격하지 않았다.
- 수업기록 pagination: 소비자 계약과 실제 DB max rows/데이터 규모를 검증하지 못해 임의 API 형태 변경을 하지 않았다.
- 학생 보관 restore: 기존 삭제 의미와 복원 제품 정책이 확정되지 않아 새 persistence 의미를 추가하지 않았다.
- bulk API, SPOMOVE versioning, 토너먼트 persistence, funnel rate limit: 실제 DB/운영 요구와 migration 범위가 필요한 변경이라 결함 증거만 기록했다.
- 미리보기/모바일 UI: 렌더 fixture와 실제 기기 증거 없이 시각 구현을 변경하지 않았다.

DB migration은 추가하거나 수정하지 않았다.
