# 스포키듀 구독 상용화 체크리스트 (2주 압축)

목표는 **빠른 상용화**입니다. 이번 릴리즈는 “자동 결제 완성”이 아니라,  
**요금/상태/운영 대응이 혼동 없이 돌아가는 최소 상용 상태**를 만드는 데 집중합니다.

---

## 0) 1차 범위 고정 (릴리즈 노트 기준)

### 포함
- [x] 플랜 가격/한도의 단일 소스 확정
- [x] 설정 화면 문구와 실제 운영 방식(수동 전환) 일치
- [x] `/billing` 진입 오류 제거 (구독 화면으로 연결)
- [x] 구독 상태 운영 플레이북 작성
- [x] 프로덕션 DB 점검 SQL/체크리스트 작성
- [x] 출시 리허설 시나리오와 대응 템플릿 정리

### 제외 (과감히 보류)
- [ ] 관리자 화면에서 실시간 가격 변경 기능
- [ ] 환불/부분취소/세금계산 자동화
- [ ] 고급 매출 대시보드(MRR/LTV/코호트)
- [ ] 복수 PG 동시 지원
- [ ] 구독/강사 정산 도메인 통합 리팩터링

---

## 1) 가격/플랜 단일 소스 체크

- [x] 가격·한도 상수: `app/lib/spokedu-pro/planCatalog.ts`
- [x] 서버 계산 로직: `app/lib/spokedu-pro/planUtils.ts`
- [x] 설정 화면 가격/혜택: `app/(pro)/spokedu-pro/views/SettingsView.tsx`
- [x] 중복 하드코딩 제거 (설정 화면에서 공용 카탈로그 사용)

---

## 2) 링크/문구 정합성 체크

- [x] `/billing` 라우트 추가 후 `/spokedu-pro`로 리다이렉트
- [x] 사이드바 구독 메뉴 라벨 통일 (`플랜 & 결제`)
- [x] “자동 결제 미지원 + 이메일 수동 전환” 문구로 통일
- [x] 상태 배지 한글 라벨(`trialing`, `past_due` 등) 정리

---

## 3) 운영 필수 문서

- [x] 상태 머신/수동 운영 플레이북: `docs/spokedu-subscription-state-playbook.md`
- [x] 프로덕션 점검 가이드: `docs/spokedu-subscription-prod-db-audit.md`
- [x] 출시 리허설 시나리오: `docs/spokedu-subscription-launch-rehearsal.md`
- [x] 릴리즈 이력: `docs/CHANGELOG-SPOKEDU-SUBSCRIPTION.md`

---

## 4) 출시 직전 Go/No-Go

**실행 절차(한 권)**: [`spokedu-subscription-ops-runbook.md`](./spokedu-subscription-ops-runbook.md) — SQL·Stripe·앱 확인·증적 예시.  
증적 표는 [`spokedu-subscription-section-4-execution.md`](./spokedu-subscription-section-4-execution.md) **§6**을 채운 뒤, 아래 네 줄을 `[x]`로 바꿉니다.

- [ ] 운영 담당자 1명 이상이 플레이북 절차를 직접 실행해 봄
- [ ] `trialing -> expired`, `active -> past_due`, `past_due -> active` 수동 전환 테스트 완료
- [ ] 공지/문의 템플릿(결제 지연, 해지 요청) 운영 채널에 배포
- [ ] 링크/문구/요금표가 실제 정책과 100% 일치

### 4.1) 실행 번들(문서·앱 링크)

- [x] Go/No-Go 실행 번들 문서: [`docs/spokedu-subscription-go-nogo-bundle.md`](./spokedu-subscription-go-nogo-bundle.md) (플레이북·리허설·DB 감사·템플릿 한곳 링크)
- [x] 구독 고지 페이지: 앱 내 `/spokedu-pro/legal/subscription` (설정 화면에서 링크)

### 4.2) §4 본문 실행 지원(문서·검증)

- [x] 단계별 실행·서명란: [`docs/spokedu-subscription-section-4-execution.md`](./spokedu-subscription-section-4-execution.md)
- [x] 슬랙용 템플릿: [`docs/spokedu-subscription-ops-templates-slack.md`](./spokedu-subscription-ops-templates-slack.md)
- [x] 요금·설정 단일 소스 검증: `npm run verify:spokedu-plan-copy` ([`scripts/verify-spokedu-plan-copy.mjs`](../scripts/verify-spokedu-plan-copy.mjs))

> §4 **본문 4개 체크박스**는 스테이징/운영에서 실제 수행 후에만 `[x]`로 바꿉니다. 위 문서의 서명란을 기준으로 합니다.

### 4.3) 개발·CI 선행(§4 본문과 별개)

- [x] `npm run verify:spokedu-plan-copy` exit 0 — [`section-4-execution`](./spokedu-subscription-section-4-execution.md) §4 자동 검증 항목과 동일

---

마지막 업데이트: 2026-04-22
