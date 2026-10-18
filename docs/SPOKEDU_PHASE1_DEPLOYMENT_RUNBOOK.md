# SPOKEDU Phase 1 deployment runbook

작성 기준: 2026-10-18
상태: 운영 적용 금지, 격리 검증 대기

## 불변 조건

- 운영 DB, Storage, Auth, Vercel 설정은 단계 C 승인 전 변경하지 않는다.
- `iiwarmup-files`의 공개 원본은 private 사본과 DB 참조를 검증하기 전에 삭제하지 않는다.
- `authenticated_all_centers`와 일반 authenticated 전체 GRANT는 기본 롤백으로 복원하지 않는다.
- 스키마 변경과 파일 이전은 동일 작업으로 묶지 않는다.

## 운영 읽기 전용 기준선

- `centers`: 26개 컬럼, RLS 활성, `authenticated_all_centers`가 로그인 사용자 전체 CRUD를 허용한다.
- `center_history`: admin/master 전용 SELECT/INSERT/UPDATE/DELETE 정책이 있다.
- 두 테이블 모두 anon/authenticated/service_role에 DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE가 부여되어 있다.
- `centers_updated_at` BEFORE UPDATE trigger가 `set_updated_at()`을 호출한다.
- `center_history.center_id`는 `centers.id`를 `ON DELETE CASCADE`로 참조한다.
- `crm_centers_sync`는 `security_invoker=true`이며 postgres/service_role만 접근한다.
- centers/center_history를 직접 참조하는 별도 DB 함수는 확인되지 않았다.

## 격리 환경 요구사항

운영 데이터나 운영 사용자를 복사하지 않는다. Supabase branch 또는 동등한 disposable 환경에 다음만 재현한다.

1. `users`, `profiles`, `centers`, `center_history`의 최소 구조와 FK
2. `set_updated_at()` 함수와 `centers_updated_at` trigger
3. 기존 정책/GRANT 기준선과 신규 마이그레이션
4. private/legacy 테스트 버킷 및 합성 파일 22개(참조 19, 미참조 3)
5. 일반 사용자, admin, master의 고유 이메일/비밀번호 테스트 계정

계정은 정상 email/password 로그인으로 세션을 얻고 service role 세션으로 역할 테스트를 대체하지 않는다.

## 배포 순서와 게이트

| 단계 | 성공 조건 | 기존 기능 영향 | 실패·중단 조건 | 복구 |
|---|---|---|---|---|
| 1. private 버킷 준비 | 비공개·25MiB·MIME 설정 정확, 두 번째 실행 성공 | 없음 | 동명 버킷 설정 불일치 | 변경 없이 중단; 잘못 만든 신규 빈 버킷만 별도 승인 후 API 삭제 |
| 2. 신규 코드 배포 | 기존 RLS에서 admin/master CRUD·이력·비밀번호·legacy 파일 정상, build ID와 환경변수 대상 확인 | 직접 authenticated 취약점은 RLS 제한 전까지 일시 유지; 새 업로드는 private 버킷 사용 | 일반 사용자 기능 회귀, 관리자 오류 또는 private 업로드 실패 | 신규 DB 변경 전이므로 이전 deployment로 복귀; 기존 DB/RLS 유지 |
| 3. 기존·신규 관리자 기능 확인 | 새 브라우저와 구버전 브라우저에서 users.role admin/master 또는 is_admin 관리자의 action 정상 | email/profile-only 관리자의 구버전 탭은 새 코드 새로고침 필요 | 기존 admin role 경로가 호환 정책에서 실패 | RLS 적용 중단; 사용자 차단은 별도 승인 |
| 4. 파일 복사·참조 전환 | 19개 SHA-256·크기·MIME·signed download 일치, CAS 성공 | 공개 원본 유지로 읽기 호환 | 수량·소유 경로·해시·CAS 불일치 | 해당 파일 참조 유지, 양쪽 객체 보존, checkpoint 후 중단 |
| 5. RLS·GRANT 제한 | anon/regular 직접 접근 차단, admin/master 신규·구버전 action 정상 | email/profile-only 구버전 관리자는 차단 | 기존 role/is_admin 관리자의 old action 실패 | 신규 코드 유지 + secure rollback; 원인 수정 전 다음 단계 중단 |
| 6. 역할·회귀 재검증 | 일반 사용자 차단과 admin/master 센터 기능, 로그인·수업·출석·정산·구독·결제 회귀 확인 | 없음 | 한 항목이라도 FAIL | 다음 단계 중단 |
| 7. 별도 승인 후 공개 원본 삭제 | private 참조 19개, 기존 URL 차단, 미참조 3개 보존 | 과거 공개 URL 종료 | CDN/브라우저 캐시 또는 참조 잔존 | 원본 삭제 중단; 삭제된 파일은 검증된 private 사본에서 API 복원 |

RLS를 신규 코드보다 먼저 적용하거나 private 버킷 생성 전에 신규 업로드 코드를 배포하지 않는다.

## 변경 직전 백업 게이트

다음 백업은 운영 적용 승인을 받은 뒤 각 변경 직전에 수행한다. 산출물은 접근 제한된 임시 위치에 보관하고 Git, 빌드 로그, 배포 로그에 포함하지 않는다.

1. `public.centers`, `public.center_history`의 스키마·RLS·GRANT·트리거·함수 정의를 schema-only SQL로 저장하고 SHA-256을 기록한다.
2. 두 테이블의 변경 전 행을 암호화된 data-only 백업으로 저장한다. 시설 비밀번호와 파일 참조가 포함되므로 본문을 로그에 출력하지 않는다.
3. 공개 원본 22개의 버킷·경로·크기·MIME·SHA-256 inventory를 저장한다. 참조 19개와 미참조 3개를 분리하고 원본은 7단계 승인 전까지 유지한다.
4. 파일 이전 dry-run의 project ref, 19/3 수량, inventory fingerprint와 checkpoint SHA-256을 기록한다. 키·파일 본문·signed URL은 기록하지 않는다.
5. 신규 마이그레이션 2개와 secure/legacy-compatibility rollback SQL의 SHA-256을 기록하고 승인된 파일과 일치하지 않으면 중단한다.

백업 파일 생성·해시 검증·복구 리허설 중 하나라도 실패하면 버킷 생성, 코드 배포, 파일 이전 또는 RLS 적용을 시작하지 않는다.

## 파일 이전 실행

기본은 dry-run이며 명시적 환경변수를 사용한다.

```text
CENTER_MIGRATION_SUPABASE_URL=<isolated-url>
CENTER_MIGRATION_SERVICE_ROLE_KEY=<isolated-service-role>
node scripts/migrate-center-criminal-check-files.mjs --dry-run --expected-referenced 19 --expected-unreferenced 3
```

apply는 정확한 project ref 확인이 추가로 필요하다. 운영 ref에서는 `--allow-production`도 필요하지만 단계 C 승인 전 실행하지 않는다.

dry-run은 경로와 센터 참조를 비식별 fingerprint로 기록한다. apply는 같은 checkpoint의 성공한 dry-run fingerprint가 없거나 inventory가 달라지면 시작하지 않는다. 체크포인트에는 경로 대신 식별 hash, 실제 byte SHA-256, 크기, MIME, 완료 시각만 기록한다. 파일 본문·키·signed URL은 기록하지 않는다.

## 취약점 비복원 복구

- 버킷 생성 실패: 트랜잭션 실패로 변경 없음. 코드/RLS 배포 금지.
- 신규 코드 배포 실패: DB/RLS가 기존 상태이면 이전 deployment로 복귀 가능.
- 관리자 검증 실패: RLS 적용 전이면 코드만 복귀. RLS 적용 후에는 새 코드를 유지하고 원인 수정.
- 파일 복사 실패: DB 참조를 바꾸지 않고 양쪽 객체를 유지한다.
- DB 참조 전환 실패: CAS가 0행이면 동시 수정으로 판정하고 공개 참조를 유지한다. private 사본은 삭제하지 않는다.
- RLS 후 관리자 실패: 먼저 `supabase/rollback/phase1_center_access_secure_rollback.sql`로 service-only 상태를 재확인하고 신규 코드를 수정한다.
- 코드까지 이전 버전으로 돌려야 하는 비상 상황: 먼저 `phase1_center_access_legacy_compatibility.sql`을 적용한다. 이 bridge는 users.role admin/master 또는 is_admin만 허용하며 일반 사용자는 차단한다.

## 무중단 판정 제한

신규 RLS는 일반 authenticated 사용자를 차단하지만 `users.role=admin/master` 또는 `is_admin=true`인 구버전 센터 action에는 제한적으로 호환된다. 실제 운영 admin 4명은 이 기준에 포함된다. email allowlist 또는 profiles 역할로만 승인되는 관리자의 구버전 탭은 fail-closed하므로 신규 코드 새로고침이 필요하다. Vercel Skew Protection 설정과 장기 열린 탭의 실제 테스트가 끝나기 전까지 무중단 PASS로 판정하지 않는다.
