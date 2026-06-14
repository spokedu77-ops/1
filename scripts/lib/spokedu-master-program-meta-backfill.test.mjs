import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildBackfillPlan,
  extractExactSection,
  selectLatestOverlays,
} from './spokedu-master-program-meta-backfill.mjs';

test('extracts only the exact briefing section', () => {
  const result = extractExactSection(
    '[사전 교육]\n 첫 번째 \n\n두 번째\n[안전 포인트]\n제외',
    '사전 교육',
  );
  assert.equal(result.exists, true);
  assert.equal(result.value, '첫 번째\n두 번째');
});

test('extracts only the exact variation section from mixed sections', () => {
  const result = extractExactSection(
    '[응용 방법]\n제외\n[변형 방법]\n변형 1\n변형 2\n[운영 팁]\n제외',
    '변형 방법',
  );
  assert.equal(result.value, '변형 1\n변형 2');
});

test('does not treat unlabeled activity_tip as variation', () => {
  const plan = fixturePlan({ activityTip: '라벨 없는 기존 내용' });
  assert.equal(plan.variation.labelFreeRows, 1);
  assert.equal(plan.variation.plannedRows, 0);
});

test('protects existing meta values', () => {
  const plan = fixturePlan({
    checklist: '[사전 교육]\n신규 값',
    activityTip: '[변형 방법]\n신규 변형',
    meta: {
      curriculum_id: 1,
      sm_briefing_notes: '기존 값',
      sm_variation_method: '기존 변형',
    },
  });
  assert.equal(plan.briefing.existingMetaRows, 1);
  assert.equal(plan.variation.existingMetaRows, 1);
  assert.equal(plan.planned.length, 0);
  assert.equal(plan.conflicts.differingMetaValues, 2);
});

test('uses updated_at and id as deterministic latest-row tie break', () => {
  const selected = selectLatestOverlays([
    overlay({ id: 10, updated_at: '2026-01-01T00:00:00.000Z' }),
    overlay({ id: 11, updated_at: '2026-01-01T00:00:00.000Z' }),
  ]);
  assert.equal(selected.latestByCurriculumId.get(1).id, 11);
  assert.deepEqual(selected.duplicateCurriculumIds, [1]);
});

test('reports empty exact sections without planning a write', () => {
  const plan = fixturePlan({
    checklist: '[사전 교육]\n\n[안전 포인트]\n제외',
    activityTip: '[변형 방법]\n\n[응용 방법]\n제외',
  });
  assert.equal(plan.briefing.emptySectionRows, 1);
  assert.equal(plan.variation.emptySectionRows, 1);
  assert.equal(plan.planned.length, 0);
});

test('excludes deprecated-only sections', () => {
  const plan = fixturePlan({
    activityTip: '[응용 방법]\n제외\n[난이도 낮추기]\n제외',
  });
  assert.equal(plan.variation.otherSectionsOnlyRows, 1);
  assert.equal(plan.variation.plannedRows, 0);
  assert.equal(plan.variation.excludedRows, 1);
});

test('dry-run fixture plans both fields without mutating inputs', () => {
  const overlays = [
    overlay({
      checklist: '[사전 교육]\n준비 1',
      activity_tip: '[변형 방법]\n변형 1',
    }),
  ];
  const snapshot = structuredClone(overlays);
  const plan = buildBackfillPlan({
    overlayRows: overlays,
    metaRows: [{ curriculum_id: 1, sm_briefing_notes: null, sm_variation_method: '' }],
    curriculumIds: [1],
  });
  assert.deepEqual(overlays, snapshot);
  assert.deepEqual(plan.planned, [{
    curriculumId: 1,
    metaExists: true,
    patch: {
      sm_briefing_notes: '준비 1',
      sm_variation_method: '변형 1',
    },
  }]);
});

function fixturePlan({
  checklist = null,
  activityTip = null,
  meta = { curriculum_id: 1, sm_briefing_notes: null, sm_variation_method: null },
} = {}) {
  return buildBackfillPlan({
    overlayRows: [overlay({ checklist, activity_tip: activityTip })],
    metaRows: [meta],
    curriculumIds: [1],
  });
}

function overlay(overrides = {}) {
  return {
    id: 1,
    source_center_curriculum_id: 1,
    checklist: null,
    activity_tip: null,
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}
