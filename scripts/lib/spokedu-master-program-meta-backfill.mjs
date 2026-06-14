const SECTION_LABEL = /^\[([^\]]+)\]$/;

export function normalizeText(value) {
  return String(value ?? '').trim();
}

export function parseSections(source) {
  const sections = new Map();
  let currentLabel = null;

  for (const rawLine of String(source ?? '').split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = line.match(SECTION_LABEL);
    if (match) {
      currentLabel = match[1].trim();
      if (!sections.has(currentLabel)) sections.set(currentLabel, []);
      continue;
    }
    if (currentLabel && line) sections.get(currentLabel).push(line);
  }

  return sections;
}

export function extractExactSection(source, label) {
  const sections = parseSections(source);
  return {
    exists: sections.has(label),
    value: (sections.get(label) ?? []).join('\n'),
    labels: [...sections.keys()],
  };
}

export function selectLatestOverlays(rows) {
  const latestByCurriculumId = new Map();
  const countsByCurriculumId = new Map();
  const nullCurriculumRows = [];

  for (const row of rows) {
    const curriculumId = row.source_center_curriculum_id;
    if (curriculumId == null) {
      nullCurriculumRows.push(row);
      continue;
    }

    countsByCurriculumId.set(curriculumId, (countsByCurriculumId.get(curriculumId) ?? 0) + 1);
    const previous = latestByCurriculumId.get(curriculumId);
    if (!previous || compareOverlayRows(row, previous) > 0) {
      latestByCurriculumId.set(curriculumId, row);
    }
  }

  return {
    latestByCurriculumId,
    duplicateCurriculumIds: [...countsByCurriculumId.entries()]
      .filter(([, count]) => count > 1)
      .map(([curriculumId]) => curriculumId)
      .sort((a, b) => a - b),
    nullCurriculumRows,
  };
}

function compareOverlayRows(left, right) {
  const leftTime = left.updated_at ? Date.parse(left.updated_at) : 0;
  const rightTime = right.updated_at ? Date.parse(right.updated_at) : 0;
  if (leftTime !== rightTime) return leftTime - rightTime;
  return Number(left.id ?? 0) - Number(right.id ?? 0);
}

export function buildBackfillPlan({
  overlayRows,
  metaRows,
  curriculumIds,
  metaColumnsAvailable = true,
}) {
  const curriculumIdSet = new Set(curriculumIds);
  const metaByCurriculumId = new Map(metaRows.map((row) => [row.curriculum_id, row]));
  const {
    latestByCurriculumId,
    duplicateCurriculumIds,
    nullCurriculumRows,
  } = selectLatestOverlays(overlayRows);

  const briefing = createStats();
  const variation = {
    ...createStats(),
    labelFreeRows: 0,
    otherSectionsOnlyRows: 0,
    excludedRows: 0,
  };
  const planned = [];
  const conflicts = [];
  const missingCurriculumIds = [];
  const missingMetaCurriculumIds = [];

  for (const [curriculumId, overlay] of latestByCurriculumId) {
    if (!curriculumIdSet.has(curriculumId)) {
      missingCurriculumIds.push(curriculumId);
      continue;
    }

    const meta = metaByCurriculumId.get(curriculumId);
    if (!meta) missingMetaCurriculumIds.push(curriculumId);

    const briefingSection = extractExactSection(overlay.checklist, '사전 교육');
    const variationSection = extractExactSection(overlay.activity_tip, '변형 방법');
    const currentBriefing = normalizeText(meta?.sm_briefing_notes);
    const currentVariation = normalizeText(meta?.sm_variation_method);

    if (briefingSection.exists) {
      briefing.sectionRows += 1;
      if (!briefingSection.value) briefing.emptySectionRows += 1;
      if (currentBriefing) briefing.existingMetaRows += 1;
      if (briefingSection.value && !currentBriefing) briefing.plannedRows += 1;
      if (briefingSection.value && currentBriefing && briefingSection.value !== currentBriefing) {
        conflicts.push({ curriculumId, field: 'sm_briefing_notes' });
      }
    }

    const activityTip = normalizeText(overlay.activity_tip);
    const activitySections = parseSections(activityTip);
    if (activityTip && activitySections.size === 0) variation.labelFreeRows += 1;
    if (activitySections.size > 0 && !variationSection.exists) variation.otherSectionsOnlyRows += 1;
    if (variationSection.exists) {
      variation.sectionRows += 1;
      if (!variationSection.value) variation.emptySectionRows += 1;
      if (currentVariation) variation.existingMetaRows += 1;
      if (variationSection.value && !currentVariation) variation.plannedRows += 1;
      if (variationSection.value && currentVariation && variationSection.value !== currentVariation) {
        conflicts.push({ curriculumId, field: 'sm_variation_method' });
      }
    }

    const patch = {};
    if (briefingSection.value && !currentBriefing) patch.sm_briefing_notes = briefingSection.value;
    if (variationSection.value && !currentVariation) patch.sm_variation_method = variationSection.value;
    if (Object.keys(patch).length > 0) planned.push({ curriculumId, metaExists: Boolean(meta), patch });

    if (activityTip && !variationSection.value) variation.excludedRows += 1;
  }

  return {
    schema: { metaColumnsAvailable },
    totals: {
      overlayRows: overlayRows.length,
      connectedOverlayRows: overlayRows.filter((row) =>
        row.source_center_curriculum_id != null && curriculumIdSet.has(row.source_center_curriculum_id)
      ).length,
      latestConnectedCurricula: latestByCurriculumId.size - missingCurriculumIds.length,
      missingMetaCurricula: uniqueSorted(missingMetaCurriculumIds).length,
      duplicateOverlayCurricula: duplicateCurriculumIds.length,
    },
    briefing,
    variation,
    conflicts: {
      differingMetaValues: conflicts.length,
      items: conflicts,
      duplicateCurriculumIds,
      nullCurriculumOverlayRows: nullCurriculumRows.length,
      missingCurriculumIds: uniqueSorted(missingCurriculumIds),
      missingMetaCurriculumIds: uniqueSorted(missingMetaCurriculumIds),
    },
    planned,
  };
}

function createStats() {
  return {
    sectionRows: 0,
    emptySectionRows: 0,
    existingMetaRows: 0,
    plannedRows: 0,
  };
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a - b);
}
