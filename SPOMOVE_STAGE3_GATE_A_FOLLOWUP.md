# Stage 3 Gate A 차단 해소 사전 조사

상태: **GATE_A_BLOCKED**. 이번 지시서의 `추가 수정 승인 필요` 표기에 따라 추가 제품 수정은 하지 않았다. 기존 F17 수정, 홈페이지 작업자의 미커밋 변경, 기존 감사·실패 테스트 증거를 유지했다. 새로 작성한 파일은 이 보고서 및 `.spomove-gate-a-followup/` 조사 산출물뿐이다.

## GA-BLOCK-01: 최소 변경 제안

`app/spokedu/data/about-v0-media.ts:36,43,50`의 명시적 `nameEn`은 뒤의 `...HOME_SECTION03_PEOPLE[index]`에서 덮어써진다. 실제 최종값의 출처는 `app/spokedu/components/home-web/home-section03-people.ts:20,28,36`이다. 양쪽 값은 각각 `JIHOON CHOI`, `KIM YUNKI`, `KIM GUMIN`으로 동일하다.

승인 대상 차이: about 파일의 중복 `nameEn` 3줄만 제거. 공통 인물 파일은 수정하지 않는다. 이름·직책·사진·소개 문구 및 홈페이지 작업자의 나머지 변경은 보존한다. 기존 TypeScript TS2783 3건의 원인 제거안이며 아직 적용·재검증하지 않았다.

## GA-BLOCK-02: 단순 export 제거 조건 불충족

`app/api/admin/note/documents/route.ts:33` 헬퍼의 실행 호출은 같은 파일 DELETE의 417행뿐이다. 그러나 `route.test.ts:3`이 해당 named export를 직접 import한다. 따라서 외부 소비자가 전혀 없다는 조건은 성립하지 않는다. export만 제거하면 기존 테스트가 깨진다.

승인 대상 제안: 헬퍼 본문·타입·쿼리를 변경하지 않고 일반 모듈로 분리하고, route와 기존 테스트의 import 경로만 바꾼다. 기존 테스트의 기대값은 그대로 보존한다. 이 제안은 아직 적용하지 않았다.

현재 DELETE는 관리자 인증 후 문서를 soft delete하고, 자식 문서 페이지 블록 정리 → 해당 문서의 활성 블록 soft delete → `delete_document` 감사 로그 순서로 동작한다(route.ts:377–433). 헬퍼는 document_id 및 deleted_at=null 필터, actor/time 기록, 삭제 블록 수 반환을 담당한다. 복구 UI는 별도 Note V2 경로도 사용한다(`app/admin/note/_v2/NoteV2Workspace.tsx:212,239`, `app/api/admin/note-v2/tree/[id]/route.ts:49`). 이번 테스트를 전체 휴지통·복구·감사 로그의 통합 회귀 PASS로 해석하지 않는다.

## F17 CMS 도달성

- `programs/page.tsx:1612`의 SpomoveContentManager는 현재 실행 호출이 없다.
- 기본 activeTab은 3381행의 spomove-content지만, 3441행의 유효성 검사 효과가 첫 유효 탭으로 교정한다. 탭 목록에 이 키가 없고 JSX에도 분기가 없다.
- 현재 CMS는 SpomoveCatalogManager(1508행) → 카드 선택 → SpomoveEditModal(1589행) 경로로 접근한다. 공유 콘텐츠 데이터 로딩·저장 경로를 사용한다.
- Git `a2dfd112f`는 기존 설명 탭 및 JSX의 SpomoveContentManager 연결을 제거하고 공식 카탈로그에 SpomoveCatalogManager를 연결했다. 이는 화면 기능 이전과 이전 함수 잔존의 근거다. 정책 문서에 의한 영구 폐기 승인까지 확인한 것은 아니다.
- 기존 함수는 삭제하거나 화면에 연결하지 않았다. F17의 export 제거로 생긴 unused 경고는 남아 있다. 경고 0을 충족하려면 이 레거시 함수 처리에 대한 별도 결정이 필요하다. 더미 참조·경고 억제로 숨기지 않았다.

## Next 추가 value export 정적 조사

설치된 Next의 next-types-plugin 허용 목록을 기준으로 app의 page/route ts·tsx 323개, export 509개를 AST로 조사했다. 상세 결과: `.spomove-gate-a-followup/export-scan.json`. 타입 전용 선언은 제외했다. 아래는 허용 목록 밖 value export이며, 전체 빌드가 각 항목까지 진행해 오류를 출력했다는 뜻은 아니다.

| 파일 | 행 | export |
|---|---:|---|
| app/(spokedu-public)/subscription/page.tsx | 51 | SpokeduLabLandingPage |
| app/api/admin/note/documents/route.ts | 33 | softDeleteBlocksForDocument |
| app/api/spokedu-master/shop/spomat/purchase/route.ts | 8 | isSafePurchaseUrl |
| app/api/spokedu-master/programs/route.ts | 399 | MasterProgramSourceLoadError |
| app/api/spokedu-master/programs/route.ts | 415 | loadPublishedMasterProgramsFromDb |
| app/api/spokedu-master/payment/billing/renew/route.ts | 61 | SPOKEDU_MASTER_RENEWAL_BATCH_LIMIT |
| app/api/spokedu-master/payment/billing/renew/route.ts | 274 | calculateRenewalRetryAt |

Note 외 6개 항목은 승인 범위 밖으로 자동 수정하지 않았다.

## 검증과 한계

현재 코드 기준 기존 Note documents·app/lib/note·Note Lite 트리·CMS split/compact contract 테스트 **89/89 PASS**, 실패 0. 원본 JSON: `.spomove-gate-a-followup/baseline-tests.json`. 이는 수정 후 검증이 아니라 변경 전 기준선이다. CMS 계약 테스트는 실제 브라우저 렌더링 증명이 아니다.

TypeScript·ESLint·Production Build는 추가 수정이 적용되지 않아 이번 조사에서 반복하지 않았다. 이전 Gate A 결과는 TypeScript 3건 FAIL, 페이지 unused 경고 1건, Production Build Note 추가 export FAIL이며 이전 보고서와 증거를 보존한다. 전체 복구/휴지통/감사 로그 통합 검증 및 브라우저 QA는 미실행이다.

## 승인 후 순서 및 위험

1. About 중복 3줄 제거: 동일 값 보존, 최소 위험.
2. Note 헬퍼 일반 모듈 분리 + route/test import 경로 변경: DB 의미 보존, 모듈 의존성 회귀 확인 필요.
3. 레거시 CMS 함수의 경고 해소 방법 승인 필요. 삭제·활성화 금지 조건을 유지한다.
4. 나머지 6개 Next export는 소비자 조사 후 별도 승인 필요. 현재 범위만으로 전체 Build PASS를 보장할 수 없다.
5. 승인된 수정 이후 TypeScript, 변경 파일 ESLint, 전체 Production Build, CMS·Note 회귀 검증. 새 오류는 보고하고 임의 수정하지 않는다.

Gate B/C/D, DB 변경, Git stage/commit/push, 배포는 수행하지 않았다.
