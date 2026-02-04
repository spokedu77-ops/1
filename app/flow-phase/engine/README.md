# Flow Phase Engine 구조

## 파일 역할 (유지보수 시 참고)

| 파일 | 역할 |
|------|------|
| **FlowEngine.ts** | 메인 엔진 - 게임 루프, 브리지, 점프, 카메라, 레벨 흐름 |
| **FlowAudio.ts** | 배경음 + 효과음 (점프, 펀치, 코인, whoosh) |
| **FlowUI.ts** | DOM 헬퍼 (getRefEl, setLevelTag, showInstruction) |
| **FlowTypes.ts** | FlowDomRefs 타입 |
| **core/coordContract.ts** | 상수 SSOT - 수치 변경 시 여기만 수정 |
| **entities/ObstacleManager.ts** | 박스, UFO, 파편 |

## 수치 변경

- **바닥색, 속도, 점프 높이 등**: `core/coordContract.ts`
- **레벨 타이밍**: `DURATIONS`, `DISPLAY_LEVELS` (coordContract)

## 기능 추가

- **오디오**: `FlowAudio.ts`
- **UI 텍스트/스타일**: `FlowUI.ts`
- **장애물 로직**: `ObstacleManager.ts`
