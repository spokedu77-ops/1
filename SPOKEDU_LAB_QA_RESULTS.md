# SPOKEDU LAB QA 결과

> Stage 2 추가 증빙: `STAGE2_P0_POSTGRESQL_QA.md`. 실제 PostgreSQL 9/9, 관련 Vitest 142/142, typecheck, 변경 파일 ESLint, production build가 통과했다. 이는 수업 출석·메모·완료 범위에 한정되며 기존 22항목의 미실행 테스트를 대체하지 않는다.

## 실행 결과

- 기준선: `main`, `9d7ab5dddde64c37f00f6081e065d6e46add95b0`, 시작 시 clean.
- Node: `v24.15.0`; npm: `11.12.1`.
- 대상 테스트: `npm.cmd exec -- vitest run ... --root C:\Users\joker\Documents\GitHub\1`
- 결과: 7 test files, 32 tests PASS.
- 포함: class model 동명이인, refund panel, class-tools model, tournament model, capture draft recovery, capture concurrency contract, funnel route contract.
- 첫 `npx vitest` 실행은 runner root가 `C:\Users\joker`로 잡혀 다른 복제본과 `.tmp` 테스트까지 수집해 실패했다. 올바른 repo root를 명시한 재실행은 통과했으며 첫 결과는 제품 회귀로 판정하지 않는다.

## 실행하지 못함

- 로컬 Supabase 통합: `supabase` 명령을 찾을 수 없어 BLOCKED. Production DB 대체 사용 금지 원칙에 따라 원격 DB는 사용하지 않았다.
- 100/1,001/2,500 records 및 student child 10,000 rows: BLOCKED.
- Toss 취소: 금지사항에 따라 미실행. 실행 API 자체도 없음.
- Chrome/Android/iOS 및 320/375/390/430/768 렌더 QA: 로컬 populated fixture/브라우저 세션 미구성으로 BLOCKED.
- 두 관리자 SPOMOVE 동시 저장: 격리 DB 미가용으로 BLOCKED.
- 변경 파일 ESLint: PASS (`npm.cmd exec -- eslint ...`).
- TypeScript: PASS (`npm.cmd run typecheck`).
- Production build: PASS (`npm.cmd --prefix C:\Users\joker\Documents\GitHub\1 run build`). 최초 prefix 없는 실행은 호출 환경이 다른 package root를 선택해 `Missing script: build`로 실패했으며, 명시적 repo prefix 실행은 Next.js 16.2.11 compile/type/page generation을 완료했다.

## 정적 회귀 근거

- Free/Lite/Premium 및 admin capability 소스는 수정하지 않았다.
- owner filter, service-role RPC, 가격/entitlement 코드, session lifecycle은 수정하지 않았다.
- capture migration의 optimistic lock 및 409 mapping을 유지했다.
- 학생 soft delete RPC와 역사 snapshot 테이블을 수정하지 않았다.
