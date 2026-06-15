export const TARGET_CURRICULUM_IDS = Object.freeze([29, 128]);

export function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeLegacyTags(value) {
  let candidates = [];

  if (Array.isArray(value)) {
    candidates = value;
  } else if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      candidates = Array.isArray(parsed) ? parsed : text.split(/[,|/·\n]+/);
    } catch {
      candidates = text.split(/[,|/·\n]+/);
    }
  }

  const seen = new Set();
  const normalized = [];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const tag = candidate.trim();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    normalized.push(tag);
  }
  return normalized;
}

export function selectLatestOverlays(rows) {
  const latestByCurriculumId = new Map();

  for (const row of rows) {
    const curriculumId = row.source_center_curriculum_id;
    if (!TARGET_CURRICULUM_IDS.includes(curriculumId)) continue;

    const previous = latestByCurriculumId.get(curriculumId);
    if (!previous || compareOverlayRows(row, previous) > 0) {
      latestByCurriculumId.set(curriculumId, row);
    }
  }

  return latestByCurriculumId;
}

export function buildFallbackBackfillPlan({ overlayRows, metaRows }) {
  const latestOverlayByCurriculumId = selectLatestOverlays(overlayRows);
  const metaRowsByCurriculumId = groupMetaRows(metaRows);
  const items = [];
  const errors = [];

  for (const curriculumId of TARGET_CURRICULUM_IDS) {
    const overlay = latestOverlayByCurriculumId.get(curriculumId) ?? null;
    const connectedMetaRows = metaRowsByCurriculumId.get(curriculumId) ?? [];
    const meta = connectedMetaRows[0] ?? null;

    if (!overlay) errors.push({ curriculumId, reason: 'missing-overlay' });
    if (connectedMetaRows.length === 0) errors.push({ curriculumId, reason: 'missing-meta' });
    if (connectedMetaRows.length > 1) errors.push({ curriculumId, reason: 'duplicate-meta' });

    const legacy = {
      theme: normalizeText(overlay?.main_theme),
      grade: normalizeText(overlay?.group_size),
      tags: normalizeLegacyTags(overlay?.function_types),
    };
    if (!legacy.theme) errors.push({ curriculumId, reason: 'missing-main-theme' });
    if (!legacy.grade) errors.push({ curriculumId, reason: 'missing-group-size' });
    if (legacy.tags.length === 0) errors.push({ curriculumId, reason: 'missing-function-types' });

    const current = {
      theme: normalizeText(meta?.sm_theme),
      grade: normalizeText(meta?.sm_grade),
      tags: normalizeLegacyTags(meta?.sm_tags),
    };
    const patch = {};
    const protectedFields = [];
    const conflicts = [];

    compareTextField({
      field: 'sm_theme',
      current: current.theme,
      legacy: legacy.theme,
      patch,
      protectedFields,
      conflicts,
    });
    compareTextField({
      field: 'sm_grade',
      current: current.grade,
      legacy: legacy.grade,
      patch,
      protectedFields,
      conflicts,
    });
    compareTagsField({
      current: current.tags,
      legacy: legacy.tags,
      patch,
      protectedFields,
      conflicts,
    });

    for (const field of conflicts) {
      errors.push({ curriculumId, reason: 'meta-conflict', field });
    }

    items.push({
      curriculumId,
      overlayId: overlay?.id ?? null,
      legacy,
      current,
      patch,
      protectedFields,
      conflicts,
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    items,
    planned: items.filter((item) => Object.keys(item.patch).length > 0),
  };
}

function compareOverlayRows(left, right) {
  const leftTime = left.updated_at ? Date.parse(left.updated_at) : 0;
  const rightTime = right.updated_at ? Date.parse(right.updated_at) : 0;
  if (leftTime !== rightTime) return leftTime - rightTime;
  return Number(left.id ?? 0) - Number(right.id ?? 0);
}

function groupMetaRows(rows) {
  const grouped = new Map();
  for (const row of rows) {
    if (!TARGET_CURRICULUM_IDS.includes(row.curriculum_id)) continue;
    const values = grouped.get(row.curriculum_id) ?? [];
    values.push(row);
    grouped.set(row.curriculum_id, values);
  }
  return grouped;
}

function compareTextField({
  field,
  current,
  legacy,
  patch,
  protectedFields,
  conflicts,
}) {
  if (!current) {
    if (legacy) patch[field] = legacy;
    return;
  }
  protectedFields.push(field);
  if (current !== legacy) conflicts.push(field);
}

function compareTagsField({
  current,
  legacy,
  patch,
  protectedFields,
  conflicts,
}) {
  if (current.length === 0) {
    if (legacy.length > 0) patch.sm_tags = legacy;
    return;
  }
  protectedFields.push('sm_tags');
  if (!sameStringArray(current, legacy)) conflicts.push('sm_tags');
}

function sameStringArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
