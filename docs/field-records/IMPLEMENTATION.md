# SPOKEDU 현장 기록 CMS

## 승인 범위와 현재 상태

원본 지시서는 [approved-request.md](approved-request.md)에 보관한다. 기존 프로젝트와 공개 경로를 재사용한다. 구현 후 사용자의 별도 ‘적용’ 승인에 따라 2026-11-07 기존 프로젝트 `mwgvserdyflsqyhcqecp`에 `20261107120000_field_records_cms.sql` 한 파일만 적용했다. 이후 사용자가 관리자에서 세 원고를 등록·게시한 것을 확인하고, 기존 홈 순서대로 대표 자리 1~3을 연결하고 로컬 `.env.local`의 CMS 공개 전환을 활성화했다. 운영 배포·운영 환경변수 변경은 실행하지 않았다.

적용 전 읽기 전용 확인에서 `field_records` 테이블은 없었다. 기존 `iiwarmup-files`, 수업 사진·파일 등의 버킷은 public이며, 범죄경력 확인 자료 버킷은 private이다. 다른 도메인의 버킷을 재사용하거나 공개 설정을 변경하는 대신, 같은 프로젝트에 `field-record-media` 비공개 네임스페이스를 추가했다.

적용 기록: 버전 `20261107120000`, 이름 `field_records_cms`, SQL SHA-256 `edf8544ac9cc277bcc691cdb86509838f29cbf7b346edda0793c1d80de34a791`. DDL과 적용 이력을 한 트랜잭션으로 커밋하고 PostgREST 스키마를 갱신했다. 두 테이블은 각각 0건이며, REST 관리자 조회 200 / 익명 조회 401, RLS 활성화, 공개 클라이언트 RPC 실행 차단, 버킷 비공개와 restrictive Storage 정책을 확인했다.

## 구성

- `/admin/field-records`: 목록, 새 기록, 승인 원고 3건을 **초안**으로 개별 등록.
- `/admin/field-records/new`, `/admin/field-records/[id]`: 구조화 필드, 6개 본문 탭, BlockNote, 갤러리, 게시 설정.
- `/admin/field-records/[id]/preview`: 인증을 재검사하는 초안 미리보기. `noindex, nofollow`.
- `/api/admin/field-records/*`: 모든 읽기·쓰기에 기존 `requireAdmin()` 적용. SPOMOVE 전용 계정에는 기존 일반 관리자 제한 적용.
- `/records`, `/records/[slug]`: 기존 경로 유지. 기존 외부 블로그 주소와 기타 사례 경로는 보존.
- 홈은 기존 `CaseCard`, 실적 지표, 3열 그리드, 이미지 비율과 CSS를 유지한다.

## 데이터와 게시

`field_records`는 구조화된 초안과 공개 스냅샷, 검토 상태, 공개 날짜, 대표 자리(1~3), 수정 버전을 관리한다. `field_record_media`는 해당 기록에 속한 비공개 업로드 파일만 관리한다. 별도 분류 테이블은 만들지 않는다.

초안 저장·검토 요청은 현재 공개본을 변경하지 않는다. 게시는 저장한 초안을 검증한 뒤 공개본을 교체한다. 게시 취소는 공개본·게시일·대표 자리를 한 트랜잭션에서 해제한다. 게시했던 슬러그는 게시 취소 후에도 변경할 수 없다. 대표 자리는 유니크 제약으로 충돌을 막으며, 다른 기록이 차지한 자리를 자동으로 빼앗지 않는다.

수정 버전이 맞지 않으면 409를 반환한다. 공개 조회는 `published_content`만 읽고, 내부 메모와 숨긴 본문을 공개 DTO에서 제거한다. 초안 원고 JSON은 서버에서만 읽으며, 공개 다운로드가 가능한 관리자 클라이언트 청크에 포함하지 않는다.

## 미디어

업로드는 10MB 이하 정지 JPEG·PNG·WebP를 실제 파일 내용으로 검사한다. 비율을 유지해 최대 2400px로 저장하고 EXIF/GPS를 제거한다. 파일 이름과 저장 경로는 서버가 생성한다. 드라이브 내부 URL이나 임의 원격 URL 입력은 지원하지 않는다.

각 사진의 alt·설명·외부 게시 확인과 문서 전체의 확인이 필요하다. 게시 전 사진 소유 기록을 다시 검사한다. 원본 경로·서명 URL은 공개 DTO에 전달하지 않는다. 공개 미디어 엔드포인트는 현재 공개본에서 사용 중이며 동의 확인된 파일만 반환하고 `no-store`를 사용한다. 갤러리 영역을 숨기면 해당 갤러리 파일도 공개하지 않는다.

기존 광범위한 Storage 정책이 있더라도 새 비공개 버킷에 접근하지 못하도록, 그 버킷만 제외하는 restrictive policy를 적용한다. 다른 버킷 정책은 변경하지 않는다. 사진 삭제는 초안·공개본에서 연결을 해제한 파일에만 허용한다. 연결을 해제하고 저장한 사진도 파일 관리 패널에서 재사용·삭제할 수 있다.

세 원고의 대표 사진은 **이미 기존 공개 사이트에서 사용하던 로컬 파일**이다. 과거에 공개된 로컬 파일 URL까지 이 CMS가 철회하지는 않는다. 새로 업로드하는 비공개 사진은 위 접근 제어를 따른다. 기존 사진의 게시 동의도 자동 승인하지 않는다.

## 원고 이관

`scripts/prepare-field-record-seed.mjs`가 원본 지시서의 세 사례를 문단·제목·굵게 표시로 변환한다. 원문 SHA-256과 문구 일치 테스트로 재작성·유실을 검사한다. 실행은 JSON 파일 생성뿐이며 DB에 연결하지 않는다.

- 운영 기간: 미확인 값은 빈칸.
- 사진 공개 확인: 모두 false.
- 갤러리: 추가로 확인된 사진이 없으므로 비어 있음. 사진 구성 지시문을 실제 활동 기록으로 게시하지 않는다.
- 동작센터: 프로그램의 관찰 원칙 원문은 초안에 보존하되 `observations.visible=false`.
- 원고의 검토 지시문과 사진 기준은 비공개 내부 메모에 보존.

## 운영 전환 절차 — 별도 승인 후

1. 정확한 기존 Supabase 프로젝트와 마이그레이션 파일을 검토한다.
2. `supabase/migrations/20261107120000_field_records_cms.sql` **한 파일만** 승인된 방법으로 적용한다. 이 작업과 무관한 대기 마이그레이션을 함께 적용하지 않는다.
3. 현재 코드가 실행되는 관리자에서 승인 원고 3건을 초안으로 등록한다. 게시 버튼은 아직 누르지 않는다.
4. 실제 수업 기록·기관 일치·사진 게시 동의를 검토한다. 필요한 사진을 업로드하고 alt·설명을 입력한다.
5. 동작센터의 미확인 관찰 영역은 비공개 유지한다. 관리자 미리보기로 3건을 확인한다.
6. 콘텐츠 게시 승인 후 세 기록을 게시하고 대표 자리 1~3을 지정한다.
7. 공개 전환 승인 후 서버 환경에 `FIELD_RECORDS_CMS_ENABLED=true`를 설정하고 승인된 배포/재시작을 진행한다. 현재 코드의 기본값은 false이며 현 사이트를 유지한다.
8. 운영 환경에서 관리자 저장, 사진 업로드·수정·삭제, 게시·철회, 비관리자 차단, canonical·OG·사이트맵을 최종 확인한다.

전환 후 게시 취소는 관리자 기능으로 처리한다. 환경 플래그를 false로 되돌리면 기존 정적 카탈로그로 돌아가므로, 콘텐츠 철회 수단으로 사용하지 않는다.

## 로컬 검증

- `npm run typecheck`
- 새 파일과 수정된 관련 파일에 ESLint `--max-warnings 0`
- `node node_modules/vitest/vitest.mjs run app/lib/field-records app/lib/server/fieldRecords.test.ts app/api/admin/field-records app/spokedu/records/cms.test.ts app/spokedu/website/public-v2.contract.test.ts app/spokedu/data/site-ia.test.ts app/spokedu/data/field-records-catalog.test.ts`
- `node scripts/prepare-field-record-seed.mjs --check`
- `node scripts/verify-field-records-db.mjs`: `.tmp/field-records-db`에 설치한 PGlite의 메모리 PostgreSQL만 사용. 환경변수와 운영 DB를 읽지 않는다.
- `FIELD_RECORDS_RENDER_QA=true`로 원고 테스트 실행 후 `node scripts/qa-field-records.mjs`. HTTP loopback만 허용한다. 상세·홈 카드는 실제 컴포넌트를 렌더링하며 관리자 API는 브라우저 내부 fixture로 대체한다.

화면 결과는 `.tmp/field-records-qa/`에 저장한다. 실제 운영 인증 세션·Storage 쓰기·게시의 통합 검증은 마이그레이션/게시 승인을 받은 이후 수행한다. fixture 검증을 운영 E2E 통과로 취급하지 않는다.
