# SPOMOVE Stage 3 — 잔여 결함 로컬 수정 결과

기준일: 2026-10-31 KST. 판정: **BASELINE_VERIFIED / REMAINING_LOCAL_FIXES_COMPLETE / NOT_DEPLOYED**.

사용자의 “다 해결” 지시와 F12·F13 정책 답변을 반영했다. 확인된 F01–F19의 잔여 로컬 결함을 수정했고, F20은 기존 `FALSE_POSITIVE` 판정을 유지한다. commit·push·deploy, DB 데이터·스키마·마이그레이션 변경은 수행하지 않았다. 운영 서버에 이번 변경이 반영됐다는 뜻은 아니다.

## 1. 기준선과 변경 보존

- 로컬 HEAD, origin/main, GitHub 원격 main 모두 `61a3b74657ee42ea4a6694baeb09e10c83b25629`다. 셸의 원격 조회는 네트워크 제한으로 실패하여 GitHub 연결로 독립 확인했다. pull/reset/checkout/clean/rebase는 하지 않았다.
- 이번 작업 직전 전체 app 소스와 Product Contract를 별도 보존했다. 이번 차이는 소스·계약 문서 **32개(신규 9개 포함)**와 이미지 2개다. 무관한 app 변경은 0개다.
- 최종 검증 복사본과 현재 app **1,853개 파일의 SHA-256이 모두 일치**한다.
- Gate A 테스트 수정과 Gate B의 정규화·골키퍼 구현/회귀 테스트, EngineRouter는 작업 직전 SHA-256 그대로다. 기존 Gate B 증거 142개, Gate C 증거 149개도 모두 보존됐다.
- [전체 전후 diff](.spomove-final/remaining-fixes.diff), [변경 파일·전후 해시](.spomove-final/changed-source-hashes.json), [검증 소스 일치](.spomove-final/source-stability.json), [기존 소스 보존](.spomove-final/prior-source-preservation.json), [원격 확인](.spomove-final/remote-main.json).

## 2. 근본 원인과 실제 수정

| 항목 | 원인 | 수정 방식·영향 |
| --- | --- | --- |
| F01 | pause 플래그와 실제 시계·timer·RAF가 분리돼 있었다. | 활성 시간을 정지하고 timeout의 잔여 시간, interval 주기, RAF를 보존해 재개한다. 취소한 작업은 재개하지 않는다. 새 pause UI를 추가하지 않았다. |
| F05 | 같은 모드의 메뉴 밀도가 선택 level에 따라 달라졌다. | Simon·Flanker·Spatial의 메뉴 밀도를 모드 단위로 고정했다. |
| F06 | player CSS의 `:root`, body, reset, button 규칙과 theme effect가 외부 화면에 적용됐다. | player root에 CSS와 테마를 한정한다. 결과 화면도 자체 root를 사용한다. 외부 document 테마·버튼을 변경하지 않는다. |
| F07 | Admin launch 변환이 response seconds에 start seconds를 대입했다. | 두 값을 각각 전달한다. 6초/2초로 서로 다른 입력을 실제 player props까지 확인했다. |
| F08 | 시작·완료 TTS 문자열이 손상돼 있었다. | 해당 발화 문자열만 정상 한국어로 교체했다. 무관한 주석은 재작성하지 않았다. |
| F09 | `exitFullscreen()` 거부가 미처리 Promise 오류로 남았다. | 선택적 fullscreen 종료의 동기 예외·비동기 거부를 처리한다. STOP 결과는 그대로 전달한다. |
| F10 | Admin의 현재 Shape Completion UI ID 8에 레거시 카탈로그 정규화를 다시 적용했다. | 현재 UI 번호·이름·영문 표시를 일치시켰다. 엔진 ID, 공식 preset ID, 레거시 dispatch는 바꾸지 않았다. |
| F12 | 전용 계정을 known-admin으로 인정한 서버가 UI scope를 강제하지 않았다. | 일반 `requireAdmin`은 해당 계정을 거부한다. SPOMOVE endpoint만 명시적으로 허용하고, 공유 pack/storage API는 정확한 SPOMOVE pack ID·경로를 검사한다. 혼합 삭제는 service client 호출 전에 전체 거부한다. |
| F13 | users 행이 없을 때도 `undefined !== false`로 허용됐고 admin은 행 확인도 우회했다. | 등록 행 확인 후 기존 admin·활동 상태·기관 정책을 적용한다. 조회 실패·미등록은 거부한다. 기존 API 응답 계약은 유지했다. |
| F14 | 동작 부록의 펼침 버튼 높이가 39px였다. | 최소 높이 44px를 보장했다. 두 viewport에서 실제 DOM 높이 44px를 확인했다. |
| F15 | 완료 음성·효과음 예약 handle이 없어 이탈 후 실행됐다. | 실행 소유자가 예약을 보유하고 재실행·unmount에서 취소한다. 다른 세션의 음성을 전역 cancel하지 않는다. 중복 terminal 처리 뒤 완료 발화도 예약하지 않는다. |
| F16 / Gate D | autoLaunch가 readiness를 무시했고 pack 조회 오류와 실제 이미지 실패를 준비 완료와 구분하지 않았다. | readiness 충족 후 실행한다. 실제 로드 성공 이미지로 최소 수·색 조건을 검사한다. 조회 15초/이미지 10초 준비 제한, stale 요청 취소, 오류·부족 안내, 재시도·안전한 복귀를 제공한다. 이 제한은 훈련 실행 시간을 늘리는 우회가 아니다. |
| 추가 호환성 | Teacher의 명시적 `undefined` 테마가 기본 color 값을 덮어썼다. | autoLaunch 병합에서 누락 테마를 기존 color 기본값으로 복원했다. Teacher 랜덤 Flanker가 잘못 차단되지 않음을 재현했다. |
| 추가 이미지 오류 | 매트 화면이 참조하는 brand 하위 PNG 두 개가 없었다. | 기존 원본 PNG를 바이트 그대로 해당 경로에 복원했다. Next 이미지 최적화 응답이 두 파일 모두 200이다. |
| C2 추가 소유권 | 부록·이미지 catalog·배너 modal이 body overflow를 직접 저장/복원했다. | 기존 소유자별 scroll-lock hook으로 통일했다. 외부 잠금을 먼저 반환해도 modal 잠금이 유지되고 마지막 반환 후 원래 스타일을 복원한다. |

F02·F03·F04·F11의 종료 원인·스크롤 수명주기 수정, F18·F19의 실행 분량·완료 조건 수정은 보존하고 회귀 검증했다. F17 등 최신 HEAD의 빌드 수정도 중복 적용하지 않았다. CMS 함수 삭제·재연결·화면 개편은 하지 않았다.

## 3. F12·F13 승인 정책과 서버 검증

승인된 결정은 [Product Contract PD-020·PD-021](docs/SPOKEDU_MASTER_PRODUCT_CONTRACT.md)에 기록했다. 다른 관리자의 권한, 상용 구독·이용권 판정, 저장 데이터 계약은 바꾸지 않았다.

서버의 검증된 `getUser()` identity를 사용한다. 일반 관리자 endpoint에는 전용 계정의 캐시된 admin 판정이 있어도 scope 제한이 우선한다. 공유 asset endpoint는 다른 pack ID, SPOMOVE로 위장한 theme, 다른 storage 경로, 경로 우회 및 혼합 삭제를 거부한다.

로컬 실제 Next 서버에서 Auth 응답만 fixture로 공급하여 다음을 확인했다. 운영 계정으로 쓰기 요청을 보내지 않았다.

- check-admin: `200 / admin:true / scope:spomove`.
- 일반 programs 관리자 API, 다른 pack 저장, 다른 storage 업로드 서명: **403**.
- 미등록 fixture의 Teacher check: 기존 응답 계약인 `200 / allowed:false`.
- 동일 fixture의 Teacher 자료 API: **403**, 자료 조회·저장 이전 차단.

운영 Supabase는 **SELECT만** 실행했다. 대상 계정은 `users.role=spomove`, `is_admin=false`, `profiles.role=teacher`, Auth JWT role `authenticated`, 등록 행 존재 상태다. 현재 pack/storage 쓰기 정책과 관리자 helper도 읽어 확인했으며 이 계정에 일반 DB 관리자 권한을 부여하는 상태는 확인되지 않았다. 계정·DB·RLS를 변경하지 않았다. 전체 운영 DB 보안 감사를 수행했다는 의미는 아니다.

증거: [권한 단위 테스트](.spomove-final/security-recovery-green.json), [실제 Next 직접 요청](.spomove-final/next-direct-guards.json), [Next 복구·서버 검사](.spomove-final/next-recovery.json), [계정 읽기 결과](.spomove-final/live-account-read.json), [관리자 helper](.spomove-final/live-authorization-helpers-read.json), [관련 RLS 읽기 결과](.spomove-final/live-resource-policies-read.json).

## 4. 수정 전 실패 → 수정 후 성공

- 동일 신규 회귀 테스트 25개에 작업 직전 구현을 격리 적용: **14 FAIL / 11 PASS**. 현재 전체 실행에서는 해당 테스트가 모두 PASS다. 원본 작업 트리를 되돌리거나 기존 기대값을 완화하지 않았다.
- 실제 React player의 직전 소스에서는 빈 팩·조회 실패의 대기 고착, 전역 theme/button 침범, pause 중 완료, 이탈 후 손상된 완료 TTS, fullscreen 거부 예외를 재현했다. 수정 후 준비 오류 6종·재시도/정상 완료, 두 viewport의 pause/발화 소유권, STOP 예외 처리가 모두 통과했다.
- Admin 실제 화면에서 메뉴 밀도 변동, `8번 → 7번 Relative Compass` 오표시, start 6초/response 2초가 6초/6초로 전달되는 오류를 재현했다. 수정 후 세 모드의 메뉴 밀도 고정, 8번 Shape Completion, 6초/2초 전달을 확인했다.
- 동작 부록은 수정 전 39px, 외부 잠금 반환 중 modal 배경 잠금 해제 및 닫힌 뒤 hidden 잔류를 재현했다. 수정 후 44px, modal 유지 중 hidden, 최종 html clip/body scroll 복원을 두 viewport에서 확인했다.

증거: [단위 Red](.spomove-final/red-unit/results.json), [player Red](.spomove-final/player-browser-red.json), [player Green](.spomove-final/player-browser-green.json), [UI Red](.spomove-final/ui-browser-red.json), [UI Green](.spomove-final/ui-browser-green.json), [부록 전후](.spomove-final/appendix-browser.json).

## 5. 최종 품질 게이트와 교차 영향

| 검사 | 현재 실행 결과 |
| --- | --- |
| 전체 TypeScript | PASS |
| 변경 관련 파일 ESLint 47개 | 오류 0 / 경고 0 |
| 전체 Vitest | **3,212 PASS / 2 SKIP / 0 FAIL** |
| Gate C 기준선 비교 | 3,184 → 3,212, 신규 28개. 기존 테스트 제거·상태 변경 0개 |
| 원래 Stage 2 F18 테스트 | 기존 4개 PASS, 15·20·30 실패 기대값 보존 |
| Next Production Build | PASS, 현재 소스 독립 복사본·외부 네트워크 차단 |
| guide source digest 검사 | PASS |
| F18 실제 엔진 | 10/15/20/30 × 1/2패널, 8개 PASS. 라운드와 학생 반응 수 구분 |
| F19 결정적 회귀 | 기존 48 필수 조합을 포함한 57개 테스트 PASS |
| F19 브라우저 | 5개 완료 조합(실제 시간 1개 포함) + 2개 STOP·재실행 수명주기 PASS |
| 실제 Next Admin | 390/1440 정상·STOP·결과·재실행·복귀 PASS |
| 실제 Next Teacher | 390/1440 연속 재실행 10회·STOP·목록 복귀 PASS |
| 실제 Next MASTER/LAB | 390/1440 STOP·재실행·실행 중 SPA 이탈·브라우저 뒤로 가기 PASS |
| 실제 Next 이미지 복구 | 390/1440 빈 팩 → 안전한 복귀 → 재진입·재시도 → 15회 자연 완료 → 목록 복귀 PASS |
| 매트 이미지 | 실제 Next optimizer PNG 2개 200, 기존 이미지와 SHA-256 동일 |

[최종 실행 집계](.spomove-final/final-summary.json), [전체 테스트 원본](.spomove-final/verification-final/tests-results.json), [기존 테스트 비교](.spomove-final/test-comparison.json), [TypeScript](.spomove-final/verification-final/typescript.log), [ESLint](.spomove-final/verification-final/eslint-results.json), [Build](.spomove-final/verification-final/build.log), [F18 브라우저](.spomove-final/b1-browser.json), [F19 브라우저](.spomove-final/b2-browser.json), [F19 수명주기](.spomove-final/b2-lifecycle.json), [Next 화면 전환](.spomove-final/next-browser.json), [Next Admin](.spomove-final/next-admin.json), [Next 뒤로 가기](.spomove-final/next-back.json).

## 6. 공식 100개·Teacher 33개와 과거 미관측 경로

현재 소스에서 **공식 100개, Teacher 33개의 자연 완료 결과 경로를 관측**했다. 이는 모든 제품 동작이나 실제 학생 수행의 100% 정상 PASS율이 아니다. UI data/access fixture와 로컬 React 실제 엔진을 사용한 경로 관측이다. 실제 Next 검증은 위 대표 조합과 별도로 구분했다.

coarse 가상 시계는 frame delta가 제한된 물리 엔진에서 프레임을 생략하고, 이미지 timeout을 실제 네트워크 응답보다 먼저 발생시킬 수 있었다. coarse 결과를 버리거나 PASS로 바꾸지 않고 보존했다. 미완료 항목은 프레임을 생략하지 않는 시계 및 이미지 준비 대기를 사용해 독립 재실행했다. 훈련 시간·목표 횟수를 늘리거나 줄여 해결하지 않았다.

기존 Stage 2의 7개 경로도 새 관측에서 모두 자연 완료를 확인했다:

- `visual-reaction-rush-39`
- `visual-reaction-goalkeeper-easy-skeleton`
- `visual-reaction-goalkeeper-42`
- `visual-reaction-number-cart-l2`
- `dive-standard`
- `dive-color-gate-61`
- `dive-random`

[경로별 최종 관측·근거 파일](.spomove-final/coverage-final.json), [공식 coarse 원본](.spomove-final/official-coverage.json), [공식 frame 시계 원본](.spomove-final/official-fine-coverage.json), [추가 재현](.spomove-final/official-fine-extra-coverage.json), [Teacher 원본](.spomove-final/teacher-coverage.json), [Teacher 재현](.spomove-final/teacher-fine-extra-coverage.json).

## 7. 남은 증거 제한과 회귀 위험

- **확인된 로컬 제품 결함은 남겨 두지 않았다.** 다만 Stage 1 원본 폴더 누락과 Stage 2 manifest 불일치 77개는 여전히 과거 증거의 검증 보류 상태다. 63개는 CRLF 변환으로 설명되고, 14개는 원인 미확정이다. 기존 manifest와 증거를 새 정본으로 덮어쓰지 않았다. 경로·기존 해시·당시/현재 해시·원인은 [불일치 목록](.spomove-final/historical-evidence-mismatches.json)에 보존했다. 현재 수정 근거는 신규 독립 재현이다.
- 기존 Gate B·C 증거의 해시 변경은 0개다. [보존 결과](.spomove-final/prior-gate-preservation.json).
- 실제 Next 화면은 Chrome 390/1440에서 확인했다. 실제 iOS/Safari 기기, 스피커를 통한 청각 품질, 운영 데이터·실계정 로그인 세션을 이용한 배포 후 E2E는 수행하지 않았다. TTS는 실제 전달 문자열을 캡처해 검증했다.
- 외부 폰트 요청을 의도적으로 차단한 fixture의 `ERR_FAILED`, 비기관 fixture의 institution 403은 console에 기록됐다. 따라서 “전체 console 오류 0”이라고 보고하지 않는다. 제품 JS `pageerror`는 최종 성공 검사에서 0건이며, 매트 이미지 400은 실제 200으로 해결했다.
- 준비 timeout은 실제 느린 네트워크에서 복구 화면을 표시할 수 있다. 재시도는 가능하며 부족한 이미지를 색상으로 몰래 대체하지 않는다. pause clock 변경은 공유 player에 적용되므로 기존 전체 테스트·실제 엔진 및 세 서비스 교차 검증을 수행했다.
- 첫 검증의 theme 타입 오류, 검증 명령 길이 초과, 잘못된 테스트 selector/clock driver 등 검증 도구 자체의 실패도 원본으로 보존했다. 최종 PASS 원본은 `verification-final/`, 실제 Next 복구 성공 원본은 `next-recovery.json`이다.

최종 판정: **GATE_C1_PASS / GATE_C2_PASS / GATE_D_LOCAL_COMPLETE / REMAINING_LOCAL_FIXES_COMPLETE**. 변경은 로컬 미커밋 상태다. 운영 배포는 수행하지 않았다.
