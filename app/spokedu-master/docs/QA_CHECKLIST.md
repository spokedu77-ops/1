# SPOKEDU MASTER 상용화 QA 체크리스트

실행일: ___________  
담당: ___________  
환경: production / staging / local

## 에이전트가 코드로 이미 고정한 것 (수동 재확인만)

| 항목 | 상태 | 확인 방법 |
|------|------|-----------|
| 라이브러리 제목-only 검색 | 의도 유지 | 교구명으로 전량 검색되지 않음 |
| 교차 필터 카운트 | 코드 반영 | 대상 선택 후 공간 숫자 감소 |
| 더 보기(12개) | 코드 반영 | 초기 12 → 더 보기 |
| 즐겨찾기 서버 동기화 | 코드+마이그레이션 | 새로고침·다른 기기 유지 |
| 한영 라벨 한국어화 | 코드 반영 | 마스터 라이브러리/추천 필터 등 |
| 오프라인 저장 안내·재시도 | 코드 반영 | B1/B7 |
| 저장 중 새로고침 draft | 코드 반영 | A5-1 (sessionStorage) |
| 만료 저장 → 결제 CTA | 코드 반영 | B2 (`SaveErrorBanner`) |
| Phase E 자동 표 | admin API | 아래 Phase E 참고 |

수동으로만 가능한 것: 실기기 터치, 실제 결제 webhook, 콘텐츠 품질 판단(Pass/Fail 최종).

## 테스트 계정

| 역할 | 이메일 | 플랜 | 비고 |
|------|--------|------|------|
| A | | free 또는 만료 | gate·결제 유도 |
| B | | lite (active) | 라이브러리·기록·SPOMOVE 차단 |
| C | | premium (active) | 전체 기능 |
| D | | admin (선택) | 운영 확인용 · content-audit |

## 기기

- [ ] Chrome 데스크톱 (Windows/Mac)
- [ ] iPhone Safari 또는 Android Chrome
- [ ] PWA 홈 화면 추가 후 1회 (선택)

---

## Phase A — Happy Path

### A1. 라이브러리 검색·필터 (Lite/Premium)

| # | 단계 | 기대 결과 | Pass | 기기 | 메모 |
|---|------|-----------|------|------|------|
| A1-1 | `/spokedu-master/library` 접속 | 목록 로드 | | | |
| A1-2 | `?q=` 검색 | **제목** 관련 수업만 표시 | | | 의도: 교구명 전량검색 금지 |
| A1-3 | 필터 적용 | URL·결과 동기화, 교차 count 갱신 | | | |
| A1-4 | 즐겨찾기 토글 | 새로고침·다른 브라우저 후 유지 | | | 서버 sync |
| A1-5 | isPro 수업 (Lite) | 잠금·결제 유도 | | | |
| A1-6 | 더 보기 | 12개 단위 추가 로드 | | | |

### A2. 라이브러리 상세 → 수업 기록 → 안내문

| # | 단계 | 기대 결과 | Pass | 기기 | 메모 |
|---|------|-----------|------|------|------|
| A2-1 | 수업 카드 → 상세 | 지도안·영상·CTA 표시 | | | |
| A2-2 | 수업 기록 시작 | `/class-record?program=` 이동 | | | |
| A2-3 | 학생·출석 입력 후 저장 | 성공 메시지·record ID | | | |
| A2-4 | 안내문 작성 링크 | report 초안 생성 | | | |
| A2-5 | 안내문 저장·복사 | 저장 ID·클립보드 | | | |
| A2-6 | activity / students 이력 | 기록·증거 반영, 빠른 기록은 「이 기록 보강」 | | | |

### A3. 빠른 기록 (BottomSheet)

| # | 단계 | 기대 결과 | Pass | 기기 | 메모 |
|---|------|-----------|------|------|------|
| A3-1 | 상세 → 빠른 기록 열기 | BottomSheet·스크롤 정상 | | | |
| A3-2 | 날짜·관찰 저장 | 성공·「이 기록 보강」/안내문 링크 | | | |
| A3-3 | 「이 기록 보강」 | 같은 recordId로 출석·관찰 보강, quick→detailed | | | |
| A3-4 | 입력 후 닫기·다시 열기 | draft 복원(같은 program만) | | | sessionStorage |

### A4. SPOMOVE → 기록 초안 (Premium)

| # | 단계 | 기대 결과 | Pass | 기기 | 메모 |
|---|------|-----------|------|------|------|
| A4-1 | `/spokedu-master/spomove` | preset 목록 | | | |
| A4-2 | `program` 쿼리 포함 세션 실행 | 세션 UI 정상 | | | |
| A4-3 | 세션 종료 → 기록 링크 | class-record 이동 | | | |
| A4-4 | 메모 prefill | SPOMOVE 초안 텍스트 | | | |
| A4-5 | 저장 → 안내문 | A2와 동일 | | | |

### A5. 새로고침·뒤로가기

| # | 단계 | 기대 결과 | Pass | 기기 | 메모 |
|---|------|-----------|------|------|------|
| A5-1 | 기록 작성 중 새로고침 | 출석·메모 등 draft 복원 | | | sessionStorage |
| A5-2 | 저장 후 뒤로가기 | 저장 데이터 유지 | | | |
| A5-3 | 안내문 작성 중 새로고침 | 초안 텍스트 복원 | | | |

---

## Phase B — 실패·엣지

| # | 조건 | 기대 동작 | Pass | 심각도 | 메모 |
|---|------|-----------|------|--------|------|
| B1 | 저장 중 DevTools offline | 오프라인 안내·재시도 | | Blocker | class-record / report / 빠른기록 |
| B2 | 만료 계정으로 저장 | 결제 CTA·입력 보존 | | Blocker | |
| B3 | Lite → `/spomove/session` 직접 | 차단·업그레이드 안내 | | Major | |
| B4 | 긴 SPOMOVE 세션 → 기록 | draft 유실 없음 | | Major | |
| B5 | API 401/403/500 | raw 에러 미노출 | | Major | |
| B6 | 안내문 저장 실패 | 메시지·재시도 | | Major | |
| B7 | 네트워크 끊김 후 복구·재시도 | 저장 성공 | | Blocker | Online 복구 후 다시 시도 |

심각도: Blocker / Major / Minor

---

## Phase C — 모바일 현장 (수업 직후 5분)

| # | 확인 항목 | Pass | 메모 |
|---|-----------|------|------|
| C1 | 저장·출석 버튼 한 손 조작 (min-h-11) | | |
| C2 | 학생 15~20명 스크롤·출석 | | |
| C3 | BottomSheet 열림/닫힘·배경 스크롤 잠금 | | |
| C4 | TabBar에 CTA 가리지 않음 (pb-28) | | |
| C5 | SPOMOVE mobile mode 라벨·버튼 | | |
| C6 | 키보드 올라올 때 입력창 가림 없음 | | |

---

## Phase D — 결제·권한

| # | 이벤트 | 확인 | Pass | 메모 |
|---|--------|------|------|------|
| D1 | checkout 성공 | plan·capabilities 즉시 반영 | | |
| D2 | webhook 지연 후 refresh | 상태 정합 | | |
| D3 | cancel_at_period_end | 기간 내 사용·이후 gate | | |
| D4 | renew 실패 | 프로필에 만료 전 안내(`billingRenewalFailed`) | | 코드: subscription API + 프로필 배너 |
| D5 | Lite vs Premium capability | library/tools/records/spomove | | |
| D6 | isPro redaction | Lite에서 상세 잠금 | | |

---

## Phase E — 콘텐츠 샘플 (상위 20개)

admin으로 로그인 후 **UI(권장)**:

`/admin/spokedu-master/programs` → 상단 탭 **「Phase E 감사」**  
→ 표 확인 → **표 복사**로 QA 시트에 붙이기 → 행의 **편집기에서 열기**로 바로 수정

또는 API:

```http
GET /api/admin/spokedu-master/programs/content-audit?limit=20
```

응답 `data[]`의 `checks` / `missing` / `pass`를 아래 표에 옮긴 뒤, 사람이 **품질 Pass**만 판단합니다.  
영상만 보려면 기존 `GET /api/admin/spokedu-master/programs/video-gaps`와 교차.

| # | 수업 ID/제목 | 영상 | 준비물 | 단계 | 태그 | API pass | 품질 Pass |
|---|--------------|------|--------|------|------|----------|-----------|
| E1 | | | | | | | |
| E2 | | | | | | | |
| E3 | | | | | | | |
| E4 | | | | | | | |
| E5 | | | | | | | |
| E6 | | | | | | | |
| E7 | | | | | | | |
| E8 | | | | | | | |
| E9 | | | | | | | |
| E10 | | | | | | | |
| E11 | | | | | | | |
| E12 | | | | | | | |
| E13 | | | | | | | |
| E14 | | | | | | | |
| E15 | | | | | | | |
| E16 | | | | | | | |
| E17 | | | | | | | |
| E18 | | | | | | | |
| E19 | | | | | | | |
| E20 | | | | | | | |

정렬: HOT 우선 → `display_order` → curriculum id.  
체크 항목: 영상·준비물·단계·태그 (안전 섹션은 필수 아님).

---

## 결함 로그

| ID | Phase | 설명 | 심각도 | 담당 | 상태 |
|----|-------|------|--------|------|------|
| | | | | | open |

---

## 런칭 게이트

| 런칭 유형 | 조건 |
|-----------|------|
| 내부/소수 파일럿 | Blocker 0, 저장·권한 Major 해결 |
| 지인·제한 상용 | + 모바일 Major 해결, Phase D 통과. **자동갱신 크론은 현재 pause** — 1개월 만료형으로 운영하거나 cron 재스케줄 필요 |
| 광범위 공개 | + Phase E 샘플 감사, 운영 모니터링 루틴, **billing renew cron 재가동 + 멱등 claim 검증** |

### 코드로 이미 보강한 결제 안전장치 (2026-07-17)
- 초기/업그레이드 `billing_cycle_key` 결정론화 (`mode:userId:plan`) + 청구 전 `processing` claim
- 만료 후 재구독: 완료된 cycle과 충돌 시 timestamp suffix로 새 cycle 분리
- Vault 키 저장을 **청구 성공 이후**로 이동 (업그레이드 시 기존 키 선삭제 방지)
- 청구 후 apply 실패: `payment_key` 보존 + `recoverable_failed` + 재시도 시 재청구 없이 re-apply
- stale `processing`(15분) lease reclaim
- 갱신: active 주문 pending 덮어쓰기 제거, insert+claim, due `next_billing_at` 오름차순
- 갱신 실패 시 프로필 `billingRenewalFailed` 만료 전 안내
- **자동갱신 크론은 의도적 pause 유지** (API 부하). 재가동은 운영 결정

### 권장 실행 순서

1. Phase A1 + A5 + B1/B2/B7 (30~60분)  
2. Phase A2~A3 + D5/D6 (반나절)  
3. Phase C 실기기 (반나절)  
4. Phase D 결제 + Phase E content-audit (1일)
