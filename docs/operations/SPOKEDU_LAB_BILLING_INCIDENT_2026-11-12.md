# 결제 P0 원인·복구 기록 — 2026-11-12

상태: 운영 서버의 토스 IP 접근 정책 거절을 재현했고 한국 리전에서 정상 조회를 확인했다. 수정 배포 `dpl_2JLMCdnLLdQLjsbXS9c5Hp8zEbRd`를 운영으로 승격했다. 실제 신규 카드 청구 E2E는 수행하지 않았다.

## 확정한 운영 문제

기존 결제 함수는 미국 `iad1`에서 실행됐다. 같은 프로젝트의 운영 환경변수를 사용하는 비공개·기한 제한 진단 배포에서 토스의 주문 GET 조회를 실행했다. 미국에서는 사고 주문과 기존 정상 주문 모두 HTTP 403 `API_KEY_ACCESS_DENIED`였고, 한국 `icn1`에서는 각각 HTTP 404 `NOT_FOUND_PAYMENT`, HTTP 200 `DONE`이었다. 두 진단 배포 모두 운영 키 쌍의 고정 해시 검증을 통과했다. 키·토스 정책·DB 변경 없이 실행 리전만 달리한 비교다.

토스의 [에러 코드](https://docs.tosspayments.com/reference/error-codes)와 [API 키 접근 정책](https://docs.tosspayments.com/reference/using-api/api-key-access-policy)은 이 코드를 허용되지 않은 호출 서버 IP에 대한 거절로 정의한다. 실제 토스 콘솔의 허용 국가/IP 목록을 직접 열람한 것은 아니므로 정책이 국가형인지 개별 IP형인지는 별도로 단정하지 않는다.

따라서 카드 UI가 열린 뒤 서버가 미국에서 토스에 접근하며 차단되는 운영 결함을 확인했다. 당시 개별 요청의 원문 예외는 로그 보존 기간이 지나 남아 있지 않지만, 동일 운영 키·리전·호출 경로의 장애를 재현했다.

## 확인된 증거

- 사용자 제보: 한국시간 12~13시, 화면에 `issue / billing_issue_failed`.
- 운영 DB `mwgvserdyflsqyhcqecp`에서 이 시간대와 일치하는 실패 주문 1건을 확인했다. 계정 이메일은 제공되지 않았으므로 제보자 계정과의 직접 대조는 미완료다.
- 해당 Lite 주문은 11월 11일 22:16:01 KST 생성됐으며 마지막 갱신은 11월 12일 12:52:59 KST다. 마지막 갱신 시각이 모든 시도 이력을 나타내지는 않는다.
- 상태는 `recoverable_failed`, 오류는 `payment_recovery_lookup_failed`, 청구 상태는 `unattempted`다. `charge_requested_at`, `payment_key`, `applied_at`은 모두 NULL이다. 연결된 구독·활성/보류 빌링 키와 해당 주문 웹훅 기록도 없다.
- 조사 시점의 토스 `GET /v1/payments/orders/{orderId}`는 해당 주문에 HTTP 404, `NOT_FOUND_PAYMENT`를 반환했다. 로컬 `.env.local`의 키를 메모리에서만 사용했으며 키·카드·쿠키 원문을 출력하거나 저장하지 않았다.
- 로컬 및 한국 서버에서 기존 정상 주문을 대조한 결과 HTTP 200, `DONE`, MID `bill_spoke95n2`였다. 로컬 조회의 거래 금액은 9,900원이었다. 원문 키·결제 식별자·카드 정보를 증거 문서에 저장하지 않았다.
- 운영 주문은 총 3건: 반영 완료 2건, 위 조회 실패 1건. `request_started`, `outcome_unknown`, `approved_unapplied`, `review_required` 상태의 주문은 조회 시점에 0건이다.

## 코드상 실패 경로

장애 당시 운영 커밋 `32106d1963bce6fe27d5a21411a12e163ad41cea`의 provider 소스를 GitHub에서 직접 대조했다. 주문 claim 이후 토스 기존 승인 조회가 예외를 던지면 `payment_recovery_lookup_failed`를 저장하고 HTTP 502를 반환한다. 기존 응답은 제공자 오류를 버리고 기본값 `billing_issue_failed`, 단계 `issue`를 사용했다.

클라이언트 `app/spokedu-master/payment/success/page.tsx:232`는 HTTP 5xx를 승인 여부 불명 상태로 처리하므로 첨부 화면의 재결제 금지 안내가 표시된다. 따라서 화면 문구만으로 실제 청구가 시도됐다고 해석할 수 없다.

Vercel 요청 기록에서 12:51:50 및 12:52:51 KST 시작 요청 두 건의 HTTP 502와 동일 배포를 확인했다. 카카오톡 iOS 인앱 브라우저 요청이며 WAF는 `allow`였다. 미국 서버에서 재현한 제공자 403은 위 조회 예외 경로로 처리된다.

## 수정

- `vercel.json`: 신규 등록·업그레이드·갱신·사전 확인·웹훅의 payment API들을 `icn1`에 고정했다. 기존 equipment 리전 설정은 유지했다. 토스의 접근 제한을 해제하거나 키를 바꾸지 않았다.
- 카드 인증창 이전의 `/prepare`에서 새 임의 주문 ID를 GET 조회해 실제 서버의 토스 접근을 검사한다. 주문·구독 생성이나 카드 청구를 하지 않는다. 차단되면 서명 intent를 발급하지 않고 실제 오류 코드를 반환한다.
- 관리자 provider health 재확인은 키 형식뿐 아니라 실제 토스 접근까지 검사한다. 접근 거절 상태를 정상으로 표시하지 않는다.
- provider 실패에서 안전한 오류 코드와 HTTP 상태를 보존한다. 최초 결제의 조회 실패 응답과 모니터링에는 제공자 코드·상태·실행 리전을 기록하고 원문 응답·인증 정보는 노출하지 않는다.
- 미확정 승인의 재청구 금지, 원 주문/주기의 멱등성, 기승인 주문의 재적용, 가격·권한·Vault 의미는 유지했다. 접근 정책 거절을 재시도로 감추지 않았다.

## 검증·배포 범위

- 결제 관련 14개 파일의 154개 테스트 통과: 차단 시 카드 등록/청구 미호출, 실제 오류 코드 보존, 사전 확인, 관리자 health, 기승인 복구, 멱등성, 갱신, 웹훅을 포함한다.
- 변경 TypeScript 파일 ESLint 통과.
- 현재 운영 커밋을 별도 체크아웃하고 결제 변경 12개 파일만 적용했다. 이 실제 배포 소스의 Next route typegen과 전체 TypeScript 검사 통과.
- 같은 격리 소스의 Vercel production build 통과 후 도메인 미연결 상태에서 `/login` 200, 결제 페이지 로그인 리다이렉트 307, 비로그인 `/prepare` 401을 확인했다.
- 기존 운영 배포가 바뀌지 않았음을 확인한 뒤 `dpl_2JLMCdnLLdQLjsbXS9c5Hp8zEbRd`를 승격했다. 배포 URL은 `https://spokedu-nov9hlrs4-jihoonchois-projects.vercel.app`이다.
- 사용자가 main 커밋·origin 푸시·원격 CI 검수를 명시적으로 승인했다. 변경 범위는 위 12개 파일과 이 조사 기록·Sprint Brief 두 문서다. 원격 CI의 최종 결과는 게시 커밋의 GitHub Checks를 기준으로 확인한다.
- 로컬 증거: `.tmp/billing-incident-20261112/{probe-result.json,probe-icn-result.json,release-patch-manifest.json,staged-public-smoke.json}`. 인증 세션·키 원문을 증거에 포함하지 않는다.

## 판정과 한계

확인한 주문은 기존 승인 조회 단계에서 차단됐으며 DB와 현재 토스 조회에 승인된 결제 근거가 없다. 해당 주문에서 중복 청구 증거도 발견하지 못했다. 다른 상점·다른 주문·제보자의 전체 카드 명세를 검사한 결과는 아니다.

첫 조사에서 Vercel 접근이 403이었지만 만료된 로컬 인증을 기존 CLI가 정상 갱신한 뒤 프로젝트·배포·요청 기록 접근을 복구했다. 상세 런타임 로그는 요금제의 보존 기간 밖이어서 요청 기록 및 격리 서버 재현으로 조사했다.

기본 관리자 QA 계정은 DB에 존재하지만 `.env.local`에 `SPM_QA_PASSWORD`가 없었다. 기존 고객 QA 자격 증명도 인증되지 않아 로그인 후 실제 `/prepare` 확인 및 관리자 health 재확인은 수행하지 못했다. 인증·역할·비밀번호를 변경하거나 우회하지 않았다. 실제 고객의 새 카드 청구, 취소·환불, 주문 초기화·강제 활성화는 실행하지 않았다.

작업 폴더에는 결제와 무관한 `TimeConfigurationRecordV2.tsx`의 NUL 손상과 `.git/refs/heads/main`의 NUL 손상이 있었다. 원 작업 폴더 전체 타입 검사는 이 기존 손상으로 실패했다. 해당 파일들을 수정하지 않고, 유효한 운영 커밋 객체에서 만든 격리 체크아웃에서 타입·빌드·게시를 진행했다. 이 보고서의 타입 PASS는 실제 배포 소스 범위이며 손상된 원 작업 폴더 전체 PASS를 뜻하지 않는다.

토스의 접근 정책 자체가 이후 변경되면 서버 사전 확인에서 다시 차단될 수 있다. 정상 리전 유지에 대한 회귀 테스트와 실제 접근 사전 확인은 이 문제를 숨기거나 카드 인증 후에야 발견하는 일을 방지한다. 새로운 라이브 결제 완료와 고객 카드 명세까지 검증했다고 주장하지 않는다.
