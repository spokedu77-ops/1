/**
 * Commit B — verify docs/spomove-family-audit.generated.csv against OFFICIAL_SPOMOVE_LIBRARY
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OFFICIAL_SPOMOVE_LIBRARY } from '../app/spokedu-master/spomove/officialSpomovePresets';
import {
  GENERATED_CSV_HEADER,
  buildFamilyAuditRows,
  rowsToCsv,
} from '../app/spokedu-master/spomove/familyAudit/inventory';
import type { MechanicPolicyWarning } from '../app/spokedu-master/spomove/familyAudit/signatures';
import { MECHANIC_KEYS_BY_MODE } from '../app/spokedu-master/spomove/familyAudit/signatures';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'docs', 'spomove-family-audit.generated.csv');

function fail(message: string): never {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

function main() {
  if (!fs.existsSync(CSV_PATH)) {
    fail(`missing ${path.relative(ROOT, CSV_PATH)}`);
  }

  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  if (raw.charCodeAt(0) === 0xfeff) fail('CSV must be UTF-8 without BOM');
  if (raw.includes('\r\n')) fail('CSV must use LF line endings');

  const lines = raw.replace(/\n$/, '').split('\n');
  if (lines[0] !== GENERATED_CSV_HEADER) fail('CSV header mismatch');

  const dataLines = lines.slice(1);
  const libraryIds = OFFICIAL_SPOMOVE_LIBRARY.map((p) => p.id);
  const libraryIdSet = new Set(libraryIds);

  if (dataLines.length !== OFFICIAL_SPOMOVE_LIBRARY.length) {
    fail(`row count ${dataLines.length} !== library ${OFFICIAL_SPOMOVE_LIBRARY.length}`);
  }

  const seen = new Set<string>();
  const csvIds: string[] = [];
  let prevSort = -Infinity;
  let prevId = '';

  for (let i = 0; i < dataLines.length; i += 1) {
    const cells = parseCsvLine(dataLines[i]!);
    if (cells.length !== GENERATED_CSV_HEADER.split(',').length) {
      fail(`row ${i + 2}: column count ${cells.length}`);
    }
    const [
      sortOrder,
      presetId,
      ,
      ,
      ,
      ,
      ,
      engineOptionsJson,
      ,
      ,
      ,
      ,
      ,
      ,
      ,
      ,
      runtimeSignature,
      mechanicSignature,
      themeSignature,
      stageSignature,
    ] = cells;

    if (!presetId) fail(`row ${i + 2}: empty presetId`);
    if (seen.has(presetId)) fail(`duplicate presetId ${presetId}`);
    seen.add(presetId);
    csvIds.push(presetId);

    if (!libraryIdSet.has(presetId)) fail(`CSV has unknown presetId ${presetId}`);

    const sort = Number(sortOrder);
    if (!Number.isFinite(sort)) fail(`row ${i + 2}: bad sortOrder`);
    if (sort < prevSort || (sort === prevSort && presetId < prevId)) {
      fail(`row ${i + 2}: sortOrder/presetId order broken`);
    }
    prevSort = sort;
    prevId = presetId;

    if (!runtimeSignature?.startsWith('v1|')) fail(`${presetId}: runtimeSignature missing`);
    if (!mechanicSignature?.startsWith('v1|')) fail(`${presetId}: mechanicSignature missing`);
    if (!themeSignature?.startsWith('v1|')) fail(`${presetId}: themeSignature missing`);
    if (!stageSignature?.startsWith('v1|')) fail(`${presetId}: stageSignature missing`);

    try {
      const parsed = JSON.parse(engineOptionsJson || '{}') as unknown;
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        fail(`${presetId}: engineOptionsJson must be object`);
      }
    } catch {
      fail(`${presetId}: engineOptionsJson invalid JSON`);
    }
  }

  for (const id of libraryIds) {
    if (!seen.has(id)) fail(`library preset missing from CSV: ${id}`);
  }

  const warnings: MechanicPolicyWarning[] = [];
  for (const preset of OFFICIAL_SPOMOVE_LIBRARY) {
    if (!(preset.engine.mode in MECHANIC_KEYS_BY_MODE)) {
      warnings.push({
        mode: preset.engine.mode,
        message: `[WARN] mechanic key policy missing: mode=${preset.engine.mode}`,
      });
    }
  }
  if (warnings.length > 0) {
    for (const w of warnings) console.error(w.message);
    fail('unsupported engine mode warnings > 0');
  }

  const expected = rowsToCsv(buildFamilyAuditRows(OFFICIAL_SPOMOVE_LIBRARY, []));
  if (expected !== raw) {
    fail('regeneration is not byte-for-byte identical to docs/spomove-family-audit.generated.csv — run npm run audit:spomove-family');
  }

  console.log('SPOMOVE Family Audit Seed — VERIFY OK');
  console.log(`Presets: ${dataLines.length}`);
  console.log(`CSV: ${path.relative(ROOT, CSV_PATH).replace(/\\/g, '/')}`);
}

main();
