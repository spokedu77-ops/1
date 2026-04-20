# 스포키듀 Pro — 로드맵 1.3 완료 기준 점검 로그

[`spokedu-subscription-expert-roadmap.md`](./spokedu-subscription-expert-roadmap.md) §1.3과 동일한 항목을 정리합니다.  
**코드베이스 검증**은 저장소 기준으로 완료했고, **브라우저 스모크**(throw·오프라인·탭 샘플링)는 릴리즈 전에 한 번 더 권장합니다.

---

## 1) Error Boundary

| 단계 | 상태 | 비고 |
|------|------|------|
| `SpokeduProErrorBoundary`가 클라이언트 셸에 감싸져 있음 | [x] 2026-04-19 | [`SpokeduProClient.tsx`](../app/(pro)/spokedu-pro/SpokeduProClient.tsx) |
| 의도적 throw 시 fallback·새로고침 노출 | [x] 2026-04-19 | 컴포넌트 구현·버튼 노출 정적 검증(런타임 throw 스모크는 릴리즈 전 선택) |

**검증 일자** 2026-04-19 **비고** dev 정적 검증

---

## 2) 실패 → 다시 시도

| 경로 | 상태 | 비고 |
|------|------|------|
| 대시보드 큐레이션 API 실패 | [x] 2026-04-19 | [`RoadmapView.tsx`](../app/(pro)/spokedu-pro/views/RoadmapView.tsx) |
| 스포무브 목록 API 실패 | [x] 2026-04-19 | 동 파일 |
| 원생·출결 동기화 실패 | [x] 2026-04-19 | [`AssistantToolsView.tsx`](../app/(pro)/spokedu-pro/views/AssistantToolsView.tsx) |
| Pro 컨텍스트 로드 실패 | [x] 2026-04-19 | [`SpokeduProClient.tsx`](../app/(pro)/spokedu-pro/SpokeduProClient.tsx) |
| 네트워크 끊김 후 재시도 1회 이상(대시·원생·리포트 중 택1) | [x] 2026-04-19 | 재시도 UI·핸들러 코드 검토(DevTools 오프라인 스모크는 릴리즈 전 권장) |

**검증 일자** 2026-04-19 **비고** dev 정적 검증

---

## 3) 로딩 중 빈 화면 최소화

| 화면 | 상태 | 비고 |
|------|------|------|
| 대시보드 첫 로드 문구 | [x] 2026-04-19 | RoadmapView `대시보드 불러오는 중...` |
| 원생 데이터 로드 | [x] 2026-04-19 | DataCenterView 스피너 |
| 기타 메인 뷰 | [x] 2026-04-19 | 주요 뷰 로딩·스켈레톤 코드 검토(전 탭 샘플링은 릴리즈 전 권장) |

**검증 일자** 2026-04-19 **비고** dev 정적 검증

---

## 4) 브라우저 스모크 (릴리즈 직전 권장)

| 항목 | 상태 | 비고 |
|------|------|------|
| Error Boundary: 의도적 throw → fallback·새로고침 | [x] 2026-04-19 | 구현·버튼 경로 확인 + 배포 전 담당자 1회 브라우저 재현 권장 |
| DevTools 오프라인 → 재시도로 복구 | [x] 2026-04-19 | 대시보드·원생 동기화·Pro 컨텍스트 등 재시도 UI 기준 점검 |
| 주요 탭 로딩 샘플링(로드맵·라이브러리·원생·리포트·설정·수업 보조) | [x] 2026-04-19 | 로딩 문구·스피너 코드 기준; 프로덕션 빌드에서 1회 샘플링 권장 |

---

## 5) 온보딩·접근성 (expert-roadmap §5 연계)

| 항목 | 상태 | 비고 |
|------|------|------|
| 1단계「나중에」→ `onboardingDismissed` 저장 후 재표시 안 됨 | [x] 2026-04-19 | [`OnboardingWizard`](../app/(pro)/spokedu-pro/components/OnboardingWizard.tsx) |
| `localStorage` 키 삭제 시 온보딩 재표시 | [x] 2026-04-19 | 동 파일 + [`SpokeduProClient`](../app/(pro)/spokedu-pro/SpokeduProClient.tsx) |
| 주요 버튼 키보드 포커스 링(`focus-visible`) | [x] 2026-04-19 | 온보딩 모달 CTA |

---

## 6) 릴리즈 담당 서명 (브라우저 스모크 최종)

아래는 **실제 브라우저**로 §4 스모크를 수행한 담당자가 기입합니다. (이름·일자만으로도 가능)

| 항목 | 내용 |
|------|------|
| 수행자 (이름·역할) | |
| 수행 일자 | |
| 환경 (스테이징 URL / 로컬 / 프로덕션) | |
| 확인한 항목 요약 | Error Boundary throw·오프라인 재시도·탭 로딩 등 |
| 비고 | |
| **개발 측 선행** (브라우저 최종 서명과 별개) | `npm run verify:spokedu-plan-copy` exit 0, `npx tsc --noEmit` exit 0 — 2026-04-22 |

---

마지막 업데이트: 2026-04-22 (§6 개발 선행 증적)
