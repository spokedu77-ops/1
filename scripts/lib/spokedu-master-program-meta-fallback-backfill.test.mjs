import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFallbackBackfillPlan,
  normalizeLegacyTags,
  selectLatestOverlays,
} from './spokedu-master-program-meta-fallback-backfill.mjs';

test('normalizes legacy tags while preserving first-seen order', () => {
  assert.deepEqual(
    normalizeLegacyTags([' 협동 ', '', '민첩', '협동', 3]),
    ['협동', '민첩'],
  );
  assert.deepEqual(
    normalizeLegacyTags('["균형", "협응", "균형"]'),
    ['균형', '협응'],
  );
  assert.deepEqual(
    normalizeLegacyTags('균형, 협응 | 민첩'),
    ['균형', '협응', '민첩'],
  );
});

test('selects the latest overlay by updated_at and then id', () => {
  const latest = selectLatestOverlays([
    overlay(29, { id: 10, updated_at: '2026-01-01T00:00:00.000Z' }),
    overlay(29, { id: 11, updated_at: '2026-01-01T00:00:00.000Z' }),
    overlay(128, { id: 20, updated_at: '2026-01-02T00:00:00.000Z' }),
  ]);

  assert.equal(latest.get(29).id, 11);
  assert.equal(latest.get(128).id, 20);
});

test('plans only empty Master meta fields for curricula 29 and 128', () => {
  const plan = buildFallbackBackfillPlan({
    overlayRows: [overlay(29), overlay(128)],
    metaRows: [meta(29), meta(128)],
  });

  assert.equal(plan.ok, true);
  assert.deepEqual(plan.planned.map((item) => item.curriculumId), [29, 128]);
  assert.deepEqual(plan.planned[0].patch, {
    sm_theme: '경쟁형',
    sm_grade: '초등학생 이상',
    sm_tags: ['민첩', '협응'],
  });
});

test('protects matching non-empty Master meta values', () => {
  const plan = buildFallbackBackfillPlan({
    overlayRows: [overlay(29), overlay(128)],
    metaRows: [
      meta(29, {
        sm_theme: '경쟁형',
        sm_grade: '초등학생 이상',
        sm_tags: ['민첩', '협응'],
      }),
      meta(128),
    ],
  });

  assert.equal(plan.ok, true);
  assert.deepEqual(plan.items[0].protectedFields, ['sm_theme', 'sm_grade', 'sm_tags']);
  assert.deepEqual(plan.items[0].patch, {});
  assert.deepEqual(plan.planned.map((item) => item.curriculumId), [128]);
});

test('stops on conflicting non-empty Master meta values', () => {
  const plan = buildFallbackBackfillPlan({
    overlayRows: [overlay(29), overlay(128)],
    metaRows: [
      meta(29, { sm_theme: '다른 테마' }),
      meta(128),
    ],
  });

  assert.equal(plan.ok, false);
  assert.deepEqual(plan.errors.find((item) => item.curriculumId === 29), {
    curriculumId: 29,
    reason: 'meta-conflict',
    field: 'sm_theme',
  });
});

test('stops when a target meta row or legacy source is missing', () => {
  const plan = buildFallbackBackfillPlan({
    overlayRows: [overlay(29, { function_types: [] }), overlay(128)],
    metaRows: [meta(29)],
  });

  assert.equal(plan.ok, false);
  assert.ok(plan.errors.some((item) =>
    item.curriculumId === 29 && item.reason === 'missing-function-types'
  ));
  assert.ok(plan.errors.some((item) =>
    item.curriculumId === 128 && item.reason === 'missing-meta'
  ));
});

test('ignores every curriculum outside the fixed allowlist', () => {
  const plan = buildFallbackBackfillPlan({
    overlayRows: [overlay(29), overlay(128), overlay(52)],
    metaRows: [meta(29), meta(128), meta(52)],
  });

  assert.deepEqual(plan.items.map((item) => item.curriculumId), [29, 128]);
  assert.equal(plan.planned.length, 2);
});

function overlay(curriculumId, overrides = {}) {
  return {
    id: curriculumId,
    source_center_curriculum_id: curriculumId,
    main_theme: '경쟁형',
    group_size: '초등학생 이상',
    function_types: ['민첩', '협응'],
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function meta(curriculumId, overrides = {}) {
  return {
    curriculum_id: curriculumId,
    sm_theme: null,
    sm_grade: null,
    sm_tags: null,
    ...overrides,
  };
}
