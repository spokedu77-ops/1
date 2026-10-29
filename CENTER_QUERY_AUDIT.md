# 센터 쿼리 감사

> 2026-10-30 구현 반영: getCenters는 CenterListItem을 반환한다. SELECT에서 centers.created_at과 세 강사 관계의 id를 제거했고 표시용 세 관계(name)는 유지했다. 주소 등 12개 상세/미사용 키를 목록 응답에서 제외한다. 기존 검색/350ms debounce 유지, pagination/추가 캐시/인덱스 없음. 생성·삭제·상태·상세 저장은 액션 결과로 해당 목록 행을 갱신하며 전체 재조회하지 않는다. 필터 응답 경쟁과 StrictMode 초기 중복도 방어한다. [최종 보고](CENTER_OPTIMIZATION_IMPLEMENTATION_REPORT.md)의 전후 표/검증을 참고한다. 아래는 승인 전 감사 기록이다.

기준과 실측 한계: [기준선](CENTER_PERFORMANCE_BASELINE.md). 모든 개수는 별도 표기가 없으면 코드 경로 분석이며 실제 계측값이 아니다.

## 호출과 projection

`app/admin/centers/page.tsx` → `getCenters({status:'active'})` → `CentersHubClient` → `CentersClient`. 실패는 page에서 빈 배열로 바뀐다. 클라이언트는 초기 effect를 skip하고 필터 변경에 서버 액션을 호출한다.

`app/admin/centers/actions/centers.ts`의 getCenters 실제 SELECT:

```text
id,name,region_tag,contact_name,contact_phone,contact_email,contact_role,
status,weekly_schedule,highlights,created_at,updated_at,
main_teacher:main_teacher_id(id,name),mt2:main_teacher_2_id(id,name),
mt3:main_teacher_3_id(id,name)
```

단일 PostgREST 요청에 강사 3관계가 포함된다. 센터별 반복 요청 루프는 없다. 실제 SQL 조인 비용은 실행계획 미확보다. `address`는 검색 조건에서 사용하지만 SELECT하지 않는다. 계약/수업료/출입 안내/범죄조회 파일·시설 ID·비밀번호를 목록 DB에서 읽지 않는다.

검색은 name/address/contact_name/contact_email의 `%term%` ilike OR다. status/region_tag는 eq, 정렬은 name뿐이며 동명 tie-breaker가 없다. 검색 문자열은 스키마 최대 100자 및 일부 구문문자 치환을 거친다. 검색 기능을 name-only로 축소하면 회귀다.

`normalizeCenterRow()`는 반환을 상세 Center 모양으로 확대한다. DB에서 가져오지 않은 address/access_note/계약/수업료/teacher IDs/instructors_default/범죄조회 필드가 null·빈 값으로 추가된다. 목록 DTO를 별도로 만들면 이 비용과 의미 혼동을 제거할 수 있다.

## 기능 보존형 목록 DTO 제안

현재 UI는 id/name/status/region_tag와 강사 3명, 연락처 4필드, weekly_schedule, highlights를 사용한다. 여기에 updated_at을 유지한다. created_at과 관계의 users.id는 표시하지 않는다. 상태 변경·삭제에는 센터 id가 필요하다.

권고: 위 사용 필드를 유지하는 `CenterListItem`을 우선 도입한다. 사용자의 기본 최소 필드만 남기려면 현재 연락처·시간표·특이사항 표시를 없애거나 별도 표시 방식으로 옮기는 제품 승인이 필요하므로 이번 계획에서 무단 제거하지 않는다. 시간표의 place/note도 목록에서 표시하지 않지만 JSON 전체를 선택하므로, 서버 반환에서 표시용 day/start/end 및 개수만 가공하는 안은 검토 가능하다. DB JSON projection은 실행계획과 전송량을 보고 결정한다.

반환 제안: items/hasMore/nextCursor. 정렬 기본 name 유지, id tie-breaker 추가. 기존 첫 화면 전체 목록을 잘라내기 전에 전체/상태별 실제 수량을 확인하고 pageSize를 확정한다. 현재 수량 미측정으로 20/50 등 임의값을 확정하지 않는다. pagination은 전체 데이터 접근을 보존한다.

## A — 목록 조회량·페이지네이션 영향도 보완

| 항목 | 판정 |
|---|---|
| 실행으로 확인한 성능 병목 | 없음. 정상 관리자 화면 접근 불가로 rows/bytes/지연 미측정 |
| 정적으로 확인한 비용 | limit/range 없음, 세 강사 관계 포함, 결과 전체 정규화 및 모바일/데스크톱 양쪽 JSX 생성 |
| 예상 효과(추정) | DTO 분리는 빈 상세 키와 미사용 created_at 등을 제거. pagination은 결과 수가 클 때 전송/DOM 비용을 줄임. 예상 감소율 수치 없음 |
| 변경 파일(승인 후 후보) | centers/actions/centers.ts, lib/centers/types.ts, centers/page.tsx, CentersHubClient.tsx, CentersClient.tsx |
| 회귀 위험 | 페이지 누락/중복, 동명 정렬, 필터 이탈 후 빈 페이지, 표시 필드 유실, 기존 검색 대상 축소 |
| 우선순위 | P0 검토: DTO/응답 경쟁 방어. P2 조건부: pagination/인덱스/행 memo 등 측정 의존 최적화 |

페이지네이션은 현재 필요성이 입증되지 않았다. 실제 전체/활성/검색 결과 수, RSC bytes, DOM/렌더 trace를 확인한 뒤 결정한다. 응답이 API 최대 행 한도에 잘리는 사실이 확인되면 성능과 별개로 데이터 접근 보존 문제로 우선순위를 올린다. 단순히 데이터 수가 많을 것으로 가정하여 cursor API를 만들지 않는다.

이미 존재하는 서버 검색 및 350ms 검색 debounce를 다시 구현하지 않는다. 기존 검색 로직은 유지하고 늦은 응답 무시만 보완 후보로 둔다. region_tag는 현재 즉시 필터이므로 그 입력의 추가 debounce도 실제 요청 빈도가 불필요한 경우에만 검토한다. status select에 debounce를 일괄 적용하지 않는다.

## 상세 및 변경 경로

직접 `[id]/page.tsx`는 ID만 상세 클라이언트에 전달한다. 서버에서 getCenterById를 호출하지 않는다. 클라이언트 마운트 시 getCenterById(id), getActiveTeachers(), getCenterHistory(id)가 실행된다.

getCenterById는 UUID 검증 후 단일 id로 상세 23개 scalar/JSON 컬럼 및 세 강사 관계를 조회한다. 시설 비밀번호는 제외하며 별도 getCenterCriminalCheckPassword(id)로 조회한다. history는 center_id eq + created_at DESC + limit 200. teachers는 모든 활성 teacher/admin의 id/name.

updateCenter는 UPDATE에 상세 SELECT를 붙여 갱신 결과를 반환한다. 상세 저장은 이 결과를 바로 반영하여 추가 getCenterById를 하지 않는다. 목록 상태 변경도 로컬 행을 갱신한다. 목록 생성/삭제 후에는 getCenters로 전체 현재 필터를 재조회한다. 히스토리 생성/수정/삭제는 히스토리 재조회를 수행한다. 이들을 모두 ‘중복’으로 단정하지 말고 목적 및 최소화 가능성을 구분한다.

## 권한

모든 센터/히스토리/민감 파일 서버 액션은 requireAdmin을 거친 뒤 service role을 사용한다. service role은 RLS를 우회하므로 UI 권한 확인을 서버 검사 대용으로 삼으면 안 된다. 신규 목록/상세/정산 검색도 동일한 서버 권한 검사를 유지한다. 정산은 추가 MASTER_EMAIL 제한이 있다. getUser와 관리자 판별 캐시(30초)는 이번 범위에서 변경하지 않는다.

## 인덱스·실행계획

- migration에서 확인: `idx_center_history_center_created(center_id,created_at DESC)`, created_by 보조 인덱스, centers main_teacher_2_id/main_teacher_3_id 인덱스.
- archive SQL에 status/contract_end/main_teacher_id 인덱스 선언이 있지만 배포된 현재 스키마의 증거가 아니다.
- 현재 DB의 pg_indexes/pg_policies/제약조건/실제 행 수/EXPLAIN은 미확보다. 프로젝트를 임의 선택하여 운영 DB를 조회하지 않았다.
- 적절한 대상 DB 확인 후 읽기 전용 트랜잭션과 statement_timeout 안에서 catalog 및 count를 확인한다. 로컬 복제본에서 실제 projection+관계+status/region/search+name 정렬의 EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON)을 확보한다. 데이터가 적으면 seq scan이 더 적절할 수 있다.
- 후보는 실제 패턴에 따라 status/name/id 또는 region/name/id, contains 검색 trigram 등이다. 현재는 추천 인덱스 확정이나 migration 작성 없음. 단순 B-tree가 `%term%` OR를 해결한다고 주장하지 않는다. 적용 효과·쓰기 비용·크기를 입증한 뒤에만 별도 승인 제안한다.
