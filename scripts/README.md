# scripts/ — QA·운영

## Active (루트)

[`package.json`](../package.json)의 `qa:*`, `audit:*`, `verify:*`, `doctor:*` 스크립트가 여기 있습니다.  
MASTER 상용 게이트 체인: `spokedu-master-commercial-verification-report.mjs` → `spokedu-master-release-automated.mjs`.

## lib/ · note-qa/

공유 모듈·노트 QA 헬퍼. archive로 옮기지 않습니다.

## archive/one-off/

일회성 repair·backfill·구버전 capture·수동 import 등. **npm script에서 호출하지 않습니다.**  
재실행 시 DB/콘텐츠 영향을 확인한 뒤 사용하세요.

## sql/

스키마 inspect 등: [`scripts/sql/spokedu-master-program-meta-schema-inspect.sql`](sql/spokedu-master-program-meta-schema-inspect.sql)
