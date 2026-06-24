# DIVE Flow Consolidation Audit

## Git 안전 정보

| 항목 | 값 |
|------|-----|
| START_SHA | `6ad4cce88d0965411e403bf91867f4b9197ef9f5` |
| 현재 브랜치 | `main` (브랜치 생성 없음) |
| 백업 태그 | `backup-pre-dive-flow-consolidation-20260625-1200` |
| 원격 push | 없음 |

## 작업 개요

- 기존 IIWarmup Flow(구독자 플레이어 + 관리자 화면) 제거
- 운영 DIVE(`app/admin/spomove/training/_player/flow/`) 복제 → `flow-lab`
- flow-lab 전용 독립 실험 페이지 생성
- 운영 DIVE 파일 무변경 유지

## 운영 DIVE 실행 경로

```
/admin/spomove/training (탭 UI → 기존 3개 탭)
└─ MemoryGameApp → FlowGameClient (app/admin/spomove/training/_player/flow/)
```

## 기존 IIWarmup Flow 실행 경로 (제거 대상)

```
/admin/iiwarmup/flow      → app/admin/iiwarmup/flow/page.tsx
/program/iiwarmup/flow    → app/program/iiwarmup/flow/page.tsx
                                 → FlowPhaseClient.tsx + engine/
```

## 보호 대상 파일 목록 및 시작 해시

| 파일 | Git Blob SHA (시작 시점) |
|------|--------------------------|
| `app/admin/spomove/training/_player/flow/FlowGameClient.tsx` | `3e8f86a9ba0419146b10d3aa83073764ba4147f7` |
| `app/admin/spomove/training/_player/flow/engine/FlowEngine.ts` | `768c19cbbab3c340e73abfd2fd4a10865b9ef230` |
| `app/admin/spomove/training/_player/flow/engine/FlowAudio.ts` | `3e77ee8652a3d6fbeed70f15e754d5a94c451675` |
| `app/admin/spomove/training/_player/flow/engine/AdaptiveQuality.ts` | `3b26dd14ca308437fe500139fc286ff4a717bdc4` |
| `app/admin/spomove/training/_player/flow/engine/entities/ObstacleManager.ts` | `07a3b7d8f92ba7fd84c56bfed18658340c52b94e` |
| `app/admin/spomove/training/_player/flow/engine/modules/stageBuilder.ts` | `d9ddfd4a239b9f3e5bff1917ba58ea356fc01963` |
| `app/admin/spomove/training/_player/flow/engine/modules/flowModules.ts` | `11182a2c152c3b168b9f83d3556cc7bf25c5d2ae` |
| `app/admin/spomove/training/_player/flow/engine/modules/flowObstacleSchedule.ts` | `ff56c7dec25234925e66d813cb7db5f87c793248` |
| `app/admin/spomove/training/_player/MemoryGameApp.tsx` | `0d186afaae746b2cec7910e1868cc5236a3c44fb` |
| `app/admin/spomove/training/page.tsx` | `771809e2e0be8b8f1574a508b497a14b7d8f130d` |
| `app/spokedu-master/spomove/session/EngineRouter.tsx` | `84f8fa46d188001c95fb7b7a6133e0448f63dca4` |
| `app/spokedu-master/spomove/officialSpomovePresets.ts` | `2e1f2a2094788db2ebc22fae472a8d55df890d64` |

## 의존성 조사 결과

### 운영 DIVE → IIWarmup Flow 직접 의존성

검색 대상: `iiwarmup`, `FlowPhaseClient`, `useFlowBGM`, `useFlowPano`, `FlowBgmPanel`, `DURATION_SLOTS`

결과: **없음**

- `FlowEngine.ts` 주석에 "원본 iiwarmup/flow 수치 완전 이식" 문구 있으나 이는 설명 주석
- `FlowAudio.ts`에서 `iiwarmup-files` 문자열은 Supabase Storage 버킷명 (URL)이며 IIWarmup 코드 import 아님
- 실제 코드 import 없음 → **삭제 안전**

### IIWarmup Flow → 운영 DIVE 의존성

없음. 두 시스템은 완전히 독립.

### 분류

**A. 기존 IIWarmup Flow 실행 코드 (삭제 대상)**
- `app/program/iiwarmup/flow/page.tsx`
- `app/program/iiwarmup/flow/FlowPhaseClient.tsx`
- `app/program/iiwarmup/flow/engine/**` (FlowEngine, FlowAudio, FlowUI, FlowTypes, ObstacleManager, AdaptiveQuality, effects, coordContract, clock, flowContent, types, README)

**B. 기존 IIWarmup Flow 관리자 화면 (정리 대상)**
- `app/admin/iiwarmup/flow/page.tsx` → 삭제
- `app/admin/iiwarmup/assets/page.tsx` → flow 탭 로직만 제거 (페이지 유지)
- `app/admin/iiwarmup/page.tsx` → Flow 카드만 제거
- `app/components/admin/assets/FlowBgmPanel.tsx` → 참조 0개 후 삭제
- `app/components/admin/assets/AssetHubTabs.tsx` → 'flow' 탭 항목만 제거
- `app/lib/admin/hooks/useFlowBGM.ts` → 참조 0개 후 삭제
- `app/lib/admin/hooks/useFlowPano.ts` → 참조 0개 후 삭제

**C. 현재 운영 DIVE (절대 변경 금지)**
- `app/admin/spomove/training/_player/flow/**`
- `app/admin/spomove/training/_player/MemoryGameApp.tsx`
- `app/admin/spomove/training/page.tsx`
- `app/spokedu-master/spomove/session/EngineRouter.tsx`
- `app/spokedu-master/spomove/officialSpomovePresets.ts`

**D. 공유 코드 (IIWarmup Flow 전용 → 제거 후 안전)**
- `useFlowBGM`, `useFlowPano`: FlowPhaseClient + FlowBgmPanel에서만 사용. 두 파일 제거 후 참조 없음.
- `FlowBgmPanel`: iiwarmup/assets/page.tsx에서만 사용. flow 탭 제거 후 참조 없음.

## 추가 레거시 경로

| 경로 | 존재 여부 | 비고 |
|------|-----------|------|
| `app/flow-phase/**` | 없음 | |
| `public/flow-phase/` | 있음 | `index.html`, `legacy_space_flow.html` — 이번 작업에서 삭제 안 함 |
| `app/components/subscriber/FlowFrame.tsx` | 없음 | |
| `app/iiwarmup/program/phases/flow/**` | 없음 | |

## 삭제 가능 여부 판단

운영 DIVE와 IIWarmup Flow 사이에 직접 코드 의존성 없음. 삭제 안전.
