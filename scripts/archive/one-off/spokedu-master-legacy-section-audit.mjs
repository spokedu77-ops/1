import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  throw new Error('Required Supabase environment variables are missing.');
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const migrateArgument = process.argv.find((argument) => argument.startsWith('--migrate-application='));
const migrateProgramId = migrateArgument
  ? Number(migrateArgument.split('=')[1])
  : null;
const summaryOnly = process.argv.includes('--summary');

const LABELS = [
  { label: '사전 교육', official: true },
  { label: '변형 방법', official: true },
  { label: '응용 방법', official: false },
  { label: '안전 포인트', official: false },
  { label: '운영 팁', official: false },
  { label: '난이도 낮추기', official: false },
  { label: '난이도 높이기', official: false },
  { label: '현장 팁', official: false },
];

function parseSections(source) {
  const sections = new Map();
  let current = null;

  for (const rawLine of String(source ?? '').split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = line.match(/^\[([^\]]+)\]$/);
    if (match) {
      current = match[1].trim();
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    if (current && line) sections.get(current).push(line);
  }
  return sections;
}

function latestRows(rows) {
  const latest = new Map();
  for (const row of rows) {
    const curriculumId = row.source_center_curriculum_id;
    if (curriculumId == null) continue;
    const previous = latest.get(curriculumId);
    const previousTime = previous?.updated_at ? Date.parse(previous.updated_at) : 0;
    const nextTime = row.updated_at ? Date.parse(row.updated_at) : 0;
    if (!previous || nextTime >= previousTime) latest.set(curriculumId, row);
  }
  return latest;
}

const { data: curriculumRows, error: curriculumError } = await supabase
  .from('curriculum')
  .select('id,title')
  .eq('is_sub', false);
if (curriculumError) throw curriculumError;

const { data: overlayRows, error: overlayError } = await supabase
  .from('spokedu_pro_programs')
  .select('id,title,source_center_curriculum_id,checklist,activity_tip,updated_at');
if (overlayError) throw overlayError;

const titleById = new Map((curriculumRows ?? []).map((row) => [row.id, row.title ?? '']));
const overlays = latestRows(overlayRows ?? []);

if (migrateProgramId != null) {
  if (!Number.isInteger(migrateProgramId) || migrateProgramId <= 0) {
    throw new Error('Invalid migration program ID.');
  }
  const overlay = overlays.get(migrateProgramId);
  if (!overlay) throw new Error(`No overlay found for curriculum ${migrateProgramId}.`);

  const sections = parseSections(overlay.activity_tip);
  if (!sections.has('응용 방법')) {
    throw new Error(`Curriculum ${migrateProgramId} has no [응용 방법] section.`);
  }
  if (sections.has('변형 방법')) {
    throw new Error(`Curriculum ${migrateProgramId} already has [변형 방법].`);
  }

  const backupDirectory = join(process.cwd(), 'qa-artifacts', 'spokedu-master-legacy-audit');
  const backupPath = join(backupDirectory, `program-${migrateProgramId}-before.json`);
  await mkdir(backupDirectory, { recursive: true });
  await writeFile(
    backupPath,
    JSON.stringify({
      backedUpAt: new Date().toISOString(),
      curriculumId: migrateProgramId,
      overlay,
    }, null, 2),
    'utf8',
  );

  const migratedActivityTip = String(overlay.activity_tip).replace('[응용 방법]', '[변형 방법]');
  const { error: migrationError } = await supabase
    .from('spokedu_pro_programs')
    .update({ activity_tip: migratedActivityTip })
    .eq('id', overlay.id);
  if (migrationError) throw migrationError;

  console.log(JSON.stringify({
    migrated: true,
    curriculumId: migrateProgramId,
    title: overlay.title || titleById.get(migrateProgramId) || '',
    overlayId: overlay.id,
    backupPath,
    originalLabel: '응용 방법',
    targetLabel: '변형 방법',
    content: sections.get('응용 방법').join('\n'),
  }, null, 2));
  process.exit(0);
}

const audit = new Map(
  LABELS.map(({ label, official }) => [
    label,
    { label, official, runtimeUsed: official, migrationNeeded: !official, programs: [] },
  ]),
);
const unknown = new Map();

for (const [programId, overlay] of overlays) {
  const sources = [
    { field: 'checklist', sections: parseSections(overlay.checklist) },
    { field: 'activity_tip', sections: parseSections(overlay.activity_tip) },
  ];

  for (const { field, sections } of sources) {
    for (const [label, lines] of sections) {
      const program = {
        id: programId,
        title: overlay.title || titleById.get(programId) || `curriculum #${programId}`,
        field,
        content: lines.join('\n'),
      };
      const known = audit.get(label);
      if (known) {
        known.programs.push(program);
      } else {
        const items = unknown.get(label) ?? [];
        items.push(program);
        unknown.set(label, items);
      }
    }
  }
}

const result = {
  latestOverlayCount: overlays.size,
  labels: [...audit.values()].map((entry) => ({
    ...entry,
    programCount: new Set(entry.programs.map((program) => program.id)).size,
  })),
  unknownLabels: [...unknown.entries()]
    .map(([label, programs]) => ({
      label,
      official: false,
      runtimeUsed: false,
      migrationNeeded: true,
      programCount: new Set(programs.map((program) => program.id)).size,
      programs,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ko-KR')),
};

if (summaryOnly) {
  console.log(JSON.stringify({
    latestOverlayCount: result.latestOverlayCount,
    labels: result.labels.map((entry) => ({
      label: entry.label,
      official: entry.official,
      runtimeUsed: entry.runtimeUsed,
      migrationNeeded: entry.migrationNeeded,
      programCount: entry.programCount,
      programIds: [...new Set(entry.programs.map((program) => program.id))],
      programs: entry.label === '응용 방법' ? entry.programs : undefined,
    })),
    unknownLabels: result.unknownLabels.map((entry) => ({
      label: entry.label,
      programCount: entry.programCount,
      programIds: [...new Set(entry.programs.map((program) => program.id))],
    })),
  }, null, 2));
} else {
  console.log(JSON.stringify(result, null, 2));
}
