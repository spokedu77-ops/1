#!/usr/bin/env node
import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  buildImageMigrationPlan,
  INVENTORY_IMAGE_BUCKET,
  PRODUCTION_PROJECT_REF,
  projectRefFromUrl,
} from './lib/inventory-image-migration.mjs';

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`Unexpected argument: ${token}`);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) args.set(token.slice(2), true);
    else { args.set(token.slice(2), next); index += 1; }
  }
  return args;
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function loadCheckpoint(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if (error?.code === 'ENOENT') return { version: 1, completedRows: {} }; throw error; }
}

async function saveJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function encryptBackup(value, password) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(password, salt, 32);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(value));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { version: 1, salt: salt.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
}

function verifyBackup(envelope, password, expected) {
  const key = scryptSync(password, Buffer.from(envelope.salt, 'base64'), 32);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]);
  if (createHash('sha256').update(plaintext).digest('hex') !== createHash('sha256').update(JSON.stringify(expected)).digest('hex')) {
    throw new Error('Encrypted backup restore verification failed.');
  }
}

async function findObject(storage, path) {
  const slash = path.lastIndexOf('/');
  const folder = path.slice(0, slash);
  const name = path.slice(slash + 1);
  const { data, error } = await storage.from(INVENTORY_IMAGE_BUCKET).list(folder, { search: name, limit: 2 });
  if (error) throw new Error('Storage object lookup failed.');
  return (data ?? []).find((item) => item.name === name) ?? null;
}

async function verifyObject(storage, item) {
  const { data, error } = await storage.from(INVENTORY_IMAGE_BUCKET).download(item.path);
  if (error || !data) throw new Error(`Storage download failed (${item.sha256.slice(0, 12)}).`);
  const bytes = Buffer.from(await data.arrayBuffer());
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== item.sha256 || bytes.length !== item.bytes.length) throw new Error(`Storage byte verification failed (${item.sha256.slice(0, 12)}).`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apply = args.has('apply');
  if (apply && args.has('dry-run')) throw new Error('Choose --dry-run or --apply.');
  const url = process.env.INVENTORY_MIGRATION_SUPABASE_URL?.trim() || requiredEnv('API_URL');
  const serviceKey = process.env.INVENTORY_MIGRATION_SERVICE_ROLE_KEY?.trim() || requiredEnv('SERVICE_ROLE_KEY');
  const projectRef = projectRefFromUrl(url);
  if (String(args.get('confirm-project-ref') ?? '') !== projectRef) throw new Error('Exact --confirm-project-ref is required.');
  if (apply && projectRef === PRODUCTION_PROJECT_REF && !args.has('allow-production')) throw new Error('Production apply requires --allow-production.');

  const expectedRows = Number(args.get('expected-rows') ?? 712);
  const expectedUnique = Number(args.get('expected-unique') ?? 47);
  const checkpointPath = resolve(String(args.get('checkpoint') ?? '.tmp/inventory-image-migration-checkpoint.json'));
  const backupPath = resolve(String(args.get('backup') ?? '.tmp/inventory-image-backup.enc.json'));
  const checkpoint = await loadCheckpoint(checkpointPath);
  if (checkpoint.projectRef && checkpoint.projectRef !== projectRef) throw new Error('Checkpoint belongs to another project.');

  const client = createClient(url, serviceKey, { auth: { persistSession: false } });
  const [{ data: catalog, error: catalogError }, { data: inventory, error: inventoryError }] = await Promise.all([
    client.from('catalog').select('id,image').order('id'),
    client.from('inventory').select('id,image').order('id'),
  ]);
  if (catalogError || inventoryError) throw new Error('Image inventory query failed.');
  const plan = buildImageMigrationPlan(catalog, inventory);
  if (plan.rows.length !== expectedRows || plan.unique.length !== expectedUnique) {
    throw new Error(`Inventory count mismatch: rows=${plan.rows.length}, unique=${plan.unique.length}.`);
  }

  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', projectRef, rows: plan.rows.length, unique: plan.unique.length, fingerprint: plan.fingerprint }));
  if (!apply) {
    checkpoint.projectRef = projectRef;
    checkpoint.dryRun = { fingerprint: plan.fingerprint, rows: plan.rows.length, unique: plan.unique.length, completedAt: new Date().toISOString() };
    await saveJson(checkpointPath, checkpoint);
    return;
  }
  if (checkpoint.dryRun?.fingerprint !== plan.fingerprint) throw new Error('Matching successful dry-run required.');

  const backupPassword = requiredEnv('INVENTORY_MIGRATION_BACKUP_KEY');
  const backup = { projectRef, fingerprint: plan.fingerprint, catalog, inventory, createdAt: new Date().toISOString() };
  const encrypted = encryptBackup(backup, backupPassword);
  verifyBackup(encrypted, backupPassword, backup);
  await saveJson(backupPath, encrypted);

  for (const item of plan.unique) {
    let object = await findObject(client.storage, item.path);
    if (!object) {
      const { error } = await client.storage.from(INVENTORY_IMAGE_BUCKET).upload(item.path, item.bytes, { contentType: item.mime, cacheControl: '31536000', upsert: false });
      if (error) throw new Error(`Storage upload failed (${item.sha256.slice(0, 12)}).`);
      object = await findObject(client.storage, item.path);
    }
    if (!object) throw new Error(`Storage object missing (${item.sha256.slice(0, 12)}).`);
    await verifyObject(client.storage, item);
  }

  for (const row of plan.rows) {
    const key = `${row.table}:${row.id}`;
    if (checkpoint.completedRows[key]?.sha256 === row.sha256) continue;
    const publicUrl = client.storage.from(INVENTORY_IMAGE_BUCKET).getPublicUrl(row.path).data.publicUrl;
    const { data: changed, error } = await client.rpc('admin_cas_inventory_image', {
      p_table: row.table,
      p_id: row.id,
      p_expected_md5: row.md5,
      p_next_image: publicUrl,
    });
    if (error || changed !== true) throw new Error(`CAS transition failed (${key}).`);
    checkpoint.completedRows[key] = { sha256: row.sha256, path: row.path, completedAt: new Date().toISOString() };
    await saveJson(checkpointPath, checkpoint);
  }

  const [{ count: remainingCatalog }, { count: remainingInventory }] = await Promise.all([
    client.from('catalog').select('id', { count: 'exact', head: true }).like('image', 'data:image/%'),
    client.from('inventory').select('id', { count: 'exact', head: true }).like('image', 'data:image/%'),
  ]);
  if ((remainingCatalog ?? 0) + (remainingInventory ?? 0) !== 0) throw new Error('Base64 references remain after migration.');
  console.log(JSON.stringify({ status: 'complete', transitioned: Object.keys(checkpoint.completedRows).length, remainingBase64: 0 }));
}

main().catch((error) => {
  console.error(JSON.stringify({ status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' }));
  process.exitCode = 1;
});
