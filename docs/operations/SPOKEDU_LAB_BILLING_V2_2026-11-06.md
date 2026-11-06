# SPOKEDU LAB — SDK v2 결제 통합 구현·검증 보고서

작성일: 2026-11-06 (Asia/Seoul). 이 문서는 해당 작업의 검증 기록이며 새로운 제품·가격·권한 SSOT가 아니다.

구현 검수 시점의 운영은 사용자가 키 수정으로 정상화한 v1이다. 이후 사용자가 main 커밋·푸시·CI 검수와 연결된 운영 자동 배포를 승인했다. 운영 환경변수 수정, 운영 DB 마이그레이션, 카드 청구는 수행하지 않았다. 실제 토스 테스트 환경이 없으므로 사용자가 로컬에서 직접 카드 흐름을 확인하기로 했다. Git 게시 및 원격 CI 결과는 해당 커밋과 GitHub Actions에서 확인한다.

## A. 원인과 운영 관찰 근거

- 기존 소스는 SDK v1의 `window.TossPayments(key).requestBillingAuth('카드', ...)`를 호출했다. 클라이언트 키 검사는 `live_` 접두사만 허용해 위젯 키인 `live_gck_`도 통과했다. 오류 지점은 서버 승인 이전의 빌링 카드 인증창 요청 단계다.
- 기존 Production 키가 `live_gck_`였다는 사실과 이후 두 키 수정으로 v1이 동작한다는 사실은 사용자 제공 정보다. 직접 토스 관리자 콘솔이나 Vercel 환경변수 원문을 확인한 결과로 바꾸어 서술하지 않는다. SDK 버전 변경만으로 잘못된 MID/키 쌍이 해결되는 것은 아니다.
- 공식 [빌링 v2 가이드](https://docs.tosspayments.com/guides/v2/billing/integration)는 빌링 계약 MID에서 발급된 개별 연동 키 쌍을 요구한다. 서버 [API 레퍼런스](https://docs.tosspayments.com/reference)의 상점 필드는 `mId`이며 응답 검증에 그대로 사용했다.
- 공개 운영 로그인 페이지 HTTP 200, 공개 JS 21개를 읽었다. 공개 Supabase 프로젝트 mwgvserdyflsqyhcqecp는 로컬 읽기 전용 조회 대상과 일치했다. 공개 로그인 JS만으로 보호된 결제 페이지 번들에 포함된 키 종류나 서버 시크릿, Vercel 적용 범위를 검증할 수는 없다.
- 읽기 전용 조회 시 구독 테이블 6행, 결제 주문 2행이었다. 그중 Vault 결제 수단이 연결된 유료 모델 구독 2개는 라이트이며 기준일 6일, 다음 결제일 2026-12-06으로 저장돼 있다. 초기 ‘0건’ 가정으로 데이터를 초기화하지 않았다.
- 사용자가 로컬에 운영 키를 저장한 뒤 기존 주문을 토스 GET /v1/payments/orders/{orderId}로 읽기 전용 대조했다. 2건 모두 bill_spoke95n2 / 9,900원 / DONE이고 DB 주문·결제 키와 일치했다. 기존 승인 응답 버전은 2024-06-01이다. 이것은 기존 v1 결제의 실제 PG 승인 재조회이며, 에이전트가 새로 청구한 결과나 v2 신규 E2E가 아니다. 키·결제 식별자 원문은 증거 파일에 저장하지 않았다.
- 전역 provider 상태는 `configured`였다. 실제 cron 등록/활성 여부와 Vault에 설정된 호출 URL·CRON_SECRET은 관리 접근 없이 확인하지 않았다. 할 일이 없으면 cron 실행 기록을 만들지 않는 비용 제어가 있으므로 기록이 드물다는 이유로 중단됐다고 단정하지 않는다.

## B. 구현 내용과 유지 범위

- 공식 SDK 패키지 `@tosspayments/tosspayments-sdk@2.10.0`을 고정 설치했다. v1 전역 타입·스크립트 직접 주입을 제거했고 브라우저 effect에서만 v2 SDK를 로드한다.
- Lite/Premium 공통으로 `payment({ customerKey }).requestBillingAuth({ method: 'CARD', successUrl, failUrl })`을 await한다. 동기 ref 잠금과 버튼 비활성화로 중복 호출을 막고, 취소·네트워크·로드 오류와 재시도를 처리한다. 로그인 사용자의 기존 UUID 기반 customerKey 매핑을 유지했다.
- 신규 `POST /api/spokedu-master/payment/billing/prepare`는 로그인, 실제 Host/Origin, 키 유형·테스트/라이브 혼합, 배포 번들과 서버 키 일치, MID/키 쌍 확인 설정을 검사한다. 선택 요금제·사용자·customerKey를 HMAC 서명한 30분 HttpOnly/SameSite=Lax 쿠키로 콜백에 묶는다.
- 신규 카드 등록의 추가 확인 설정 누락이 기존 유료 구독 갱신·웹훅 복구까지 중단시키지 않도록 공용 서버 키 형식 검사와 신규 checkout 확인 검사를 분리했다. 키 쌍 고정 해시는 운영자가 동일 MID 키 쌍을 확인했다는 기록이며 계약 유효성을 독립적으로 증명하지 않는다.
- 서버의 `POST /v1/billing/authorizations/issue`와 `POST /v1/billing/{billingKey}`는 유지했다. 빌링 응답의 customerKey/mId, 승인 응답의 주문번호·서버 금액·DONE 상태·mId·승인 시각을 검사한다. Vault 보관과 결제 적용 RPC를 재사용한다.
- 기존 v1 미완료 주문은 기존 주문·주기로 조회·복구한다. 신규 최초/재구독 주기는 사용자·이전 유료 기간을 기준으로 양 요금제에 공통 적용해 교차 요금제 동시 요청을 제어한다. 불명확한 승인 결과는 새로 청구하지 않는다. 확정 거절 후 재시도만 새 주문으로 분리한다.
- 승인 후 DB 반영 실패 시 원래 paymentKey·승인 시각·주문 금액으로 재적용한다. 시간이 지나 일할 견적이 달라져도 이미 승인된 업그레이드 금액을 덮어쓰지 않는다. 최초 결제 API 실행 시간은 승인 대기와 저장에 맞춰 120초로 명시했다.
- 성공 화면은 실제 유료 구독과 유효 기간을 함께 확인한다. 프로모션만으로 ‘결제 완료’를 표시하지 않는다. 유료 Lite에 Premium 선물이 겹쳐도 Lite 결제 성공 확인이 가능하다. 새로고침은 권한·구독 조회만 하며 청구를 다시 요청하지 않는다.
- 한국 시간 월말 계산과 28/29/30/31일을 검증했다. 프리미엄 갱신 ID가 65자로 토스 최대 64자를 초과하던 결함을 수정했다. 길이를 초과할 때만 UUID 구분자를 압축하므로 기존 라이트와 이미 짧은 주문 ID는 유지한다.
- 가격·요금제 접근 권한·해지 후 잔여 기간·업그레이드 일할 정책·다운그레이드 정책·SPOMOVE 코드는 변경하지 않았다. 결제 창 외형을 새로 디자인하지 않았다. subscription API에는 유료 결제 모델 확인용 `hasPaidBillingSubscription` 필드만 추가했다.

변경 전:

```tsx
window.TossPayments(clientKey).requestBillingAuth('카드', { customerKey, successUrl, failUrl });
```

변경 후 핵심:

```tsx
const tossPayments = await loadTossPayments(clientKey);
const payment = tossPayments.payment({ customerKey });
await payment.requestBillingAuth({ method: 'CARD', successUrl, failUrl });
```

### DB 함수 수정안 — 운영 미적용

신규 마이그레이션: [20261106150000_reset_billing_anchor_on_verified_resubscription.sql](../../supabase/migrations/20261106150000_reset_billing_anchor_on_verified_resubscription.sql).

이유: 기존 트리거는 과거 결제 이력이 있으면 재구독에도 예전 기준일을 유지한다. 만료 후 다른 날짜에 다시 결제하면 새 이용 종료일과 이후 갱신 기준일이 달라질 수 있다. 새로 승인된 initial 주문, 같은 소유자, 다른 주문/승인 키, 이전 이용 종료 이후라는 증거가 있는 재구독에서만 기준일을 새 한국 날짜로 잡는다. 최초 결제는 기존 동작을 유지하고 갱신·업그레이드·재실행은 기준일을 유지한다.

테이블·컬럼 추가, 기존 행 보정, 삭제, 초기화는 없다. 실제 서비스 적용은 별도 승인 후 수행해야 한다. 롤백은 기존 20261024113000 마이그레이션의 함수 정의를 복원한다. [검증한 롤백 SQL](../../.tmp/billing-v2/resumed/anchor-rollback.sql)은 기존 결제 데이터를 되돌리거나 삭제하지 않는다.

### 변경 파일 전체

- [.env.example](../../.env.example)
- [app/api/spokedu-master/payment/billing/billingIdempotency.contract.test.ts](../../app/api/spokedu-master/payment/billing/billingIdempotency.contract.test.ts)
- [app/api/spokedu-master/payment/billing/billingRoutes.contract.test.ts](../../app/api/spokedu-master/payment/billing/billingRoutes.contract.test.ts)
- [app/api/spokedu-master/payment/billing/issue/route.test.ts](../../app/api/spokedu-master/payment/billing/issue/route.test.ts)
- [app/api/spokedu-master/payment/billing/issue/route.ts](../../app/api/spokedu-master/payment/billing/issue/route.ts)
- [app/api/spokedu-master/payment/billing/prepare/route.test.ts](../../app/api/spokedu-master/payment/billing/prepare/route.test.ts)
- [app/api/spokedu-master/payment/billing/prepare/route.ts](../../app/api/spokedu-master/payment/billing/prepare/route.ts)
- [app/api/spokedu-master/payment/webhook/route.test.ts](../../app/api/spokedu-master/payment/webhook/route.test.ts)
- [app/api/spokedu-master/subscription/route.ts](../../app/api/spokedu-master/subscription/route.ts)
- [app/lib/server/spokeduMasterBillingConfiguration.test.ts](../../app/lib/server/spokeduMasterBillingConfiguration.test.ts)
- [app/lib/server/spokeduMasterBillingConfiguration.ts](../../app/lib/server/spokeduMasterBillingConfiguration.ts)
- [app/lib/server/spokeduMasterBillingIntent.test.ts](../../app/lib/server/spokeduMasterBillingIntent.test.ts)
- [app/lib/server/spokeduMasterBillingIntent.ts](../../app/lib/server/spokeduMasterBillingIntent.ts)
- [app/lib/server/spokeduMasterBillingMode.ts](../../app/lib/server/spokeduMasterBillingMode.ts)
- [app/lib/server/spokeduMasterBillingOrders.ts](../../app/lib/server/spokeduMasterBillingOrders.ts)
- [app/lib/server/spokeduMasterBillingProvider.test.ts](../../app/lib/server/spokeduMasterBillingProvider.test.ts)
- [app/lib/server/spokeduMasterBillingProvider.ts](../../app/lib/server/spokeduMasterBillingProvider.ts)
- [app/lib/server/spokeduMasterPayment.test.ts](../../app/lib/server/spokeduMasterPayment.test.ts)
- [app/lib/server/spokeduMasterPayment.ts](../../app/lib/server/spokeduMasterPayment.ts)
- [app/lib/server/spokeduMasterPaymentApply.test.ts](../../app/lib/server/spokeduMasterPaymentApply.test.ts)
- [app/lib/server/spokeduMasterPaymentApply.ts](../../app/lib/server/spokeduMasterPaymentApply.ts)
- [app/spokedu-master/commercialTierGate.contract.test.ts](../../app/spokedu-master/commercialTierGate.contract.test.ts)
- [app/spokedu-master/payment/billingUi.contract.test.ts](../../app/spokedu-master/payment/billingUi.contract.test.ts)
- [app/spokedu-master/payment/cancel/page.tsx](../../app/spokedu-master/payment/cancel/page.tsx)
- [app/spokedu-master/payment/page.tsx](../../app/spokedu-master/payment/page.tsx)
- [app/spokedu-master/payment/paymentActivation.test.ts](../../app/spokedu-master/payment/paymentActivation.test.ts)
- [app/spokedu-master/payment/paymentActivation.ts](../../app/spokedu-master/payment/paymentActivation.ts)
- [app/spokedu-master/payment/sdkV2.runtime.test.ts](../../app/spokedu-master/payment/sdkV2.runtime.test.ts)
- [app/spokedu-master/payment/success/page.tsx](../../app/spokedu-master/payment/success/page.tsx)
- [app/spokedu-master/payment/tossClientKey.test.ts](../../app/spokedu-master/payment/tossClientKey.test.ts)
- [app/spokedu-master/payment/tossClientKey.ts](../../app/spokedu-master/payment/tossClientKey.ts)
- [next.config.ts](../../next.config.ts)
- [package-lock.json](../../package-lock.json)
- [package.json](../../package.json)
- [scripts/spokedu-master-billing-anchor-qa.mjs](../../scripts/spokedu-master-billing-anchor-qa.mjs)
- [scripts/spokedu-master-local-billing-check.mjs](../../scripts/spokedu-master-local-billing-check.mjs)
- [supabase/migrations/20261106150000_reset_billing_anchor_on_verified_resubscription.sql](../../supabase/migrations/20261106150000_reset_billing_anchor_on_verified_resubscription.sql)
- [이 보고서](./SPOKEDU_LAB_BILLING_V2_2026-11-06.md)

## C. 검증 결과와 증거

| 검증 | 결과 | 범위/증거 |
|---|---|---|
| 전체 Vitest | 3275 passed / 0 failed / 5 skipped (total 3280) | [JSON](../../.tmp/billing-v2/resumed/full-regression-release.json) |
| 결제·구독·웹훅·갱신·권한 관련 | 208 passed / 0 failed / 0 skipped (total 208) | [JSON](../../.tmp/billing-v2/resumed/final-payment.json) |
| 주문번호 경계 결함 수정 후 관련 재검증 | 136 passed / 0 failed / 0 skipped (total 136) | [JSON](../../.tmp/billing-v2/resumed/final-order-boundary.json) |
| 변경 JS/TS ESLint | exit 0, 기존 전체 결과의 변경 파일 오류 0개 | [로그](../../.tmp/billing-v2/resumed/lint-final-changed.log) |
| 추적 소스 전체 ESLint | 84 errors / 32 warnings | 오류는 기존 감사 스크립트 .spomove-audit-stage2, .spomove-gate-a, .spomove-gate-a-followup에만 있음. [JSON](../../.tmp/billing-v2/resumed/lint-source.json) |
| 기본 Production Build (Turbopack + TypeScript + 정적 생성) | exit 0 | [로그](../../.tmp/billing-v2/resumed/precommit-build.log), [결과](../../.tmp/billing-v2/resumed/build-result.json) |
| 재구독 기준일 PostgreSQL/PLpgSQL | 16 passed / 0 failed | 외부 DB 연결 없는 PGlite 메모리 DB. 기존 결함 재현, 새 함수, 소유자·승인 키 차단, 월말, 기존 행 보존, 롤백. [JSON](../../.tmp/billing-v2/resumed/anchor-postgres-results.json) |
| 실제 브라우저의 로컬 모의 흐름 | 24 passed / 0 failed | Windows Chrome 8건, Android 크기 Chromium 8건, iPhone 크기 WebKit 8건. 인증·PG·상품 API 모의이며 실제 기기/실제 토스 결과가 아님. [JSON](../../.tmp/billing-v2/resumed/browser-fixture-results.json) |
| 실제 토스 테스트 결제/실기기 E2E | NOT_RUN | 테스트 키·정상 QA 환경 없음. 사용자가 로컬 직접 확인 예정 |
| 라이브 청구 및 토스 콘솔 승인 대조 | NOT_RUN | 에이전트가 실결제를 수행하지 않음 |
| 기존 v1 승인 토스 API 재조회 | 2건 확인 | 조회 GET만 사용, 청구·취소 0건. [안전한 요약](../../.tmp/billing-v2/resumed/provider-readback.json) |

빌드는 기존 감사용 복사본/생성물 간섭을 피하기 위해 Git 추적 소스와 현재 미커밋 변경을 그대로 복사한 격리 경로에서 수행했다. 앱 의존성 버전은 동일하며 기본 Next build 옵션을 유지했다. 최종 빌드 소스 fingerprint: `810b28c61d3aac3f264a4d754fa95c2908bb291067364697d7178fc160b3c990`. 로컬 증거 경로는 Git에 포함하지 않는다.

전체 린트 오류 파일은 이번 변경 파일과 겹치지 않는다. 기존 오류를 숨기거나 관련 없는 감사 스크립트를 수정하지 않았다. 전체 린트를 PASS라고 표시하지 않는다. 최종 변경 파일 린트는 별도 실행했다.

건너뛴 기존 테스트:

- 환불 통합 테스트 2건: 폐기 가능한 비운영 DB 쓰기 허용 플래그가 필요하다. 현재 운영 DB에 활성화하지 않았다.
- 상담 통합 테스트 3건: 별도 로컬 PostgreSQL·브라우저 QA 환경이 필요하다. 로컬에 토스 키를 저장하는 것과 별개다.

로컬 모의 스크린샷:

- [Chrome 카드 등록 호출 모의창 — 실제 토스 창 아님](../../.tmp/billing-v2/resumed/windows-chrome-lite-mock-card-auth.png)
- [Chrome Lite 완료 화면 — 모의 결제](../../.tmp/billing-v2/resumed/windows-chrome-lite-success-mock.png)
- [WebKit 모바일 Premium 완료 화면 — 모의 결제](../../.tmp/billing-v2/resumed/iphone-webkit-emulation-premium-success-mock.png)
- [Chromium 모바일 인증 실패 화면 — 모의 결제](../../.tmp/billing-v2/resumed/android-chromium-emulation-auth-failure.png)

공식 공개 SDK 스크립트도 읽어서 정상 live/sandbox 빌링 프레임 도메인이 기존 CSP 허용 목록과 일치하는 것을 대조했다. 실제 MID에서 열리는 토스 창의 CSP 동작을 PASS로 대체하지 않는다.

## D. 운영 준비와 로컬 직접 확인

- 서버 운영 키가 bill_spoke95n2의 기존 승인 2건을 조회할 수 있는 것과 해당 응답의 API 버전 2024-06-01은 직접 확인했다. 현재 계약 조건·전체 카드사 승인 상태·클라이언트 키와 같은 MID인지에 대한 콘솔 대조는 별도 미확인이다. 삼성카드 실결제 검증은 수행하지 않았다.
- Vercel 프로젝트 spokedu의 Production/Preview/Development 변수 범위와 현재 클라이언트 결제 번들 내 키는 직접 확인하지 못했다. 로컬 .vercel 연결은 1-xg28이므로 이를 spokedu로 간주해 CLI 변경/배포하지 않았다.
- 현재 운영 v1에 있는 두 키를 바꾼 것과 이번 로컬 v2 코드 배포는 별개다. 추가 checkout 설정 TOSS_BILLING_MID, TOSS_BILLING_KEY_PAIR_SHA256가 준비되지 않은 상태로 v2를 배포하면 새 카드 등록을 의도적으로 차단한다. 기존 갱신·웹훅은 이 새 확인 설정을 필수로 요구하지 않는다.
- NEXT_PUBLIC_TOSS_CLIENT_KEY는 빌드 때 번들에 고정된다. 환경변수 수정 후 재배포가 필요하다. NEXT_PUBLIC_VERCEL_ENV는 next.config에서 배포 정체성만 전달하며 로그인 심사 플래그로 production 판정을 우회하지 않는다.
- 운영 CRON_SECRET, 실제 pg_cron job 활성, Vault 갱신 URL, Vercel 함수 실행 시간은 배포 승인 전에 관리 경로에서 대조해야 한다. 갱신 API를 수동 호출해 실제 청구를 발생시키는 검증은 하지 않았다.
- 게시 범위는 기준 커밋 `c6faebf66c175471a843489c9cad1482dbe6cc2c` 위의 결제 변경이다. 병행 중인 재고 관리 변경 4개와 `.env.local`, `.tmp`는 제외한다. 브랜치 생성·PR은 요청되지 않았다.
- Production 빌드는 같은 서버 설정 검사를 수행한다. `VERCEL_ENV=production`에서 MID·키 쌍 확인 설정이 없거나 키가 잘못되면 빌드를 실패시켜 현재 서비스 중인 배포를 유지한다. 오프라인 CI·개발은 운영 키를 요구하지 않는다. Vercel 관리자 인증이 없어 운영 변수 직접 등록은 하지 않았다.
- MASTER core CI에 신규 설정·서명·provider·prepare·SDK 런타임·결제 활성화·배포 차단 테스트를 포함했다. 최종 로컬 core는 53개 파일, 484건 통과했다. 전체 3,275건 통과 결과 이후 배포 차단 테스트 5건이 추가됐다.
- 애플리케이션 롤백은 현재 정상인 v1 배포로 되돌리고 그 배포와 맞는 키 설정을 유지하는 방식이다. SQL 롤백은 앞의 함수 복원으로 분리한다. 새 결제나 이용권 행을 삭제하지 않는다.
- v1에서 이미 열어 둔 카드 인증창에는 새 서명 쿠키가 없을 수 있다. 전환 시 이런 콜백은 자동 청구 대신 재시작 안내로 차단된다. 진행 중인 인증 흐름을 고려한 전환 시점 확인이 필요하다.
- 사용자가 저장한 로컬 live_ck_/live_sk_의 유형·환경 일치를 확인했고 로컬 MID/키 쌍 고정 메타데이터를 기록했다. 이 로컬 기록은 Vercel 설정 변경이 아니다. 로컬 앱도 운영과 같은 Supabase를 사용하므로 라이브 인증 완료 시 실제 청구와 운영 구독 저장이 일어난다.

### 사용자가 로컬에서 직접 진행하는 순서

1. 저장소 루트 .env.local의 기존 내용은 유지하고 같은 bill_spoke95n2 MID에서 발급된 클라이언트/시크릿 키를 등록한다. 실제 값은 채팅·문서·커밋에 남기지 않는다. Vercel 변수는 로컬로 자동 동기화되지 않는다.
2. 해당 MID에서 확인한 키 쌍임을 전제로 `node scripts/spokedu-master-local-billing-check.mjs --verified-mid bill_spoke95n2`를 실행하면 키를 출력하지 않고 로컬 MID/키 쌍 확인 메타데이터를 기록한다. 이 명령은 PG/DB/Vercel 요청을 보내지 않는다.
3. `npm run dev:local`로 서버를 재시작하고 http://127.0.0.1:3000/spokedu-lab/payment?plan=lite 를 연다. 기존 Lite/Premium이 없는 일반 등록 계정으로 신규 구독을 확인한다. 관리자나 이미 활성 구독인 계정은 구매 제한이 정상 동작할 수 있다.
4. 카드 등록창이 열리면 호출 단계만 통과한 것이다. 취소했을 때 구독이 활성화되지 않는지 먼저 확인한다.
5. 사용자가 승인한 계정·카드로 인증을 끝까지 진행하면 첫 결제가 발생한다. 라이브 키는 실제 청구이며 코드가 ‘테스트’로 바꾸지 않는다. 삼성카드는 계약 승인 확인 전 검증 대상에서 제외한다.
6. 첫 승인 → 완료 화면 → 구독 관리의 Lite 활성 → 원래 주문·결제 이력 → 다음 결제일을 확인한다. 토스 콘솔과 DB 결과를 대조한다. 완료 후 새로고침/재접속으로 이중 청구가 생기지 않아야 한다.
7. 계정/시각/단계/오류 코드만 공유한다. authKey, billingKey, 시크릿 키나 카드 정보는 보내지 않는다. 승인 결과가 불명확하면 버튼을 반복해서 누르지 않는다.

## E. 최종 판정

| 상태 | 판정 |
|---|---|
| LOCAL_IMPLEMENTATION_COMPLETE | YES — 로컬 코드/빌드/테스트 범위, 실제 결제 검증과 운영 적용 제외 |
| TEST_BILLING_E2E_PASS | NO — 실제 토스 테스트 키/QA 환경 없음; 로컬 모의 24건으로 대체 판정하지 않음 |
| PRODUCTION_CONFIGURATION_READY | NO — MID·키 쌍·변수 범위·cron 관리 설정 대조 미완료 |
| PRODUCTION_APPROVAL_PENDING | NO — main 푸시 및 연결된 운영 자동 배포 승인됨. 환경변수·DB 직접 변경 승인은 별도 |
| PRODUCTION_DEPLOYED | NO — 이번 v2 수정본 기준 |
| LIVE_BILLING_VERIFIED | NO — 토스 승인 콘솔·카드 청구 검증 미수행 |
