# flow-lab — 운영 DIVE 실험용 복제본

## 개요

이 폴더는 `../flow/`(운영 DIVE)의 **실험용 독립 복제본**입니다.  
운영 경로에서 사용하지 않습니다.

## 원칙

| 항목 | 상태 |
|------|------|
| 운영 원본 | `../flow/` — 절대 변경하지 않음 |
| 테스트 전용 URL | `/admin/spomove/training/flow-lab` |
| MemoryGameApp 연결 | 없음 |
| EngineRouter 연결 | 없음 |
| officialSpomovePresets 연결 | 없음 |
| 운영 import 전환 | 별도 검증·승인 후에만 |

## 현재 상태

운영 DIVE와 동작이 동일한 복제본.  
리팩터링은 이 폴더에서만 진행합니다.

## 향후 작업 순서 (flow-lab 전용)

1. 동작 동일성 자동 테스트
2. 카메라 로직 분리
3. 브리지 렌더러 분리
4. 우주 환경 분리
5. 속도 VFX 분리
6. 펀치 VFX 분리
7. 포스트 프로세싱 추가
8. GLB 모델 적용
9. 운영본과 비교 검증
10. 별도 승인 후 운영 import 전환

## 파일 구조

```
flow-lab/
├── FlowGameClient.tsx          # React 클라이언트 (복제본)
├── README.md                   # 이 파일
├── engine/
│   ├── FlowEngine.ts           # 메인 엔진 (복제본)
│   ├── FlowAudio.ts            # 오디오 (복제본)
│   ├── AdaptiveQuality.ts      # 품질 조절 (복제본)
│   ├── entities/
│   │   └── ObstacleManager.ts  # 장애물 (복제본)
│   └── modules/
│       ├── flowModules.ts      # 모듈 정의 (복제본)
│       ├── flowObstacleSchedule.ts
│       └── stageBuilder.ts     # 스테이지 빌더 (복제본)
└── visuals/
    └── LegacyPanoramaShader.ts # IIWarmup 파노라마 셰이더 (미연결, 참고용)
```
