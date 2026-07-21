# SPOMOVE Product Contract

## 제품 정의

스포매트 한 장으로 색·위치 자극을 손·발·균형·자세 동작에 연결하고, 같은 화면 활동을 여러 체육수업으로 확장하는 시스템.

## 세 계층 (절대)

| 개념 | 의미 |
| --- | --- |
| **Preset** | 실행 데이터 (Engine 옵션·URL·Recent·썸네일) |
| **Activity Family** | 움직임 호환성 (Profile·추천·허용·제외·매트) |
| **Catalog Family** | Hub에서 판매하는 상품 단위 (Phase 1~2에서 도입). Activity Family와 **병합하지 않음** |

## 표면별 역할

| 표면 | 역할 |
| --- | --- |
| Hub | 활동을 상품으로 제시 (Phase 0: 양산형 description 임시 미노출) |
| Start | 현재 실행 조건 **확인** 후 명시 시작 |
| Settings | 실행 조건 **변경** 후 명시 시작 |
| Guide | 지도법 (Hub 독립 액션·기존 Sheet 허용. Start/Settings 혼입 금지) |
| Running | 화면 자극에 집중 (Engine only) |
| Result · Recent | 실행 조합 기록·재사용 (확인 후 시작) |

## Phase 구조

| Phase | 내용 |
| --- | --- |
| **0** | 긴급 UI 격리 (현재) |
| **1** | Catalog Family 감사 |
| **2** | Family Hub |
| **3** | 제품 UX 재설계 |
| **4** | P0 Release |

Phase 0은 SPOMOVE를 새로 설계하는 단계가 아니다. 즉시 실행·과밀 설정·양산형 설명을 중단하고 Catalog 감사가 가능한 안정 상태로 돌린다.

## Phase 0 계약

### Entry · Autostart

- `entry=start` | `entry=settings` (없으면 start)
- **`entry=settings`는 Legacy `autostart=1`보다 우선** — Settings에서 autostart 무시
- `entry` 없음 + `autostart=1` → Legacy 자동 시작 **허용** (기존 공유 URL)
- **Public UI 신규 링크는 autostart를 생성하지 않음** (Hub·Recent·즐겨찾기·검색·결과 재실행·저장 설정)
- Release 전 Legacy autostart 유지/무시/리다이렉트 재결정

### Hub

- `[시작]` → `entry=start`, `[설정]` → `entry=settings`
- Hub 클릭으로 **Family 저장값 변경 금지** (`writeFamilyMovement` 없음)
- `preset.description` 임시 미노출 · 임시 자동 카피 금지
- 가이드는 Hub Sheet로만 (Start/Settings 혼입 금지)

### Setup state

- SSOT는 `session/page.tsx` (`movementPick` · `cueSeconds` · `difficultyValue` 등)
- Start/Settings는 Controlled만 · **동일** `beginConfiguredSession` 호출
- 저장: Settings에서 움직임 변경 시 · 실제 수업 시작 시

### Start 요약 (Profile별)

| Profile | 표시 |
| --- | --- |
| selectable | Effective 움직임 |
| fixed | 발 터치 · 화면 지정 방식 |
| bodyCueBuiltIn | 화면이 손·발 직접 안내 |
| diveBuiltIn | 움직임 행 미표시 |

- 속도 지원: 자극 속도 선택 · 비지원: 고정 진행 방식 요약 (비활성 2~6초 나열 금지)
- selector 없음 · 명시 시작

### Settings

- `MovementConfigurator variant="compact"` · fixed / bodyCue / DIVE 분기 유지
- 대형 도식·안전 카드·긴 InstructionPanel·자세히 보기 금지

### Space

- idle + Setup + interactive focus 없을 때만 Space → 명시 시작

### 완료 증거

Vercel success ≠ Vitest (`test:spomove-phase0`) ≠ 수동 UI QA. Vercel만으로 Phase 0 완료 선언 금지.

## 변경 금지

- 움직임별 프리셋 복제 · 실행 중 지속 HUD · 한 색 칸 양발 점프 기본 · 센서 없는 성공률 · 단일 매트 전 다중 매트
- Phase 0에 Catalog 타입·Family Hub·테마 선택기·직접 카피·Expansion 삭제·Engine 수정 금지

## PR 게이트 질문

이 변경이 같은 화면을 더 다양한 체육수업으로 만드는가?  
(Phase 0은 “손상을 중단하는가?”를 우선한다.)
