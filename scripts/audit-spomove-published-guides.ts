#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SPOMOVE_CONTENT_PACK_ID } from '@/app/lib/spomove/spomoveOfficialAssets';
import { validateSpomovePublishedGuidesForSave } from '@/app/lib/spomove/validateSpomovePublishedGuidesForSave';

type EnvMap = Record<string, string>;

function loadEnvFile(path: string): EnvMap {
  const env: EnvMap = {};
  try {
    const text = readFileSync(path, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const equalsIndex = trimmed.indexOf('=');
      if (equalsIndex <= 0) continue;
      const key = trimmed.slice(0, equalsIndex).trim();
      let value = trimmed.slice(equalsIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[key] = value;
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Optional in CI; real credentials can come from process.env.
  }
  return env;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is missing`);
  return value;
}

async function main() {
  loadEnvFile(join(process.cwd(), '.env.local'));
  loadEnvFile(join(process.cwd(), '.env'));

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('think_asset_packs')
    .select('id, name, assets_json, updated_at')
    .eq('id', SPOMOVE_CONTENT_PACK_ID)
    .maybeSingle();

  if (error) throw new Error(`SPOMOVE content pack query failed: ${error.message}`);

  console.log('SPOMOVE Published Guide Audit');
  console.log(`Pack: ${SPOMOVE_CONTENT_PACK_ID}`);

  if (!data) {
    console.log('Result: content pack not found');
    return;
  }

  console.log(`Updated at: ${String(data.updated_at ?? 'unknown')}`);

  const issues = validateSpomovePublishedGuidesForSave(data.assets_json);
  if (issues.length === 0) {
    console.log('Invalid guides: 0');
    console.log('Result: OK');
    return;
  }

  console.log(`Invalid guides: ${issues.length}`);
  const presetIds = Array.from(new Set(issues.map((issue) => issue.presetId)));
  for (const presetId of presetIds) {
    console.log('');
    console.log(presetId);
    for (const issue of issues.filter((item) => item.presetId === presetId)) {
      console.log(`- ${issue.field}: ${issue.code} - ${issue.message}`);
    }
  }

  process.exitCode = 1;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[audit-spomove-published-guides] ${message}`);
  process.exit(1);
});
