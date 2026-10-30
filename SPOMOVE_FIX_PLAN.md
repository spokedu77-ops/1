# SPOMOVE 별도 수정 계획 — 승인 대기

Stage 2 감사와 분리된 제안이다. **FIX_NOT_STARTED / PRODUCT OWNER APPROVAL PENDING**. 이 문서는 구현·commit·push·배포 승인이 아니다.

감사: [Stage 2 보고서](SPOMOVE_FORENSIC_AUDIT_STAGE2.md). 기존 F01~F15는 [원본 보고서](SPOMOVE_FORENSIC_AUDIT.md)에 유지한다.

| 순서 | 대상 | 최소 수정 후보 | 수용 조건 / 회귀 위험 |
|---|---|---|---|
| 1 | F17 빌드 차단 | Next page의 금지된 추가 export와 재사용 컴포넌트 경계를 정리 | Next production build의 생성된 page 타입 검사 통과. CMS 기능·권한·저장 경로 보존 |
| 1 | F19 골키퍼 완료 | 횟수 모드의 스폰 종료를 고정 60초 제한과 분리 | 10/15/20/30회 × 1~6초 및 보너스 유무의 실제 완료. 시간 모드·중도 종료·보너스 순서 유지 |
| 1 | F18 공개 반복 횟수 | Setup의 합법적인 선택값을 엔진에 그대로 전달하도록 정규화·카운터 계약 정합 | 흰 공 찾기 10/15/20/30 선택값과 실행·결과·retry·recent 일치. 기존 내부/보류 활동과 저장값 호환 |
| 1 | F02 종료 사유 | child→공통 player→Teacher/Admin result에 terminal reason 보존 | 정상/중도/취소/오류가 데이터와 문구 모두 구분. MASTER의 이미 정상인 경로 보존 |
| 1 | F03/F04/F11 잠금 | 획득별 소유권 release와 이전 inline 스타일 복원 | 3회 retry, 이탈, 정상 완료, 중첩 모달, StrictMode 후 원상 복원. 다른 overlay 잠금 손상 금지 |
| 1 | F16 빈 이미지 팩 | autoLaunch에도 readiness 확인·실패 안내·안전한 이탈 적용 | 빈/실패/부분 팩에서 무기한 Get ready 금지. 정상 팩의 자극·설정 의미 유지 |
| 2 | F01 pause clock | 노출될 pause의 제품 계약을 먼저 확정한 뒤 active clock/예약 정책 정리 | 현재 사용자 진입 경로가 확인되지 않은 latent 결함. interval·Flow·Unity·오디오의 시간 기준 회귀 주의 |
| 2 | F05/F06/F10/F14 UI/CSS | 선택 상태에 독립적인 목록 역할, CSS 범위, 표시 ID, hit area 정리 | 실제 Next의 populated desktop/mobile 비교. 원래 엔진·legacy ID 의미 보존 |
| 2 | F07/F08/F09/F15 전달·문구·수명 | 필드 매핑, 승인된 TTS 원문, fullscreen promise, 예약 음성 cleanup | 독립 시간 필드 계약 확인. iPad gesture·오디오 활성화·다음 세션 음성 보존 |
| 별도 결정 | F12 권한 scope | SPOMOVE 계정이 전체 관리자 또는 제한 관리자인지 결정 | 보안 정책 승인 전 권한을 임의로 축소·확대하지 않음. mock read/write 거부 테스트를 먼저 정의 |
| 별도 결정 | F13 users 행 부재 | 미등록 로그인 계정의 Teacher 자료 접근 정책 결정 | 사용자 존재·역할 요구사항 승인. 신규 계정 onboarding·기관 차단 회귀 검증 |

각 묶음은 수정 파일·원인·목표 동작·targeted test·실제 화면 증거를 갖춘 별도 승인 범위로 진행한다. 전역 리팩토링 또는 스키마 변경을 묶어 승인받은 것으로 취급하지 않는다.

수정 후에는 Stage 2에서 완료되지 않은 공식 프리셋·실제 Next 시각 QA·Firefox/WebKit·실기기·오디오·장시간 GPU/메모리를 재검증한다. 가상 시계 또는 mock의 PASS를 실제 기기 PASS로 바꾸지 않는다.

Git stage/commit/push, 브랜치 생성, DB 변경, 배포는 각각 명시적인 사용자 지시가 있어야 수행한다.
