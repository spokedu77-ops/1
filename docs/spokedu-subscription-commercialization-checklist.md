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

- [ ] 운영 담당자 1명 이상이 플레이북 절차를 직접 실행해 봄
- [ ] `trialing -> expired`, `active -> past_due`, `past_due -> active` 수동 전환 테스트 완료
- [ ] 공지/문의 템플릿(결제 지연, 해지 요청) 운영 채널에 배포
- [ ] 링크/문구/요금표가 실제 정책과 100% 일치

---

마지막 업데이트: 2026-04-03
