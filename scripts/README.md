# scripts/ — QA·운영

## Active (루트)

[`package.json`](../package.json)의 `qa:*`, `audit:*`, `verify:*`, `doctor:*` 스크립트가 여기 있습니다.  
MASTER 상용 릴리스 진입점은 `spokedu-master-release-automated.mjs`이며 내부에서 `spokedu-master-commercial-verification-report.mjs`를 호출합니다. 둘을 연달아 별도 실행해 빌드와 검사를 중복하지 않습니다.

현재 검사 선택과 실제 범위는 [docs/TESTING.md](../docs/TESTING.md)를 따릅니다. 상용 게이트는 명시적인 릴리스 검증용이며 일반 수정의 기본 절차가 아닙니다. public shell/typography 진입점은 `lib/spokedu-public-qa.mjs`의 동일한 현행 동작 검사를 호출합니다. `--list`로 브라우저 실행 전 선택 범위를 확인할 수 있습니다.

## lib/ · note-qa/

공유 모듈·노트 QA 헬퍼. archive로 옮기지 않습니다.

## archive/one-off/

일회성 repair·backfill·구버전 capture·수동 import 등. **npm script에서 호출하지 않습니다.**  
재실행 시 DB/콘텐츠 영향을 확인한 뒤 사용하세요.

## sql/

스키마 inspect 등: [`scripts/sql/spokedu-master-program-meta-schema-inspect.sql`](sql/spokedu-master-program-meta-schema-inspect.sql)
