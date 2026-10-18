# SPOKEDU 보안 감사 및 운영 적용 런북 (2026-10-18)

이 문서는 단계 A 조사 결과와 단계 C 승인 자료의 초안이다. 이 문서의 SQL과 Storage 절차는 **운영에 적용하지 않았다**.

## 1. 기준선과 환경 식별

- 기준 HEAD: `c1a7ec52691f0f710e51a15aeb359e8eb7b55e76`
- 작업 브랜치: `spokedu-security-audit-20261018`
- 로컬 Vercel 링크: `spokedu` / `prj_xXzgJOr6bBGmlUFBzAygZS4PgRDA`
- 로컬 Supabase URL의 project ref: `mwgvserdyflsqyhcqecp` (ops)
- 지정 스테이징 Supabase: `stanouvgklynytjtlnif`
- 비밀값과 Service Role Key는 수집하거나 출력하지 않았다.

Vercel 연결 도구에서 두 프로젝트의 존재는 확인했지만 project/deployment 세부 조회 권한이 없어 Production Branch, Git 연결, Preview/Production 환경변수 값의 분리는 확정하지 못했다. 지정 스테이징 Supabase에는 `centers`, `center_history`, 카메라 3개 테이블과 `iiwarmup-files` 버킷이 없어 현재 상태로는 센터 마이그레이션의 격리 검증 대상이 될 수 없다.

## 2. 센터 권한 의존성

`public.centers`와 `public.center_history`의 애플리케이션 호출은 다음 두 모듈과 신규 민감파일 모듈로 한정된다.

- `app/admin/centers/actions/centers.ts`
- `app/admin/centers/actions/center-history.ts`
- `app/admin/centers/actions/criminal-check-files.ts`

브라우저에서 두 테이블을 직접 조회·변경하는 Supabase 호출, Route Handler, 배치 또는 백그라운드 작업은 발견되지 않았다. `center_tbd_classes`는 별도 기능이며 이번 권한 변경 대상이 아니다. 센터를 참조하는 수업 데이터의 FK/표시 의미도 이번 변경에서 수정하지 않는다.

운영 DB의 확인 상태:

- `centers`: RLS 활성, `authenticated_all_centers` 정책이 로그인한 모든 사용자에게 ALL 허용
- `centers`: `anon`, `authenticated`, `service_role`에 광범위한 테이블/컬럼 권한 존재
- `center_history`: 관리자/master 역할을 검사하는 SELECT/INSERT/UPDATE/DELETE 정책 존재
- `centers` 52행, `center_history` 30행

코드 전환 후에는 모든 호출이 `requireAdmin()` 성공 뒤 Service Role을 사용한다. 따라서 DB 전환안은 `anon`/`authenticated`의 두 테이블 직접 권한을 제거하고 Service Role만 명시적으로 유지한다. 적용 파일은 `20261018101000_harden_center_management_access.sql`이다.

## 3. 첨부파일 현황과 전환 절차

메타데이터만 조회한 결과:

- 공개 `iiwarmup-files` 버킷의 범죄경력조회 경로 객체: 22개
- 센터 JSON 참조: 19개(고유 19개)
- 참조와 객체가 일치: 19개
- 미참조 객체: 3개
- 19개 참조 모두 `centers/{centerId}/criminal-check/` 소유 경로 규칙과 일치

신규 대상은 비공개 `spokedu-center-criminal-checks` 버킷이다. `iiwarmup-files` 전체 공개 설정은 변경하지 않는다. 신규 코드의 파일 메타데이터에는 `bucket`을 기록하며, 이 값이 없는 기존 항목만 레거시 버킷으로 해석한다.

운영 적용은 반드시 다음 변경 단위로 분리한다.

1. DB 스키마·정책·GRANT와 두 버킷 객체 목록을 제한된 백업 위치에 내보내고 행 수/객체 수를 검증한다.
2. `20261018100000_create_private_center_criminal_check_bucket.sql`만 먼저 적용한다.
3. 신규 코드 배포 후 관리자 신규 업로드·서명 조회·삭제를 테스트한다. 일반 사용자와 비로그인은 같은 Server Action 직접 호출이 거부돼야 한다.
4. 기존 19개 참조에 대해 DB의 센터 ID와 경로 prefix, 원본 객체 이름·크기·MIME 메타데이터를 먼저 대조한다.
5. Storage API로 원본을 비공개 버킷의 동일 경로에 복사한다. Storage 내부 테이블을 SQL로 수정하지 않는다.
6. 대상 객체의 존재·크기·MIME을 원본과 비교하고 관리자 서명 URL로 실제 열람을 표본 및 전체 검증한다.
7. 각 센터의 `criminal_check_files` 항목에 `bucket: "spokedu-center-criminal-checks"`를 기록한다. 실패한 센터는 공개 원본과 기존 JSON을 그대로 유지한다.
8. 관리자 UI 재조회와 직접 호출 차단을 재검증한다.
9. 별도 변경 창에서만 공개 원본 삭제를 승인받는다. 삭제 전 모든 DB 참조가 비공개 버킷을 가리키는지 다시 검사한다.
10. 공개 원본 삭제 후 Storage API로 부재를 확인하고 과거 공개 URL을 새 세션·캐시 우회 요청으로 확인한다. CDN 캐시는 즉시 소멸한다고 가정하지 않는다.

미참조 3개는 소유자·생성 시각·업로드 주체·보존 의무를 확인할 때까지 이동 또는 삭제하지 않는다. 파일 본문이나 서명 URL은 로그/보고서에 기록하지 않는다.

## 4. 파일 삭제 복구 의미

삭제 순서는 센터 소유권 확인 → Storage 객체 존재 확인 → Storage API 삭제 → 삭제 부재 확인 → DB JSON 정리다. Storage 실패 시 DB 참조를 보존한다. Storage 삭제 뒤 DB 정리가 실패하면 `storageDeletedDatabasePending` 상태와 오류를 반환하며, 같은 요청을 다시 실행하면 객체 부재를 허용하고 DB 정리를 재시도한다. 다른 센터 prefix 또는 해당 센터 JSON에 없는 파일은 삭제하지 않는다.

## 5. 적용 순서와 롤백

권장 순서:

1. 백업 및 격리 복원 검증
2. 비공개 버킷 생성
3. 호환 코드 배포와 관리자/일반 사용자 회귀 검증
4. 기존 파일 복사·검증·DB 참조 전환
5. 센터 테이블 직접 권한 제한
6. 역할별 직접 Data API 및 관리자 UI 재검증
7. 별도 승인 후 공개 원본 삭제

센터 권한 변경의 긴급 롤백 SQL은 아래와 같다. 이는 기존 취약한 직접 접근 상태를 복원하므로 장애 대응 승인 아래에서만 사용한다.

```sql
begin;

drop policy if exists centers_service_role_all on public.centers;
drop policy if exists center_history_service_role_all on public.center_history;

grant all on table public.centers to anon, authenticated, service_role;
grant all on table public.center_history to anon, authenticated, service_role;

drop policy if exists authenticated_all_centers on public.centers;
create policy authenticated_all_centers
on public.centers
for all
to public
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

commit;
```

기존 `center_history_*_admin` 네 정책은 권한 강화 마이그레이션에서 삭제하지 않으므로 롤백에서도 재생성할 필요가 없다. 비공개 버킷은 코드 롤백 시에도 공개로 바꾸지 않는다. 새 객체가 있으면 기존 코드가 복구될 때까지 보존하고, 빈 버킷 삭제가 필요하면 객체 부재를 확인한 뒤 Storage API로 별도 처리한다.

파일 참조 전환 롤백은 사전 백업한 센터별 원본 JSON을 복원한다. 공개 원본 삭제 전에는 JSON만 레거시 항목으로 되돌릴 수 있다. 공개 원본을 삭제한 뒤에는 먼저 검증된 비공개 복사본을 Storage API로 공개 버킷에 복원한 다음 JSON을 되돌린다.

## 6. 카메라 데이터 제거 승인안

전용 코드·API·메뉴·문서는 제거하지만 DB는 이번 단계에서 유지한다. 운영 확인 행 수는 participants 14, activity sessions 13, control sessions 2다. 외부 view/function/trigger 의존성은 발견되지 않았고 participants의 activity session FK 및 Auth 사용자 FK만 확인됐다.

별도 승인 전 다음을 수행한다.

1. 세 테이블의 DDL, 인덱스, 제약조건, RLS 정책을 schema-only 백업한다.
2. 세 테이블 데이터를 암호화된 제한 저장소에 custom-format 또는 CSV로 백업한다.
3. 백업 복원 격리 DB에서 행 수와 FK 관계를 검증한다.
4. 카메라 제거 코드가 운영 배포된 뒤 관련 경로가 404이고 다른 관리자 기능이 정상인지 확인한다.
5. 삭제 직전 `pg_depend`, view, routine, trigger 의존성을 다시 조회한다.

승인 후 DROP은 `CASCADE` 없이 FK 자식부터 독립 변경으로 실행한다.

```sql
begin;
drop table public.camera_activity_participants;
drop table public.camera_activity_sessions;
drop table public.camera_control_sessions;
commit;
```

하나라도 의존성 오류가 발생하면 트랜잭션을 롤백하고 중단한다. 기존 카메라 생성 마이그레이션은 적용 이력 보존을 위해 삭제하지 않는다.

## 7. 레거시와 저장소 판정

- 유지: `/admin/classes` 정본, `/admin/classes-v2` 호환 리다이렉트, `/spokedu-lab`, `/spokedu-master`, `/admin/iiwarmup`, `/program/iiwarmup` 호환 리다이렉트, `/admin/spomove`
- 근거: 내부 링크, 로그인/구독/결제 또는 SPOMOVE 실행 의존성이 확인됐거나 외부 트래픽 증거를 확보하지 못했다.
- 보존: `.toss-review-preview`는 외부 Preview 트리거 가능성을 배제하지 못했다.
- 보존: `docs/design/**` 캡처는 QA/문서 참조가 있고 현재 사용자 변경과 겹친다.
- 삭제 후보: 루트 3개 `*-390.png`, `.agents/backups/` 3개 파일은 코드 참조가 없었다. 자동 안전 검토가 삭제를 거부했으므로 변경하지 않았다.
- 추적 ZIP: 조사 시점에 없음.

## 8. 승인 게이트

운영 DB, Storage 객체, Vercel 배포, 스테이징 프로젝트, Auth 사용자에는 변경을 적용하지 않았다. 센터 RLS/GRANT, 파일 이동/원본 삭제, 카메라 테이블 DROP은 각각 별도 승인과 변경 창이 필요하다.

## 9. 단계 B 검증 결과

- PASS: `npm run typecheck`
- PASS: 변경 TS/TSX 대상 ESLint
- PASS: 신규 센터 보안 계약/경로 테스트 4건
- PASS: 인증·권한·결제·구독 관련 회귀 248건
- PASS: SPOKEDU MASTER core 428건
- PASS: SPOMOVE 회귀 97건
- PASS: `npm run build`; 빌드 라우트에서 `/admin/camera`와 `/api/admin/camera/**` 부재
- PASS: 로컬 production start HTTP smoke — `/`, `/education`, `/contact`, `/spomove`, `/login` 200; 제거된 카메라 페이지/API 404
- PASS: ops의 anon key만 사용한 read-only REST 검사에서 `centers` 결과 0행
- BLOCKED: 지정 Supabase 스테이징에는 센터/카메라 테이블과 레거시 버킷이 없어 두 신규 마이그레이션을 격리 적용할 수 없음
- NOT VERIFIED: 일반 사용자·관리자·master의 실제 센터 UI/Server Action E2E, 민감파일 신규 업로드/조회/삭제 E2E
- NOT VERIFIED: 카카오/이메일 실제 로그인 및 기존 세션, 실제 역할별 Free/Lite/Premium, 테스트 결제/Webhook/만료 E2E
- NOT VERIFIED: Vercel Production Branch, Git 연결, Preview/Production 환경변수 분리(연결 도구의 세부 조회 권한 부족)

초기 `npx vitest` 실행은 저장소 밖 상위 경로에서 일회성 최신 버전을 선택해 계약 테스트 경로 해석이 실패했다. 로컬 고정 Vitest 4.1.2로 수정 없이 재현 가능한 명령을 사용해 다시 실행했고 위 결과는 모두 통과했다. `git diff --check`가 보고한 공백 1건은 작업 전부터 존재한 사용자 변경 파일 `docs/design/phase-1b4a-main-recovery/PREFLIGHT_REPORT.md`이며 수정하지 않았다.
