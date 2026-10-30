# Working tree publication — 2026-10-31

사용자 승인: 전체 작업 트리 정리 및 주제별 commit/push. 이 문서는 게시 범위 기록이며 제품 계약이나 운영 배포 승인이 아니다.

- 대상: `spokedu77-ops/1`, `origin/main`. 시작 HEAD: `61a3b74657ee42ea4a6694baeb09e10c83b25629`.
- 로컬 전체 검증: 3,212 PASS / 2 SKIP / 실패 0, TypeScript·Production Build PASS, SPOMOVE 관련 변경 파일 ESLint 47개 오류·경고 0. 게시 직전 app 변경 76개가 해당 검증 복사본과 바이트 일치함을 확인했다. 이번 정리에서는 제품 코드를 수정하지 않는다.
- 교구 원장의 운영 cutover 미검증/보류 항목은 기존 QA 보고서대로 유지한다. SQL을 커밋하는 것은 DB 실행 승인이 아니다.
- 원본 SPOMOVE 증거 2,412개(약 42MB), 센터/LAB 캡처·생성 diff·로그, 중복 임시 SQL은 삭제 없이 로컬에 보존하고 추적에서 제외한다. 기존에 추적 중인 감사 증거는 제거하지 않는다. 보고서의 `.spomove-*` 및 캡처·생성 diff 링크는 해당 로컬 증거를 가리키며 원격 저장소에는 포함하지 않는다.
- 게시 후보의 secret-shaped literal 검사 결과 비밀키·개인키·실제 JWT 검출 0. 로컬 재현용 테스트 계정/비밀번호는 fixture로 유지한다.
- DB 변경·마이그레이션 실행·배포 명령은 수행하지 않는다. push 이후 자동화는 저장소 설정을 따른다.

## 주제별 정확한 파일 범위

### 로컬 산출물 정리 (2개)

커밋: `chore(workspace): keep local verification artifacts out of version control`

- `.gitignore`
- `docs/operations/WORKTREE_PUBLISH_20261031.md`

### 교구 원장·레거시 전환 (41개)

커밋: `fix(equipment): harden opening balances and legacy write cutover`

- `app/admin/inventory/EquipmentInventoryApp.tsx`
- `app/admin/inventory/LegacyInventoryClient.tsx`
- `app/admin/inventory/page.tsx`
- `app/api/admin/equipment/opening/route.ts`
- `app/api/admin/equipment/stock/route.ts`
- `app/api/teacher/equipment/holdings/route.ts`
- `app/lib/equipment/fetchStock.ts`
- `app/lib/equipment/rpcMap.ts`
- `app/lib/equipment/types.ts`
- `app/lib/equipment/writeMode.test.ts`
- `app/lib/equipment/writeMode.ts`
- `app/teacher/inventory/page.tsx`
- `docs/equipment-inventory/EQUIPMENT_STAGE15_DB_INTEGRATION_RESULTS.json`
- `docs/equipment-inventory/EQUIPMENT_STAGE15_VERIFICATION_REPORT.md`
- `docs/equipment-inventory/EQUIPMENT_STAGE29_E2E_RESULTS.json`
- `docs/equipment-inventory/EQUIPMENT_STAGE29_FINAL_E2E_REPORT.md`
- `docs/equipment-inventory/EQUIPMENT_STAGE2_FINAL_QA_REPORT.md`
- `docs/equipment-inventory/EQUIPMENT_STAGE2_INTEGRATION_RESULTS.json`
- `docs/equipment-inventory/EQUIPMENT_STAGE2_LEGACY_CUTOVER_RESULTS.json`
- `docs/equipment-inventory/EQUIPMENT_STAGE2_LIVE_AUTH_RESULTS.json`
- `docs/equipment-inventory/EQUIPMENT_STAGE2_ROLLBACK_CACHE_RESULTS.json`
- `docs/equipment-inventory/EQUIPMENT_STAGE2_VERIFICATION_REPORT.md`
- `docs/equipment-inventory/stage15_db_integration.mjs`
- `docs/equipment-inventory/stage15_test_bootstrap.sql`
- `docs/equipment-inventory/stage29_full_e2e.mjs`
- `docs/equipment-inventory/stage29_teacher_access_bootstrap.sql`
- `docs/equipment-inventory/stage2_integration.mjs`
- `docs/equipment-inventory/stage2_legacy_cutover_e2e.mjs`
- `docs/equipment-inventory/stage2_live_auth_e2e.mjs`
- `docs/equipment-inventory/stage2_opening_classify.mjs`
- `docs/equipment-inventory/stage2_rls_bootstrap.sql`
- `docs/equipment-inventory/stage2_rls_policies.sql`
- `docs/equipment-inventory/stage2_rls_post_expand.sql`
- `docs/equipment-inventory/stage2_rollback_and_cache.mjs`
- `docs/equipment-inventory/stage2_scale_fixture.sql`
- `docs/equipment-inventory/stage2_supabase_minimal_apply.sql`
- `supabase/migrations/20261030110000_equipment_legacy_tables_baseline.sql`
- `supabase/migrations/20261030120000_equipment_ledger_expand.sql`
- `supabase/migrations/20261030130000_fix_legacy_gate_jwt_bypass.sql`
- `supabase/migrations/20261030200000_equipment_legacy_write_gate.sql`
- `supabase/migrations/20261030210000_equipment_cache_drift_detect.sql`

### 센터 정산 연결·강사료 표시 (12개)

커밋: `feat(centers): add guarded settlement links and teacher fee previews`

- `app/admin/centers/[id]/CenterDetailClient.tsx`
- `app/admin/centers/centers.integration.test.ts`
- `app/admin/centers/components/CenterSettlementPanel.tsx`
- `app/admin/centers/components/CenterTeacherFees.tsx`
- `app/api/admin/settlement-sheet/route.test.ts`
- `app/api/admin/settlement-sheet/route.ts`
- `app/lib/centers/teacherFeePreview.test.ts`
- `app/lib/centers/teacherFeePreview.ts`
- `docs/center-settlement/STAGE1_LOCAL_IMPLEMENTATION_REPORT.md`
- `docs/center-settlement/stage1/preservation-evidence.json`
- `docs/center-settlement/stage1/rendered-qa-results.json`
- `scripts/qa-center-settlement-stage1.mjs`

### 읽기 전용 정산 LAB (16개)

커밋: `feat(reports): add an isolated read-only settlement lab`

- `app/admin/master/reports-lab/LabSettlementSheet.tsx`
- `app/admin/master/reports-lab/SettlementLab.tsx`
- `app/admin/master/reports-lab/labTransport.test.ts`
- `app/admin/master/reports-lab/labTransport.ts`
- `app/admin/master/reports-lab/page.tsx`
- `app/admin/master/reports/ReportVersionNav.tsx`
- `app/admin/master/reports/page.tsx`
- `app/api/admin/settlement-lab/route.test.ts`
- `app/api/admin/settlement-lab/route.ts`
- `docs/center-settlement/REPORTS_LAB_FINAL_RELEASE_GATE.md`
- `docs/center-settlement/REPORTS_LAB_IMPLEMENTATION_REPORT.md`
- `docs/center-settlement/reports-lab/center-rendered-qa.json`
- `docs/center-settlement/reports-lab/lab-rendered-qa.json`
- `docs/center-settlement/reports-lab/production-server-boundary.json`
- `docs/center-settlement/reports-lab/verification-summary.json`
- `scripts/qa-reports-lab.mjs`

### SPOMOVE 실행·종료·준비 안정화 (36개)

커밋: `fix(spomove): stabilize training volume lifecycle and asset readiness`

- `app/admin/spomove/training/_player/MemoryGameApp.tsx`
- `app/admin/spomove/training/_player/components/ColorGatePoseAppendix.tsx`
- `app/admin/spomove/training/_player/components/GoalkeeperReactionTraining.test.ts`
- `app/admin/spomove/training/_player/components/GoalkeeperReactionTraining.tsx`
- `app/admin/spomove/training/_player/components/SpomoveCatalogHero.tsx`
- `app/admin/spomove/training/_player/components/TrainingResultScreen.tsx`
- `app/admin/spomove/training/_player/components/TrainingRunErrorBoundary.tsx`
- `app/admin/spomove/training/_player/components/VariantAppendixFullscreen.tsx`
- `app/admin/spomove/training/_player/components/VisualReactionTraining.terminal.test.ts`
- `app/admin/spomove/training/_player/components/VisualReactionTraining.tsx`
- `app/admin/spomove/training/_player/hooks/useSpomoveVariantFruitSlidesForTraining.ts`
- `app/admin/spomove/training/_player/lib/fullscreen.ts`
- `app/admin/spomove/training/_player/lib/lockViewportScroll.test.ts`
- `app/admin/spomove/training/_player/lib/lockViewportScroll.ts`
- `app/admin/spomove/training/_player/lib/playerIsolation.test.ts`
- `app/admin/spomove/training/_player/lib/preloadVariantFruitImages.ts`
- `app/admin/spomove/training/_player/lib/roundNormalization.test.ts`
- `app/admin/spomove/training/_player/lib/roundNormalization.ts`
- `app/admin/spomove/training/_player/lib/runtimeClock.test.ts`
- `app/admin/spomove/training/_player/lib/runtimeClock.ts`
- `app/admin/spomove/training/_player/lib/scopePlayerCss.ts`
- `app/admin/spomove/training/_player/lib/trainingCompletion.test.ts`
- `app/admin/spomove/training/_player/lib/trainingResultSummary.ts`
- `app/admin/spomove/training/_player/lib/variantImageValidation.test.ts`
- `app/admin/spomove/training/_player/styles.ts`
- `app/admin/spomove/training/page.tsx`
- `app/api/spokedu-master/programs/programGetValidation.test.ts`
- `app/lib/admin/hooks/useSpomoveDiveEnvironments.ts`
- `app/lib/admin/hooks/useSpomoveTrainingBGM.ts`
- `app/lib/spomove/generated/spomoveGuideSourceDigests.generated.ts`
- `app/lib/spomove/spomoveAssetPackIds.ts`
- `app/spokedu-master/spomove/session/EngineRouter.tsx`
- `app/spokedu-master/spomove/session/page.tsx`
- `app/teacher/spomove/page.tsx`
- `public/images/spokedu/brand/spomat-diamond-cutout.png`
- `public/images/spokedu/brand/spomat-square-cutout.png`

### SPOMOVE 관리자 범위·Teacher 등록 확인 (14개)

커밋: `fix(auth): enforce scoped SPOMOVE administration and teacher registration`

- `app/api/admin/spokedu-master/spomove/home-featured/route.ts`
- `app/api/admin/spokedu-master/spomove/hub-family-featured/route.ts`
- `app/api/admin/storage/delete/route.ts`
- `app/api/admin/storage/signed-upload/route.ts`
- `app/api/admin/storage/upload/route.ts`
- `app/api/admin/think-asset-pack/route.ts`
- `app/api/auth/check-admin/route.ts`
- `app/lib/auth/platformAdminIdentity.ts`
- `app/lib/server/adminAuth.ts`
- `app/lib/server/spomoveAdminScope.test.ts`
- `app/lib/server/spomoveAdminScope.ts`
- `app/lib/server/teacherAuth.ts`
- `app/lib/server/teacherRegistrationAccess.test.ts`
- `docs/SPOKEDU_MASTER_PRODUCT_CONTRACT.md`

### SPOMOVE 감사·검증 보고 (5개)

커밋: `docs(spomove): record stage 3 fixes and verification results`

- `SPOMOVE_STAGE3_GATE_A_FINAL_20261030.md`
- `SPOMOVE_STAGE3_GATE_B_REPORT_20261030.md`
- `SPOMOVE_STAGE3_GATE_C_REPORT.md`
- `SPOMOVE_STAGE3_LATEST_REVIEW_20261030.md`
- `SPOMOVE_STAGE3_REMAINING_FIXES_REPORT.md`

### R01 staging 검증 초안 (1개)

커밋: `docs(security): add a guarded R01 staging validation draft`

- `docs/sql-drafts/r01_staging_validation_bundle.sql`
