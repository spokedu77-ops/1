# SPOKEDU MASTER 결제 운영 변경 절차

이 문서는 운영자가 승인한 이후에만 실행할 절차다. Phase 2A 배포나 읽기 전용 QA 과정에서는 아래 SQL과 금전 변경 작업을 실행하지 않는다.

## 정기결제 상태 계약

| 상태 | 코드·DB 근거 |
|---|---|
| 갱신 대상 없음 | `billing/renew`의 due 조회 결과가 0건이며 run이 `succeeded`, `attempted=0` |
| 제공자 설정 없음 | `isSpokeduMasterBillingProviderConfigured()` 실패, run `failed`, `error_code='billing_provider_not_configured'` |
| 고객 빌링 정보 없음 | due 구독의 `provider_customer_key` 또는 `provider_billing_key_secret_id` 없음, `last_billing_error='renewal_configuration_missing'` |
| 갱신 결제 요청 실패 | 주문 `failed` 또는 `recoverable_failed`, `last_error_code='renewal_payment_failed'` 또는 `renewal_payment_exception` |
| 승인 후 권한 반영 실패 | 주문에 결제 승인 근거가 있고 `applied_at`이 없거나 `status='recoverable_failed'` |
| 정기 실행 자체 실패 | billing run `failed`; `unauthorized`, `renewal_lookup_failed`, `cron_http_transport_failed`, `cron_http_status_failed`, `renewal_internal_exception` 등 |

현재 라우트는 인증 검사 후 결제 제공자 설정을 검사하고, 그 다음 due 구독을 조회한다. 따라서 대상이 0건이어도 라이브 제공자 설정이 유효하지 않으면 성공으로 처리되지 않는다.

## pg_cron 일시 중지 제안

작업 식별자: `spokedu-master-billing-renew-hourly`

승인 전 확인:

```sql
select jobid, jobname, schedule, command, active
from cron.job
where jobname = 'spokedu-master-billing-renew-hourly';
```

승인 후 일시 중지:

```sql
update cron.job
set active = false
where jobname = 'spokedu-master-billing-renew-hourly';
```

중지 확인:

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'spokedu-master-billing-renew-hourly';
```

중지 후 한 시간 이상 새 `spokedu_master_billing_runs`가 생성되지 않는지 확인한다. `cron.job_run_details`에서도 해당 jobid의 신규 실행이 없는지 확인한다.

재개 조건:

1. Production `TOSS_SECRET_KEY`가 라이브 모드이며 런타임에서 provider configured 판정을 통과한다.
2. `CRON_SECRET`과 Vault의 cron secret이 일치한다. 값은 로그나 조회 결과로 출력하지 않는다.
3. Vault에 갱신 URL과 cron secret 항목이 존재하고 호출 URL이 현재 Production renew endpoint다.
4. 실제 유료 구독만 due 대상이며 `manual_qa`가 제외됨을 staging에서 확인한다.
5. Toss sandbox에서 승인, DB 반영, 중복 호출, 실패 재시도 E2E가 통과한다.
6. 사고 알림 담당자와 대응 절차가 지정된다.

승인 후 재개:

```sql
update cron.job
set active = true
where jobname = 'spokedu-master-billing-renew-hourly';
```

재개 직후 다음 한 회차의 run 상태, attempted/succeeded/failed/skipped 수치와 관련 주문을 확인한다. 문제가 있으면 같은 `active=false` 절차로 다시 중지한다.

## Phase 2B 승인 정책

| 작업 | 요청 권한 | 최종 승인 | 추가 확인과 안전성 |
|---|---|---|---|
| 전액·부분 환불 | 결제 운영자 | 재무 책임자 또는 지정 최고 관리자 | 주문 소유자·승인 금액·기환불액 확인, Toss 결과 재조회, idempotency key, 부분 취소 후 권한 정책 필요 |
| 결제 재시도 | 고객지원 요청, 결제 운영자 실행 | 지정 최고 관리자 | due 구독·빌링 키 존재 확인, billing cycle 단위 멱등성, 이미 승인된 주문 재조회 |
| 구독 수동 활성화 | 고객지원 요청 | 결제 운영 및 보안 관리자 이중 승인 | 실제 승인 주문 없이는 금지, 승인 주문과 사용자·금액·플랜 일치 필요 |
| 결제 상태 수정 | 원칙적으로 직접 수정 금지 | 장애 복구 회의 승인 | PG 조회 결과를 근거로 전용 복구 트랜잭션만 허용 |
| 강제 해지 | 고객지원 요청 | 결제 운영자 | 현재 기간 종료와 즉시 종료를 분리하고 사용자 고지·환불 관계 확인 |
| 결제 금액 변경 | 직접 변경 금지 | Product Decision 및 재무 승인 | 가격 SSOT와 새 주문으로 처리하고 과거 주문 금액은 보존 |

모든 금전 작업은 작업자, 승인자, 대상 사용자와 `order_id`, 사유, 요청·처리 시각, 처리 전후 상태, PG 결과, 멱등성 키를 같은 트랜잭션 경계의 감사 기록으로 남겨야 한다. PG 성공 후 DB 반영 실패는 재실행 시 재결제하지 않고 기존 주문을 조회해 반영만 복구해야 한다.
