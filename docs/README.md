# docs/ — 문서 인덱스

루트 `docs/` 인덱스는 **권한 종류를 구분**합니다. 완료된 분석·제안·레거시 참고는 [`archive/`](archive/) 아래입니다. 이 패스에서는 파일을 옮기지 않습니다.

에이전트 진입점은 루트 [`AGENTS.md`](../AGENTS.md)입니다.

## Canonical

구현·제품 의미의 현재 권한. 코드가 경로를 가리키는 경우도 여기 둡니다.

| 문서 | 용도 |
|------|------|
| [SPOKEDU_MASTER_PRODUCT_CONTRACT.md](SPOKEDU_MASTER_PRODUCT_CONTRACT.md) | MASTER 제품 의미·결정·변경 거버넌스 SSOT |
| [SPOKEDU_PUBLIC_WEBSITE_SSOT.md](SPOKEDU_PUBLIC_WEBSITE_SSOT.md) | 공개 사이트 브랜드·여정·페이지 job SSOT |
| [SPOKEDU_MASTER_SPRINT_BRIEF_TEMPLATE.md](SPOKEDU_MASTER_SPRINT_BRIEF_TEMPLATE.md) | 구현 Sprint Brief 템플릿 |
| [admin-note-notion-contract.md](admin-note-notion-contract.md) | Admin Note 편집·저장 계약 (코드 주석이 참조) |
| [SPOMOVE_OPERATION_LAYER_SSOT.md](SPOMOVE_OPERATION_LAYER_SSOT.md) | SPOMOVE 5축 운영 레이어 (코드가 참조) |

## Supporting

현행이지만 독립 제품/비주얼 SSOT가 아닙니다.

| 문서 | 용도 |
|------|------|
| [SPOKEDU_MASTER_DESIGN_GOVERNANCE.md](SPOKEDU_MASTER_DESIGN_GOVERNANCE.md) | 문서 권한 지도·인벤토리. 제품/비주얼 SSOT 아님 |
| [testing-strategy.md](testing-strategy.md) | Vitest core / legacy / full 스위트 역할 |
| [SPOMOVE_MOVEMENT_PHYSICAL_CONTRACT.md](SPOMOVE_MOVEMENT_PHYSICAL_CONTRACT.md) | Movement Physical 계약. 상위 SSOT는 Operation Layer |

## Operational

| 문서 | 용도 |
|------|------|
| [spokedu-master-commercial-runbook.md](spokedu-master-commercial-runbook.md) | MASTER 상용 운영 runbook |
| [spokedu-master-release-checklist.md](spokedu-master-release-checklist.md) | MASTER 릴리스 체크리스트 |
| [spokedu-master-backup-restore-runbook.md](spokedu-master-backup-restore-runbook.md) | MASTER 백업·복구 runbook |
| [spokedu-launch-checklist.md](spokedu-launch-checklist.md) | 공개 사이트 오픈 체크리스트 |
| [spokedu-live-smoke-test.md](spokedu-live-smoke-test.md) | 공개 라이브 스모크 |
| [spokedu-tv-display-and-remote.md](spokedu-tv-display-and-remote.md) | TV 디스플레이·리모트 |
| [PHASE5_DB_마이그레이션_가이드.md](PHASE5_DB_마이그레이션_가이드.md) | Phase 5 DB 마이그레이션 가이드 |
| [배포_주차_표시_체크리스트.md](배포_주차_표시_체크리스트.md) | 배포 주차 표시 체크리스트 |

## Historical / analysis (docs 루트, 권한 없음)

제품 계약이 baseline을 historical evidence로 명시합니다. audit·분석은 canonical이 아닙니다.

- [SPOKEDU_MASTER_PRODUCT_AUDIT_BASELINE.md](SPOKEDU_MASTER_PRODUCT_AUDIT_BASELINE.md)
- [spokedu-master-commercial-risk-audit.md](spokedu-master-commercial-risk-audit.md)
- [admin_classes_오류분석_및_수업로그.md](admin_classes_오류분석_및_수업로그.md)
- [session_count_logs_analysis.md](session_count_logs_analysis.md)
- [사용자페이지_로딩_왜_느린지.md](사용자페이지_로딩_왜_느린지.md)
- [웜업_챌린지_전체_분석_및_BGM_동기화.md](웜업_챌린지_전체_분석_및_BGM_동기화.md)

SUPERSEDED 포인터 (구링크 호환, 독립 권한 없음): [SPOKEDU_MASTER_PRODUCT_CONSTITUTION.md](SPOKEDU_MASTER_PRODUCT_CONSTITUTION.md), [SPOKEDU_MASTER_PRODUCT_DECISION_PROTOCOL.md](SPOKEDU_MASTER_PRODUCT_DECISION_PROTOCOL.md)

## Supporting domain docs (SPOMOVE / CAMERA)

권한은 위 Canonical/Supporting 표를 따릅니다. 아래는 현행 도메인 작업 문서입니다.

- [SPOMOVE_PHASE0_QA_CHECKLIST.md](SPOMOVE_PHASE0_QA_CHECKLIST.md)
- [SPOMOVE_PHASE_EXECUTION_PLAN.md](SPOMOVE_PHASE_EXECUTION_PLAN.md)
- [SPOMOVE_COMMERCIAL_PRODUCT_PLAN.md](SPOMOVE_COMMERCIAL_PRODUCT_PLAN.md)
- [SPOMOVE_COMMERCIAL_V1_REPORT.md](SPOMOVE_COMMERCIAL_V1_REPORT.md)
- [SPOMOVE_FAMILY_AUDIT.md](SPOMOVE_FAMILY_AUDIT.md)
- [spomove-admin-refactor-89-catalog.md](spomove-admin-refactor-89-catalog.md)
- [CAMERA_APP_DIRECTION.md](CAMERA_APP_DIRECTION.md)
- [CAMERA_CONTENT_PACKS.md](CAMERA_CONTENT_PACKS.md)
- [CAMERA_CONTROLLER_DRAFT.md](CAMERA_CONTROLLER_DRAFT.md)
- [CAMERA_PLAYER_CONTROLLER_CONNECTION.md](CAMERA_PLAYER_CONTROLLER_CONNECTION.md)
- [CAMERA_PLAYER_MODE_QA.md](CAMERA_PLAYER_MODE_QA.md)
- [CAMERA_RESULT_DATA_MODEL.md](CAMERA_RESULT_DATA_MODEL.md)
- [CAMERA_SETTINGS_RESULT_CONTRACT.md](CAMERA_SETTINGS_RESULT_CONTRACT.md)
- [CAMERA_STEP10_PARTICIPANTS.md](CAMERA_STEP10_PARTICIPANTS.md)

### 템플릿·도구

- [GENERATOR_CUSTOMIZATION_GUIDE.md](GENERATOR_CUSTOMIZATION_GUIDE.md)
- [programs-144-template.csv](programs-144-template.csv)
- [screenplay-72-template.csv](screenplay-72-template.csv)

## Generated (재생성 가능, gitignore)

- `docs/*.generated.csv` — 예: `npm run audit:spomove-family` → `spomove-family-audit.generated.csv`

## Archive — 참고용 (앱 런타임 무관)

| 폴더 | 내용 |
|------|------|
| [archive/flow/](archive/flow/) | FLOW/LeadEngine 시절 분석·실행계획 (~9) |
| [archive/iiwarmup/](archive/iiwarmup/) | IIWARMUP UI/스튜디오 분석·제안 (~7) |
| [archive/admin-refactor/](archive/admin-refactor/) | Admin 전체 리팩터링·일회성 점검 보고 (~9) |
| [archive/dive/](archive/dive/) | DIVE/FLOW 통합 audit (~2) |
| [archive/spokedu-landing/](archive/spokedu-landing/) | 홈 랜딩 signoff·사진 가이드 (~4, 구 `app/spokedu/docs/`) |

## 레포 정리 (sql / scripts / public)

| 경로 | 내용 |
|------|------|
| [`sql/README.md`](../sql/README.md) | migrations 정본 안내, `archive/legacy/` |
| [`scripts/README.md`](../scripts/README.md) | npm QA 스크립트 vs `archive/one-off/` |
| [`commercial-verification/`](../commercial-verification/) | MASTER QA JSON 출력 (gitignore) |
| `public/info/` | **dispatch 전용** (`dispatch.html`, `css/dispatch.css`, `js/dispatch.js`) |

로컬만 지워도 되는 폴더 (gitignore): `.next/`, `node_modules/`, `.qa-spokedu*`, `qa-artifacts/`, `qa-screenshots/`, `/tmp/`

## 기타 문서 위치

- `app/spokedu-master/docs/` — MASTER QA
- `app/move-report/docs/` — MOVE 리포트

## 3차 예정 (미착수)

- `app/info/dispatch` React 이전 (iframe 제거)
