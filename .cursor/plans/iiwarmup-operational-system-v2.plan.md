---
name: IIWarmup 운영 시스템 v2.1
overview: Implementation-Ready Spec for Cursor — 관리자 생산성·구독자 몰입·확장성을 위한 IIWarmup 운영 시스템
todos:
  - id: pr-1
    content: PR-1 Scheduler Windowing + Skeleton
    status: pending
  - id: pr-2
    content: PR-2 Scheduler Today Pin (선택)
    status: pending
  - id: pr-3
    content: PR-3 Asset Hub 탭 구조 리팩터
    status: pending
  - id: pr-4
    content: PR-4 Play Asset Pack v0 (BGM + 5×2)
    status: pending
  - id: pr-5
    content: PR-5 Subscriber Selector + 4버튼 + FullSequencePlayer 뼈대
    status: pending
  - id: pr-6
    content: PR-6 Phase 연결 v0 (Think + Flow + Play)
    status: pending
  - id: pr-7
    content: PR-7 Logs v0
    status: pending
isProject: false
---

# IIWarmup 운영 시스템 v2.1 — Implementation-Ready Spec (for Cursor)

## 0. 목적과 설계 원칙

### 0.1 운영 목표

- **관리자 생산성**: 월 편성이 "반복 노동"이 아니라 "정책 + 예외 처리"로 끝남
- **구독자 몰입**: Play→Think→Flow 전환에서 끊김/로딩/공백 체감 없음
- **확장성**: 액션 15→150, 주차 48, audience/difficulty/region 등 "엔진 수정 없이" 흡수

### 0.2 설계 원칙(가드레일)

1. **정책은 1급 객체**: Reapply/Audit/Partial Override/Diff 가능
2. **스코프 일반화 + 충돌 해결 규칙**: Resolution Order 엔진 레벨 고정
3. **기본값 단순, 변화는 Profile/Override로**
4. **전환 구간 = Bridge 콘텐츠**: 호흡 가이드/성취 피드백/인지 예열 + preload 숨김
5. **로그 지금부터**: KPI 로그 선행

---

## 1. 역할 분리


| 역할             | 범위                                                       |
| -------------- | -------------------------------------------------------- |
| **Admin**      | Scheduler, Asset Hub, Action Library, Policy 관리          |
| **Subscriber** | /iiwarmup 연/월/주차 + 4버튼, FullSequencePlayer, runtime logs |


---

## 2. Part A — Scheduler v2.1 (편성 IDE)

### 2.1 성공 기준

- **TTFA**: 페이지 진입 후 1초 내 현재 월 캔버스에서 편집 시작 가능
- **TTCS**: "정책 1회 적용 + 예외 2~3개"로 월 편성 10분 내 완료

### 2.2 UI (3단)

- **Action Palette**: 액션 라이브러리, 필터(theme/difficulty/audience/tag/favorites)
- **Month Canvas**: 4주×N슬롯, 드래그&드롭, 멀티 선택, 복사/붙여넣기
- **Bulk Panel**: 선택 영역에 적용(균등분배, 랜덤, 패턴, 주차/하루 복제, 정책 적용)

### 2.3 로딩/캐시

- 첫 로딩: 현재 월(M)만 fetch
- 백그라운드: M±1 prefetch + 최근 편집 월 우선
- 편집: optimistic update + debounce save

### 2.4 정책 재실행 규칙 **(v2.1 추가)**

- **슬롯 source 태깅**: `policy` | `manual` | `override`
- **기본 모드**: source=`policy`만 재생성, manual/override 유지
- **옵션**: "모두 덮어쓰기(unsafe)" + 관리자 확인

---

## 3. Part B — Policy 기반 생성

### 3.1 테이블


| 테이블                     | 역할                                                                  |
| ----------------------- | ------------------------------------------------------------------- |
| rotation_policy         | 정책 정의 (actionPool, distributionRule, constraints, version)          |
| rotation_policy_run     | 실행 이력 (누가/언제/결과 요약)                                                 |
| rotation_schedule_slots | 확정 슬롯 (weekKey, slotIndex, actionKey, source, createdBy, updatedAt) |


### 3.2 기능

- Reapply, Diff Preview, Partial Override, Audit

---

## 4. Part C — Action Library (Play Studio) v2.1

### 4.1 데이터 레이어

- **Master**: play_actions_master, play_action_profiles
- **Assignment**: play_action_assignments (scope: weekKey + audience/difficulty/region/orgType/seasonTag)
- **Overrides**: play_action_visual_overrides, play_action_gameplay_overrides

### 4.2 충돌 해결 (Resolution Order)

1. 더 구체적인(더 많은 필드 매칭) assignment 우선
2. 동점 → priority 높은 것
3. 동점 → 최신 updatedAt/version
4. resolved 결과 로그로 남김

### 4.3 usePlayActionResolved(scope)

- master → profile → assignment → overrides 병합

---

## 5. Part D — Bridge v2.1

### 5.1 데이터

- **bridge_scenarios_master**: type(RECOVER/PREPARE/CELEBRATE), durationDefault, scriptTemplate, animationTemplate
- **bridge_assignments**: play→think, think→flow 매핑

### 5.2 시간

- 기본 10초, 옵션 30초, **"바로 시작" 필수**

### 5.3 preload

- 브릿지 시작 시 다음 단계 preload
- preload 완료 시 조기 종료 옵션

---

## 6. Part E — Asset Hub v2.1

### 6.1 공통

- 상단: 연도/월/주차 선택기
- 탭: Think Asset | Play Asset

### 6.2 Think Asset

- 기존: 월×주차 setA/setB 이미지 + BGM

### 6.3 Play Asset **(v2.1 상세)**

- **BGM**: 주차별 업로드/선택
- **이미지**: 5 action × 2 variant = 10 (actionSlot1_off/on … actionSlot5_off/on)
- **저장 구조**: 배열/키 기반으로 3×2, 8×2 등 확장 가능
- **액션/오퍼레이터**: Action Library에서 설정 (Asset Hub는 자산만)

---

## 7. Part F — Subscriber /iiwarmup v2.1

### 7.1 UI

- 연/월/주차 선택
- 4버튼: 전체 | Play만 | Think만 | Flow만

### 7.2 FullSequencePlayer

```
idle → play → bridge1 → think → bridge2 → flow → end
```

- bridge 중 preload
- preload 완료 시 무스피너 전환 보장

---

## 8. Part G — KPI Logging v2.1

- **Admin**: 정책 사용 빈도, TTCS, override 발생률
- **Subscriber**: 단계별 이탈률, preload 실패/지연, 액션별 성공률, 환경 메타

---

## 9. v2 → v2.1 비교 요약


| 항목            | v2      | v2.1                             |
| ------------- | ------- | -------------------------------- |
| 성공 기준         | KPI 개념  | TTFA 1초, TTCS 10분 (수치화)          |
| 슬롯 source     | 없음      | policy/manual/override 태깅 필수     |
| 정책 재실행        | Reapply | manual/override 유지 규칙, unsafe 옵션 |
| scope 충돌      | 일반화만    | Resolution Order 명시              |
| Bridge 시간     | 10/30초  | 기본 10초, "바로 시작" 필수               |
| Play Asset 저장 | 5×2     | actionSlot1_off/on… 배열·키 기반 확장   |
| Cursor TODO   | Phase만  | TODO-1~5 작업 단위                   |


---

## 10. 구현 우선순위

### Phase 1 — 기본 위생 + 사용자 가치

1. Scheduler Windowing + prefetch + optimistic/debounce
2. Asset Hub Play 탭 (BGM + 5×2)
3. Action Library 5 action + operator UI
4. Subscriber 연/월/주차 + 4버튼 + FullSequencePlayer
5. Bridge 기본 PREPARE/RECOVER + preload

### Phase 2 — 운영 엔진

1. rotation_policy + policy_run + Diff/Audit
2. 슬롯 source 태깅 + 정책 재실행 규칙

### Phase 3 — 고도화

1. bridge_scenarios_master 템플릿 UI
2. scope 확장 (audience/difficulty/region)
3. KPI 대시보드

---

## 11. 작업 분해 기준

**PR(커밋) 단위 = "한 기능 + 연쇄 수정 최소"**

각 PR마다: 변경 파일 | 추가 파일 | DB/Storage 변경 | 쿼리 키 | 완료 조건

---

## 12. Phase 1 — PR 단위 상세

### PR-1) Scheduler Windowing + "프레임 유지" Skeleton


| 항목       | 내용                                                                                 |
| -------- | ---------------------------------------------------------------------------------- |
| **목표**   | 현재 월만 먼저 로드, M±1 prefetch, 로딩 중에도 월 아코디언 프레임 유지, 슬롯만 skeleton                      |
| **변경**   | scheduler/page.tsx, useRotationScheduleLight.ts                                    |
| **추가**   | SchedulerMonthAccordion, SchedulerSlotCard, SchedulerSlotSkeleton                  |
| **DB**   | 없음                                                                                 |
| **쿼리 키** | `['rotation_schedule', year, month]`, `['warmup_programs_composite', year, month]` |
| **완료**   | 첫 진입 시 현재 월 UI 즉시, 슬롯만 skeleton. 전체 blank 제거                                       |


**useRotationScheduleLight**: `({ year, month, prefetchNeighbor?: boolean })` — prefetchNeighbor 시 M±1 prefetch

---

### PR-2) Scheduler "Today Pin"


| 항목     | 내용                                        |
| ------ | ----------------------------------------- |
| **목표** | 오늘 수업/슬롯 상단 고정, TTFA 개선                   |
| **변경** | scheduler/page.tsx                        |
| **추가** | TodayPinCard, (선택) dateToWeekKey.ts       |
| **DB** | 없음                                        |
| **완료** | 상단 "오늘(이번 주)" 카드, 클릭 시 해당 월/주로 스크롤·expand |


---

### PR-3) Asset Hub 탭 구조 리팩터


| 항목     | 내용                                                                  |
| ------ | ------------------------------------------------------------------- |
| **목표** | 공통 selector(연/월/주차), Tabs: Think                                    |
| **변경** | assets/page.tsx                                                     |
| **추가** | AssetHubHeader, AssetHubTabs, ThinkAssetPanel, PlayAssetPanel(스켈레톤) |
| **DB** | 없음                                                                  |
| **완료** | 기존 Think 기능 유지, 탭/selector 상태 공유                                    |


---

### PR-4) Play Asset Pack v0: BGM + 5×2 이미지


| 항목         | 내용                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------- |
| **목표**     | weekKey 단위 BGM + 10슬롯(a1_off/on ~ a5_off/on) 업로드/조회                                      |
| **DB**     | **play_asset_packs** (id, year, month, week, week_key, bgm_url, images_json, updated_at) |
| **마이그레이션** | sql/25_play_asset_packs.sql                                                              |
| **추가**     | usePlayAssetPack, playAssetPack API, PlayBgmUploader, PlayImageGridUploader              |
| **변경**     | PlayAssetPanel, storagePaths                                                             |
| **경로**     | `playAssetPath(weekKey, slotKey, ext)` — slotKey: a1_off, a1_on, … a5_off, a5_on         |
| **쿼리 키**   | `['play_asset_pack', weekKey]`                                                           |
| **완료**     | weekKey 변경 시 pack 로드, 업로드/삭제 즉시 반영                                                       |


---

### PR-5) Subscriber /iiwarmup v0: Selector + 4버튼 + FullSequencePlayer 뼈대


| 항목       | 내용                                                                 |
| -------- | ------------------------------------------------------------------ |
| **목표**   | 연/월/주차 selector + 4버튼, phase 상태머신 골격                               |
| **변경**   | iiwarmup/page.tsx                                                  |
| **추가**   | FullSequencePlayer, PhaseControls, WeekSelector, BridgeOverlay(v0) |
| **상태머신** | idle → play → bridge1 → think → bridge2 → flow → end               |
| **완료**   | selector/버튼 동작, 전체 재생 시 phase 순차 전환                                |


---

### PR-6) Phase 연결 v0: Think + Flow + Play


| 항목             | 내용                                                        |
| -------------- | --------------------------------------------------------- |
| **목표**         | 실제 콘텐츠 출력, 브릿지 중 preload                                  |
| **변경**         | FullSequencePlayer                                        |
| **추가**         | (필요 시) FlowFrame, PlayRuntimeWrapper                      |
| **Play**       | RuntimePlayer(React) 직접 사용                                |
| **Flow**       | iframe `/flow-phase/index.html?weekKey=...`               |
| **preload v0** | Think: useQuery 미리 로드. Flow: bridge 중 hidden iframe mount |
| **완료**         | Play→Bridge→Think→Bridge→Flow 연속, 브릿지에 로딩 스피너 없음          |


---

### PR-7) Logs v0


| 항목         | 내용                                                                     |
| ---------- | ---------------------------------------------------------------------- |
| **목표**     | KPI 이벤트 심기 (대시보드는 Phase 3)                                             |
| **DB**     | admin_productivity_events, subscriber_runtime_events                   |
| **마이그레이션** | sql/26_logs_v0.sql                                                     |
| **추가**     | logClient.ts (supabase insert)                                         |
| **변경**     | scheduler/page (SCHEDULE_OPEN 등), FullSequencePlayer (PHASE_START/END) |
| **완료**     | 편성/구독자 phase 이벤트 적재                                                    |


---

## 13. Phase 2 예고 (PR-8~10)

- **PR-8**: rotation_policy / run / diff preview (DB + API)
- **PR-9**: Bulk Panel "정책 적용" UX + Diff Modal
- **PR-10**: source 태깅 + 정책 재실행 규칙(Manual 보존)

---

## 14. 권장 실행 순서 (회귀 최소, 즉시 검증)

```
PR-1 → PR-3 → PR-4 → PR-5 → PR-6 → PR-7
```

(PR-2 Today Pin은 PR-1 이후 선택 적용)