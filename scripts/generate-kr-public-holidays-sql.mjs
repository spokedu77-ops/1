#!/usr/bin/env node
/**
 * data/kr-public-holidays.json → SQL (upsert holidays + coverage years).
 * Usage: node scripts/generate-kr-public-holidays-sql.mjs [--check]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const jsonPath = join(root, 'data', 'kr-public-holidays.json');
const outPath = join(root, 'sql', 'kr-public-holidays-seed.sql');

const payload = JSON.parse(readFileSync(jsonPath, 'utf8'));
const rows = [];
for (const list of Object.values(payload.years)) {
  for (const item of list) {
    const name = String(item.name).replace(/'/g, "''");
    rows.push(`('${item.date}'::date, '${name}', '${item.kind}')`);
  }
}

const sql = `-- GENERATED from data/kr-public-holidays.json — do not edit by hand
insert into public.kr_public_holidays (holiday_date, name, holiday_kind)
values
${rows.join(',\n')}
on conflict (holiday_date) do update set
  name = excluded.name,
  holiday_kind = excluded.holiday_kind;

insert into public.kr_public_holiday_coverage (calendar_year, source_version)
values
${Object.keys(payload.years)
  .map((y) => `(${y}, 'data/kr-public-holidays.json')`)
  .join(',\n')}
on conflict (calendar_year) do update set
  source_version = excluded.source_version,
  loaded_at = now();
`;

if (process.argv.includes('--check')) {
  const existing = readFileSync(outPath, 'utf8');
  if (existing !== sql) {
    console.error('Generated SQL is stale. Run: node scripts/generate-kr-public-holidays-sql.mjs');
    process.exit(1);
  }
  console.log('kr-public-holidays seed SQL is up to date');
} else {
  writeFileSync(outPath, sql, 'utf8');
  console.log(`Wrote ${outPath} (${rows.length} holidays)`);
}
