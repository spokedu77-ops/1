# docs/ — 문서 인덱스

루트 `docs/`에는 **현행 SSOT·운영 문서**만 둡니다.  
완료된 분석·제안·레거시 참고는 [`archive/`](archive/) 아래로 옮겨 두었습니다.

## Active — SSOT (경로 고정, 이동 금지)

코드·contract test가 아래 경로를 직접 참조합니다.

| 문서 | 용도 |
|------|------|
| [admin-note-notion-contract.md](admin-note-notion-contract.md) | Admin Note 편집·저장 계약 |
| [SPOMOVE_OPERATION_LAYER_SSOT.md](SPOMOVE_OPERATION_LAYER_SSOT.md) | SPOMOVE 5축 운영 레이어 SSOT |
| [SPOMOVE_MOVEMENT_PHYSICAL_CONTRACT.md](SPOMOVE_MOVEMENT_PHYSICAL_CONTRACT.md) | Movement Physical Contract |
| [spokedu-master-commercial-runbook.md](spokedu-master-commercial-runbook.md) | MASTER 상용 운영 runbook |
| [spokedu-master-commercial-risk-audit.md](spokedu-master-commercial-risk-audit.md) | MASTER 상용 리스크 audit |
| [spokedu-master-release-checklist.md](spokedu-master-release-checklist.md) | MASTER 릴리스 체크리스트 |
| [spokedu-master-backup-restore-runbook.md](spokedu-master-backup-restore-runbook.md) | MASTER 백업·복구 runbook |
| [admin_classes_오류분석_및_수업로그.md](admin_classes_오류분석_및_수업로그.md) | 수업 관리·session_count_logs |

## Active — 운영·제품

### SPOMOVE / CAMERA

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

### SPOKEDU / MASTER / 배포

#### Product Foundation (SSOT — implementation 전 반드시 참조)

| 문서 | 용도 |
|------|------|
| [SPOKEDU_MASTER_PRODUCT_CONSTITUTION.md](SPOKEDU_MASTER_PRODUCT_CONSTITUTION.md) | 제품 North Star, 가치 루프, Product Truth, 계약 위계 |
| [SPOKEDU_MASTER_PRODUCT_DECISION_PROTOCOL.md](SPOKEDU_MASTER_PRODUCT_DECISION_PROTOCOL.md) | Audit → Decision Gate → Implementation, REPLACE/REMOVE 승인 경계 |
| [SPOKEDU_MASTER_PRODUCT_AUDIT_BASELINE.md](SPOKEDU_MASTER_PRODUCT_AUDIT_BASELINE.md) | 현재 MASTER surface·journey·roadmap baseline |
| [SPOKEDU_MASTER_SPRINT_BRIEF_TEMPLATE.md](SPOKEDU_MASTER_SPRINT_BRIEF_TEMPLATE.md) | 구현 Sprint Brief 템플릿 |

- [spokedu-launch-checklist.md](spokedu-launch-checklist.md)
- [spokedu-live-smoke-test.md](spokedu-live-smoke-test.md)
- [spokedu-tv-display-and-remote.md](spokedu-tv-display-and-remote.md)
- [PHASE5_DB_마이그레이션_가이드.md](PHASE5_DB_마이그레이션_가이드.md)
- [배포_주차_표시_체크리스트.md](배포_주차_표시_체크리스트.md)
- [session_count_logs_analysis.md](session_count_logs_analysis.md)
- [사용자페이지_로딩_왜_느린지.md](사용자페이지_로딩_왜_느린지.md)
- [웜업_챌린지_전체_분석_및_BGM_동기화.md](웜업_챌린지_전체_분석_및_BGM_동기화.md)

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
