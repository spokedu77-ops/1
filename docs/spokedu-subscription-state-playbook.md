# 스포키듀 구독 상태 운영 플레이북

이 문서는 결제 자동화가 완성되기 전까지 운영팀이 쓰는 **수동 상태 전환 기준**입니다.

---

## 1. 상태 정의

| 상태 | 의미 | 사용자 노출 기준 |
|------|------|------------------|
| `trialing` | 무료 체험 기간 | 체험 배너 + 종료일 표시 |
| `active` | 유효 구독 | 활성 배지 + 갱신일 표시 |
| `past_due` | 결제 지연/미납 | 결제 지연 배지 + 안내 필요 |
| `canceled` | 해지 처리됨 | 무료 기능만 사용 |
| `expired` | 체험/구독 만료 | 무료 기능만 사용 |

---

## 2. 기본 원칙

- 소스 오브 트루스는 `spokedu_pro_subscriptions`이다.
- 상태 변경은 운영자 승인 후 1인 실행 + 1인 검증으로 진행한다.
- 한 번에 대량 변경하지 않는다. 센터 단위로 수행한다.
- 변경 전/후를 운영 로그(티켓, 노션, 슬랙)에 남긴다.

---

## 3. 상태 전환 규칙 (MVP)

- `trialing -> expired`
  - 조건: `trial_end`가 지났고 유료 전환이 없는 경우
  - 조치: `status='expired'`, `plan='free'`, `max_classes=1`

- `active -> past_due`
  - 조건: 결제 실패/미납 확인
  - 조치: `status='past_due'`, 즉시 해지는 하지 않음

- `past_due -> active`
  - 조건: 미납 해소 확인
  - 조치: `status='active'`, `current_period_end` 재확인

- `active|past_due -> canceled`
  - 조건: 해지 요청 승인
  - 조치: `status='canceled'`, 기간 종료 후 `plan='free'` 전환 예약 또는 즉시 전환 정책 적용

---

## 4. 수동 처리 SQL 템플릿

```sql
-- 1) 대상 센터 구독 확인
select center_id, plan, status, trial_end, current_period_end, updated_at
from spokedu_pro_subscriptions
where center_id = :center_id;

-- 2) trialing -> expired (예시)
update spokedu_pro_subscriptions
set status = 'expired',
    plan = 'free',
    max_classes = 1,
    updated_at = now()
where center_id = :center_id
  and status = 'trialing';

-- 3) past_due -> active (예시)
update spokedu_pro_subscriptions
set status = 'active',
    updated_at = now()
where center_id = :center_id
  and status = 'past_due';
```

---

## 5. 운영 응답 템플릿

- 결제 지연 안내
  - “현재 구독 결제가 확인되지 않아 결제 지연 상태로 전환되었습니다. 결제 확인 후 바로 활성 상태로 복구해 드리겠습니다.”
- 해지 접수 안내
  - “해지 요청이 접수되었습니다. 정책에 따라 적용 시점과 사용 가능 범위를 함께 안내드립니다.”
- 체험 만료 안내
  - “체험 기간이 종료되어 Free 플랜으로 전환되었습니다. 유료 전환 문의는 이메일로 도와드리겠습니다.”

---

## 6. 장애 시 대응 순서

1. 영향 센터 식별
2. 현재 상태/기간 필드 조회
3. 정책에 맞는 상태로 수동 복구
4. 사용자 공지 발송
5. 원인/재발방지 항목 기록

---

마지막 업데이트: 2026-04-03
