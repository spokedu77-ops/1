# SPOMOVE Product Contract

## 제품 정의

스포매트 한 장으로 색·위치 자극을 손·발·균형·자세 동작에 연결하고, 같은 화면 활동을 여러 체육수업으로 확장하는 시스템.

## 세 계층 (절대)

| 개념 | 의미 |
| --- | --- |
| **Preset** | 실행 데이터 (Engine 옵션·URL·Recent·썸네일) |
| **Activity Family** | 움직임 호환성 (Profile·추천·허용·제외·매트) |
| **Catalog Family** | Hub에서 판매하는 현재 상품 단위. Activity Family와 **병합하지 않음** |

## 표면별 역할

| 표면 | 역할 |
| --- | --- |
| Hub | Catalog Family와 활동을 현재 상품 구조로 제시 |
| Start | 현재 실행 조건 **확인** 후 명시 시작 |
| Settings | 실행 조건 **변경** 후 명시 시작 |
| Guide | 지도법 — **카드 CTA가 아님**. Start 확인 Sheet 내부에 유지 (카드 밖 별도 「가이드 보기」 금지) |
| Running | 화면 자극에 집중 (Engine only) |
| Result · Recent | 실행 조합 기록·재사용 (확인 후 시작) |

## 현재 Runtime 계약

### Entry · Autostart

- `entry=start` | `entry=settings` (없으면 start)
- **Legacy autostart**는 `entry` 쿼리가 **없을 때만** (`?autostart=1`). `entry=start&autostart=1` / `entry=settings&autostart=1` 은 Setup 화면
- **Public UI 신규 링크는 autostart를 생성하지 않음** (Hub·Recent·즐겨찾기·검색·결과 재실행·저장 설정)
- Result 재실행은 `entry=start` 확인 화면으로 (즉시 Engine 금지)
- Legacy autostart는 명시된 제한 범위에서만 호환하며 신규 링크에는 사용하지 않음

### Hub

- `[활동 준비]` · 썸네일 → 확인 Sheet(진행 방법·준비 포함). Sheet Primary만 `entry=start` (`이 설정으로 시작`)
- `[시작 설정]` → `entry=settings` (Secondary, 활동 준비보다 작은 무게)
- 카드 레벨 「가이드 보기」·「바로 실행」·「바로 시작」 금지. 썸네일 aria는 `{활동명} 활동 준비 열기`
- Hub 클릭으로 **Family 저장값 변경 금지** (`writeFamilyMovement` 없음)
- `preset.description` 임시 미노출 · 임시 자동 카피 금지
- 「사전 설정된 공식 조건으로 실행」 등 사실과 다른 헤더 문구 금지
- Public Hub는 editorial production status(공식 가이드/기본 안내/세부 안내 예정)를 필터·배지·현황으로 노출하지 않음
- CMS `published` validity와 commercial briefing readiness(`objective` + `teachingPoints`)는 분리 — readiness 라벨은 Admin QA 전용
- Public briefing Sheet는 있는 section만 표시. DB 결손 placeholder 반복·roadmap 문구 금지

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
- Compact 안내는 `compactMovementInstruction` (sameSide/oppositeSide 손발 규칙 포함)
- 대형 도식·안전 카드·긴 InstructionPanel·자세히 보기 금지

### Space

- **idle + Setup + interactive focus 없음**일 때만 Space → 명시 시작
- `done`/`ended`에서 Space 재실행 금지

### 완료 증거

Vercel success ≠ runtime contract test ≠ 수동 UI QA. 배포 성공만으로 완료 선언 금지.

## 변경 금지

- 움직임별 프리셋 복제 · 실행 중 지속 HUD · 한 색 칸 양발 점프 기본 · 센서 없는 성공률 · 단일 매트 전 다중 매트
- Foundation Reset을 이유로 Engine/runtime 재설계·움직임 계층 병합·Expansion 삭제 금지

## PR 게이트 질문

이 변경이 같은 화면을 더 다양한 체육수업으로 만드는가?  
(Foundation Lock 이후에는 P0/P1 또는 verified contradiction만 수정한다.)
