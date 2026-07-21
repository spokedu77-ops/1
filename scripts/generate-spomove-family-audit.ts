/**
 * Commit B — generate docs/spomove-family-audit.generated.csv
 * SSOT: OFFICIAL_SPOMOVE_LIBRARY (완성본 import). 소스 정규식 파싱 금지.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OFFICIAL_SPOMOVE_LIBRARY } from '../app/spokedu-master/spomove/officialSpomovePresets';
import { buildFamilyAuditRows, rowsToCsv } from '../app/spokedu-master/spomove/familyAudit/inventory';
import type { MechanicPolicyWarning } from '../app/spokedu-master/spomove/familyAudit/signatures';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'spomove-family-audit.generated.csv');

function main() {
  const warnings: MechanicPolicyWarning[] = [];
  const rows = buildFamilyAuditRows(OFFICIAL_SPOMOVE_LIBRARY, warnings);
  const csv = rowsToCsv(rows);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, csv, { encoding: 'utf8' });

  const ready = rows.filter((r) => r.isReady).length;
  const modeCounts = new Map<string, number>();
  const mechanicGroups = new Map<string, number>();
  let themeBearing = 0;
  for (const row of rows) {
    modeCounts.set(row.engineMode, (modeCounts.get(row.engineMode) ?? 0) + 1);
    mechanicGroups.set(row.mechanicSignature, (mechanicGroups.get(row.mechanicSignature) ?? 0) + 1);
    if (row.theme !== 'none') themeBearing += 1;
  }

  console.log('SPOMOVE Family Audit Seed');
  console.log('');
  console.log(`Presets: ${rows.length}`);
  console.log(`Ready: ${ready}`);
  console.log(`Not ready: ${rows.length - ready}`);
  console.log('');
  console.log('Engine modes:');
  for (const [mode, count] of [...modeCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`- ${mode}: ${count}`);
  }
  console.log('');
  console.log(`Mechanic candidate groups: ${mechanicGroups.size}`);
  console.log(`Theme-bearing presets: ${themeBearing}`);
  console.log(`Warnings: ${warnings.length}`);
  for (const w of warnings) console.log(w.message);
  console.log('');
  console.log(`Generated:\n${path.relative(ROOT, OUT).replace(/\\/g, '/')}`);

  if (warnings.length > 0) {
    process.exitCode = 1;
  }
}

main();
