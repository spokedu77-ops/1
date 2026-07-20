# SPOMOVE Product Contract

## 제품 정의

스포매트 한 장으로 색·위치 자극을 손·발·균형·자세 동작에 연결하고, 같은 화면 활동을 여러 체육수업으로 확장하는 시스템.

## 두 원칙

1. 기존 Engine과 프로그램 자극은 보존한다.
2. 카탈로그·설정·가이드·기록에서는 움직임의 깊이를 적극적으로 제품화한다.

## 표면별 역할

| 표면 | 역할 |
| --- | --- |
| Hub | 어떤 수업을 만들 수 있는지 보여줌 |
| 설정 | 오늘 사용할 움직임·속도·난이도 선택 |
| 가이드 | 지도법·변형·안전 제공 |
| Running | 화면 자극에 집중 (Engine only) |
| 결과 | 실제 사용 설정 기록 |
| Recent | 같은 설정 재실행 |
| 수업세트 | 여러 활동을 수업 단위로 구성 (P0 이후) |

## 변경 금지 (P0 이전·중)

- 움직임별 프리셋 복제
- 실행 중 지속 HUD
- 한 색 칸에 양발 점프 기본 안내
- 교사가 알아서 변형하도록 방치
- 센서 없이 성공률·정확도 표시
- 단일 매트 완성 전 다중 매트 선행 개발

## selectionMode UI 계약

| selectionMode | 설정 화면 |
| --- | --- |
| selectable | 전체 Movement Configurator |
| fixed | 선택기 없이 고정 동작 요약 표시 |
| disabled | 일반 움직임 블록 미표시, 필요하면 Built-in 안내만 |

## 설정 state 계약

- URL `movement`/`limb`는 세션을 열 때 전달된 **초기 입력**이다.
- Configurator 변경은 `movementPick` 세션 state + Family 저장값에 반영한다.
- Configurator 조작마다 `router.replace`로 URL을 갱신하지 않는다.
- 결과·Recent에는 **실행된** state를 기록한다.

## MovementConfigurator 기술 경계

Configurator는 Controlled Component다. 내부에서 하지 않는다.

- Resolver 실행
- localStorage 읽기·쓰기
- URL 변경
- Recent / UsageEvent 기록
- Family·Profile 추론

## PR 게이트 질문

이 변경이 같은 화면을 더 다양한 체육수업으로 만드는가?

## P0 범위 vs 이후

**현재 P0 (Sprint 1~5)**

- Movement Configurator
- 가이드 교육 콘텐츠
- Family 카탈로그 1차
- 결과·Recent·설정 저장
- Release Gate

**이후**

- Target Adapter·안전한 점프
- Movement Script
- 수업 방식·수업세트
- 다중 매트

## Sprint 1 비범위

- Family 카탈로그 통합, Hub 헤더/필터/검색 재설계
- 가이드 교육 콘텐츠 대량 보강 (추천 이유 장문·변형 풀세트·영상)
- 결과·Recent “변형해서 실행”, 설정 조합 저장
- 서버 Flag / UsageEvent / Release Gate
- EngineRouter·Target Adapter·점프·Script·다중 매트

Sprint 1 완료 선언: **움직임 기반 제품 구조의 설정 표면이 완성됐다.**  
P0 완성·가이드 완성·Engine이 움직임에 따라 변함을 의미하지 않는다.
