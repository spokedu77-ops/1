# SPOMOVE STAGE 3 — GATE A 로컬 수정 결과

2026-10-30 (Asia/Seoul). 승인 범위: F17의 잘못된 Next page named export만 수정.

**판정: GATE_A_BLOCKED**

F17의 추가 value export는 제거했지만, 전체 TypeScript 검사와 Production Build가 각각 범위 밖 오류로 실패했다. 다른 오류를 임의 수정하지 않았으며 Gate B/C/D는 시작하지 않았다.

## 1. 변경 파일과 코드 차이

제품 수정 파일은 한 개다.

- `app/admin/spokedu-master/programs/page.tsx:1612`

```diff
-export function SpomoveContentManager() {
+function SpomoveContentManager() {
```

이 모듈의 default export인 `AdminSmProgramsPage`는 그대로다. `app/admin/spokedu-master/spomove/page.tsx`도 기존과 같이 그 default export를 가져온다.

변경 전 value export는 `SpomoveContentManager`와 default `AdminSmProgramsPage`, 변경 후는 default만 남는다. Next page 모듈에 허용되지 않은 추가 component value export를 제거한 것이다.

저장소 전체 호출 검색에서 `SpomoveContentManager` named export를 import하는 제품 코드는 발견하지 못했다. 함수를 다른 파일로 이동하거나 삭제하지 않았다. 본문·hook·헬퍼·import·JSX·CMS 저장 요청·storage 경로·인증 코드는 변경하지 않았다. 줄바꿈을 정규화한 파일 전체 비교에서 `export ` 제거 외의 내용 차이가 없음을 확인했다.

정확한 비교 결과와 전후 SHA-256은 [.spomove-gate-a/change-proof.json](.spomove-gate-a/change-proof.json)에 있다. 변경 전 원본은 [.spomove-gate-a/programs-page.before.tsx](.spomove-gate-a/programs-page.before.tsx)에 보존했다.

## 2. 검증 환경

- HEAD: `685fe9eed8ee42a57ed1fea89902ffa792529094`.
- 작업 트리에 기존 홈페이지/공개 미디어 변경과 감사 산출물이 있었다. 기존 변경은 되돌리거나 발행하지 않았다.
- TypeScript와 전체 Build는 `.spomove-gate-a/workspace/`의 격리 복사본에서 실행했다. 현재 추적 파일과 미추적 제품 의존성을 포함해 3,521개 파일을 복사했다.
- 이전 감사 harness의 TypeScript fixture와 임시 build 사본은 포함하지 않았다. 따라서 감사 도구의 타입 오류를 제품 오류로 혼동하지 않는다.
- 운영 `.env`/credential은 복사하지 않았다. Supabase 주소/key는 로컬 placeholder이며 외부 fetch/http/https는 guard로 차단했다. DB 변경·실제 저장 요청·배포는 수행하지 않았다.
- Next.js 16.2.11의 로컬 page/use-client 문서를 확인했다. 전체 build는 지원되는 webpack backend의 `next build --webpack`로 실행했으며 타입 검사 무시 옵션은 사용하지 않았다.

복사 범위와 소스 해시는 [snapshot-metadata.json](.spomove-gate-a/snapshot-metadata.json), [snapshot-hashes.json](.spomove-gate-a/snapshot-hashes.json)에 있다. 기존에 진행 중이던 범위 밖 변경까지 순수 HEAD 상태라고 주장하지 않는다.

## 3. 검증 결과

| 검증 | 결과 | 근거 |
|---|---|---|
| page value export 정합성 | default만 남음 | AST 전후 비교, change-proof.json |
| CMS 코드 보존 | export 제거 외 동일 | 파일 전체 정규화 비교 |
| Next typegen | PASS, exit 0 | typegen-result.json |
| 전체 TypeScript `tsc --noEmit --incremental false --pretty false` | FAIL, exit 2 | 범위 밖 TS2783 세 건 |
| 변경 파일 ESLint | exit 0, 오류 0 / 경고 1 | eslint-after.json |
| 변경 전 snapshot ESLint | exit 0, 오류 0 / 경고 0 | eslint-before-snapshot.json |
| 전체 Production Build | FAIL, exit 1. webpack compile은 6.5분 만에 통과 | 다른 route의 금지된 추가 export로 Next 타입 검사 실패 |
| Stage 2 증거 보존 | 257개 manifest entry 해시 불일치 0 | change-proof.json |

실행 명령:

```text
node .spomove-gate-a/prepare.cjs
node .spomove-gate-a/verify.cjs types
node node_modules/eslint/bin/eslint.js app/admin/spokedu-master/programs/page.tsx --format json --output-file .spomove-gate-a/eslint-after.json
node .spomove-gate-a/verify.cjs build
```

`verify.cjs types`는 격리 복사본에서 Next typegen 다음 프로젝트 전체 TypeScript를 실행한다. `verify.cjs build`는 같은 snapshot에서 전체 Next Production Build를 수행한다. 실제 명령·cwd·시작/종료 시각·exit code는 각 `*-result.json`에 기록한다.

## 4. 범위 밖 차단 오류 — GA-BLOCK-01

파일: `app/spokedu/data/about-v0-media.ts:36`, `:43`, `:50`.

```text
TS2783: 'nameEn' is specified more than once, so this usage will be overwritten.
```

세 객체가 각각 `nameEn`을 명시한 뒤 `...HOME_SECTION03_PEOPLE[index]!`를 펼친다. 펼친 객체에도 `nameEn`이 있어 앞의 값이 덮인다. 이 파일은 Gate A 시작 전부터 변경되어 있었고 이번 Gate A에서는 쓰지 않았다. 검사 시 원본과 snapshot 해시가 같은 것도 확인했다.

이 오류는 F17의 page export 문제와 다르다. 사용자의 “다른 오류는 별도 보고하고 임의 수정하지 말 것”에 따라 파일·spread 순서·데이터·타입을 변경하지 않았다.

로그: [typescript.log](.spomove-gate-a/typescript.log), [typescript-result.json](.spomove-gate-a/typescript-result.json).

## 5. 별도 Build 차단 오류 — GA-BLOCK-02

파일: `app/api/admin/note/documents/route.ts:33`의 `export async function softDeleteBlocksForDocument`.

Production Build는 webpack compile을 통과한 다음 다음 생성 검사에서 실패했다.

```text
.next/types/app/api/admin/note/documents/route.ts:14:13
Property 'softDeleteBlocksForDocument' is incompatible with index signature.
Type '(...args) => Promise<number>' is not assignable to type 'never'.
```

Next route 모듈이 허용하는 HTTP handler/config 이외의 helper value export가 원인이다. 이 route는 Note 문서 삭제 경로에서 해당 helper를 사용하지만 SPOMOVE CMS page의 F17과는 다른 파일·기능이다. 이번 Gate A에서는 이 파일을 수정하지 않았으며 snapshot과 현재 원본 해시도 일치한다. export 제거·함수 이동·삭제 동작 변경을 수행하지 않았다.

F17 page의 금지된 export를 제거했다고 해서 이 별도 route 오류까지 해결된 것은 아니다. Build는 첫 차단 진단에서 멈췄으므로 이후 오류가 더 없다고 보증하지 않는다. 별도 `tsc`에서 확인한 GA-BLOCK-01도 남아 있다.

로그: [production-build.log](.spomove-gate-a/production-build.log), [production-build-result.json](.spomove-gate-a/production-build-result.json). 전체 시도는 16:44:43~16:54:29 KST에 실행됐다.

## 6. ESLint 경고와 회귀 위험

export 제거 후 `SpomoveContentManager`가 page-local 함수가 되어 `@typescript-eslint/no-unused-vars` 경고 1건이 발생한다. 현재 저장소에서 이를 호출하는 제품 코드는 발견하지 못했다. 변경 전 원본을 stdin으로 검사한 결과는 경고 0건이다.

이 경고를 숨기기 위해 eslint-disable, dummy reference, 이름 변경, 코드 삭제 또는 비활성화를 추가하지 않았다. 관련 함수와 CMS 내용은 그대로 보존했다. ESLint exit 0을 경고까지 없는 clean PASS로 표현하지 않는다.

회귀 위험과 한계:

1. 현재 확인된 소비자는 default export를 사용하므로 export 제거의 실행 영향은 낮다. 파일 전체 비교가 함수 본문과 저장·인증 경로의 보존을 뒷받침한다.
2. 외부에서 사용하지 않던 named export 제거로 드러난 미사용 함수 경고는 남아 있다. 함수 이동/삭제/기능 연결은 이번 최소 수정에 포함하지 않았다.
3. 전체 빌드가 차단돼 production artifact 기준 CMS 실행 보존을 최종 PASS로 선언할 수 없다. 실제 CMS 저장·업로드·권한·DB 쓰기 검증은 수행하지 않았다.
4. 기존 785개 테스트 결과와 신규 실패 테스트를 수정·삭제·완화하지 않았다. 이번 Gate A에서 이를 재실행한 PASS로 재사용하지 않는다. 이번 요청의 TypeScript·ESLint·전체 Build를 검증 기준으로 삼았다.
5. Gate B의 반복 횟수/골키퍼, Gate C의 종료/잠금, Gate D의 readiness 코드는 수정하지 않았다.

## 7. 보존 및 후속 상태

- Stage 1/2 보고서와 `.spomove-audit-stage2/`의 기존 증거는 변경하지 않았다.
- 현재 Gate A 증거와 검증 도구는 `.spomove-gate-a/`에 별도로 둔다.
- DB 변경·stage·commit·push·브랜치 생성·deploy 없음.
- 제품 코드는 위 한 줄 변경을 미커밋 상태로 남긴다.

**GATE_A_BLOCKED**. F17 수정만으로 전체 TypeScript/Production Build 통과를 보장할 수 없으므로, 범위 밖 차단 오류의 처리와 재검증은 별도 승인 범위로 남긴다.
