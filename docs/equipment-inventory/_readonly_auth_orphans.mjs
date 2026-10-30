#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const envText = readFileSync(resolve(root, '.env.local'), 'utf8');
const env = {};
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  const i = line.indexOf('=');
  let v = line.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[line.slice(0, i)] = v;
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const orphanIds = [
  'b1f19079-394e-4b63-afc5-d2de26022d9d',
  '3e84151e-0712-4b13-a192-260319ce7061',
  'aa0f7a48-e4d3-46f6-935d-fed4cb107a9b',
  '7334ef7b-56c0-4f66-bf7c-4f697c3ae4c5',
];

const out = { auth_users: [] };
for (const id of orphanIds) {
  const { data, error } = await sb.auth.admin.getUserById(id);
  out.auth_users.push({
    id,
    found: Boolean(data?.user),
    email: data?.user?.email ?? null,
    error: error?.message ?? null,
  });
}
console.log(JSON.stringify(out, null, 2));
