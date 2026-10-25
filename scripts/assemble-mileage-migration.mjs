#!/usr/bin/env node
/**
 * Assembles supabase/migrations/20261023150000_mileage_holiday_and_admin_cancel.sql (UTF-8).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const out = join(root, 'supabase/migrations/20261023150000_mileage_holiday_and_admin_cancel.sql');
const seedPath = join(root, 'sql/kr-public-holidays-seed.sql');

const header = `-- Mileage: KR holiday calendar, holiday-aware settlement, admin cancel (single vs session settlement).
-- Production already has 20261023135717 / 20261023135727 — do not re-apply postpone migrations under new names.

`;

const core = readFileSync(join(root, 'sql/mileage_holiday_migration_core.sql'), 'utf8');
const seed = readFileSync(seedPath, 'utf8');

writeFileSync(out, header + core + '\n' + seed, 'utf8');
console.log('Wrote', out);
