#!/usr/bin/env node

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  buildMigrationPlan,
  centerFilesFingerprint,
  contentTypeFromObject,
  LEGACY_BUCKET,
  OPS_PROJECT_REF,
  pathIdentifier,
  PRIVATE_BUCKET,
  projectRefFromUrl,
  sha256,
  sizeFromObject,
  transitionCenterFiles,
} from './lib/center-criminal-check-migration.mjs';

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) args.set(key, true);
    else {
      args.set(key, next);
      index += 1;
    }
  }
  return args;
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function loadCheckpoint(path) {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8'));
    return {
      version: 1,
      projectRef: parsed.projectRef ?? null,
      dryRun: parsed.dryRun ?? null,
      completed: parsed.completed && typeof parsed.completed === 'object' ? parsed.completed : {},
    };
  } catch (error) {
    if (error?.code === 'ENOENT') return { version: 1, projectRef: null, dryRun: null, completed: {} };
    throw error;
  }
}

async function saveCheckpoint(path, checkpoint) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(checkpoint, null, 2)}\n`, { encoding: 'utf8', flag: 'w' });
}

async function listFolder(storage, bucket, folder = '') {
  const objects = [];
  let offset = 0;
  while (true) {
    const { data, error } = await storage.from(bucket).list(folder, {
      limit: 100,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error(`Storage list failed for ${bucket}.`);
    for (const item of data ?? []) {
      const path = folder ? `${folder}/${item.name}` : item.name;
      if (item.id == null && item.metadata == null) objects.push(...await listFolder(storage, bucket, path));
      else objects.push({ ...item, path });
    }
    if ((data ?? []).length < 100) break;
    offset += data.length;
  }
  return objects;
}

async function downloadBytes(storage, bucket, path) {
  const { data, error } = await storage.from(bucket).download(path, {}, { cache: 'no-store' });
  if (error || !data) throw new Error(`Storage download failed (${pathIdentifier(bucket, path)}).`);
  return Buffer.from(await data.arrayBuffer());
}

async function findObject(storage, bucket, path) {
  const slash = path.lastIndexOf('/');
  const folder = slash < 0 ? '' : path.slice(0, slash);
  const name = slash < 0 ? path : path.slice(slash + 1);
  const { data, error } = await storage.from(bucket).list(folder, { limit: 2, search: name });
  if (error) throw new Error(`Storage metadata lookup failed (${pathIdentifier(bucket, path)}).`);
  return (data ?? []).find((item) => item.name === name) ?? null;
}

async function validateSignedDownload(storage, path, expectedDigest) {
  const { data, error } = await storage.from(PRIVATE_BUCKET).createSignedUrl(path, 60);
  if (error || !data?.signedUrl) throw new Error('Private signed URL creation failed.');
  const response = await fetch(data.signedUrl, { cache: 'no-store', redirect: 'error' });
  if (!response.ok) throw new Error(`Private signed URL download failed with ${response.status}.`);
  const digest = sha256(Buffer.from(await response.arrayBuffer()));
  if (digest !== expectedDigest) throw new Error('Private signed URL byte digest mismatch.');
}

function assertObjectMetadata(source, destination) {
  const sourceSize = sizeFromObject(source);
  const destinationSize = sizeFromObject(destination);
  if (sourceSize == null || destinationSize == null || sourceSize !== destinationSize) {
    throw new Error('Storage object size metadata mismatch.');
  }
  const sourceType = contentTypeFromObject(source);
  const destinationType = contentTypeFromObject(destination);
  if (!sourceType || !destinationType || sourceType !== destinationType) {
    throw new Error('Storage object MIME metadata mismatch.');
  }
  return { size: sourceSize, contentType: sourceType };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apply = args.has('apply');
  if (apply && args.has('dry-run')) throw new Error('Choose either --dry-run or --apply.');

  const supabaseUrl = requiredEnv('CENTER_MIGRATION_SUPABASE_URL');
  const serviceRoleKey = requiredEnv('CENTER_MIGRATION_SERVICE_ROLE_KEY');
  const projectRef = projectRefFromUrl(supabaseUrl);
  const confirmedRef = String(args.get('confirm-project-ref') ?? '');
  if (apply && confirmedRef !== projectRef) throw new Error('--confirm-project-ref must exactly match the target.');
  if (apply && projectRef === OPS_PROJECT_REF && !args.has('allow-production')) {
    throw new Error('Production apply is disabled without --allow-production and an exact project-ref confirmation.');
  }

  const expectedReferenced = Number(args.get('expected-referenced') ?? 19);
  const expectedUnreferenced = Number(args.get('expected-unreferenced') ?? 3);
  if (!Number.isInteger(expectedReferenced) || !Number.isInteger(expectedUnreferenced)) {
    throw new Error('Expected file counts must be integers.');
  }

  const checkpointPath = resolve(String(args.get('checkpoint') ?? '.tmp/center-criminal-check-migration-checkpoint.json'));
  const checkpoint = await loadCheckpoint(checkpointPath);
  if (checkpoint.projectRef && checkpoint.projectRef !== projectRef) {
    throw new Error('Checkpoint belongs to a different Supabase project.');
  }
  checkpoint.projectRef = projectRef;

  const client = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: centers, error: centerError } = await client
    .from('centers')
    .select('id, criminal_check_files')
    .not('criminal_check_files', 'eq', '[]');
  if (centerError) throw new Error('Center reference inventory failed.');

  const sourceObjects = await listFolder(client.storage, LEGACY_BUCKET, 'centers');
  const plan = buildMigrationPlan({ centers: centers ?? [], sourceObjects, expectedReferenced, expectedUnreferenced });
  const sourceByPath = new Map(sourceObjects.map((object) => [object.path, object]));
  const expectedFilesByCenter = new Map(plan.references.map((reference) => [reference.centerId, reference.centerFiles]));
  const inventoryFingerprint = sha256(JSON.stringify({
    references: plan.references
      .map((reference) => [
        reference.centerId,
        pathIdentifier(LEGACY_BUCKET, reference.file.path),
        sha256(reference.file.name),
      ])
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
    unreferenced: plan.unreferenced
      .map((object) => pathIdentifier(LEGACY_BUCKET, object.path))
      .sort(),
  }));
  if (apply && checkpoint.dryRun?.inventoryFingerprint !== inventoryFingerprint) {
    throw new Error('A successful dry-run with the same inventory is required before --apply.');
  }

  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    projectRef,
    referenced: plan.references.length,
    pendingCopies: plan.jobs.length,
    unreferencedPreserved: plan.unreferenced.length,
    checkpointCompleted: Object.keys(checkpoint.completed).length,
  }));

  for (const job of plan.references) {
    const id = pathIdentifier(LEGACY_BUCKET, job.file.path);
    if (checkpoint.completed[id]) {
      console.log(JSON.stringify({ id, status: 'checkpoint-skip' }));
      continue;
    }

    const { data: latestCenter, error: latestError } = await client
      .from('centers')
      .select('criminal_check_files')
      .eq('id', job.centerId)
      .single();
    if (latestError || !latestCenter) throw new Error(`Center reload failed (${job.centerId}).`);
    const expectedFiles = expectedFilesByCenter.get(job.centerId) ?? job.centerFiles;
    const expectedFingerprint = centerFilesFingerprint(expectedFiles);
    if (centerFilesFingerprint(latestCenter.criminal_check_files) !== expectedFingerprint) {
      throw new Error(`Concurrent center file change detected (${job.centerId}).`);
    }

    const sourceObject = sourceByPath.get(job.file.path);
    const sourceBytes = await downloadBytes(client.storage, LEGACY_BUCKET, job.file.path);
    const sourceDigest = sha256(sourceBytes);
    const sourceSize = sizeFromObject(sourceObject);
    if (sourceSize == null || sourceSize !== sourceBytes.length) throw new Error(`Source size mismatch (${id}).`);

    let destinationObject = await findObject(client.storage, PRIVATE_BUCKET, job.file.path);
    if (!apply && job.bucket === LEGACY_BUCKET) {
      console.log(JSON.stringify({ id, status: 'dry-run-source-verified', size: sourceBytes.length, sourceSha256Computed: true }));
      continue;
    }
    if (!destinationObject && job.bucket === PRIVATE_BUCKET) {
      throw new Error(`Referenced private object is missing (${id}).`);
    }
    if (!destinationObject) {
      const { error: copyError } = await client.storage
        .from(LEGACY_BUCKET)
        .copy(job.file.path, job.file.path, { destinationBucket: PRIVATE_BUCKET });
      if (copyError) throw new Error(`Cross-bucket copy failed (${id}).`);
      destinationObject = await findObject(client.storage, PRIVATE_BUCKET, job.file.path);
    }
    if (!destinationObject) throw new Error(`Destination object is missing after copy (${id}).`);

    const metadata = assertObjectMetadata(sourceObject, destinationObject);
    const destinationBytes = await downloadBytes(client.storage, PRIVATE_BUCKET, job.file.path);
    const destinationDigest = sha256(destinationBytes);
    if (destinationDigest !== sourceDigest) throw new Error(`Destination SHA-256 mismatch (${id}).`);
    await validateSignedDownload(client.storage, job.file.path, sourceDigest);
    if (!apply) {
      console.log(JSON.stringify({ id, status: 'dry-run-private-verified', size: metadata.size, sha256Verified: true }));
      continue;
    }

    if (job.bucket === LEGACY_BUCKET) {
      const { current, next } = transitionCenterFiles(latestCenter.criminal_check_files, job.centerId, job.file.path);
      const { data: updated, error: updateError } = await client
        .from('centers')
        .update({ criminal_check_files: next })
        .eq('id', job.centerId)
        .eq('criminal_check_files', JSON.stringify(current))
        .select('criminal_check_files')
        .maybeSingle();
      if (updateError || !updated) {
        throw new Error(`Concurrent database update blocked the reference transition (${job.centerId}).`);
      }
      expectedFilesByCenter.set(job.centerId, next);
    }

    checkpoint.completed[id] = {
      status: 'complete',
      size: metadata.size,
      contentType: metadata.contentType,
      sourceSha256: sourceDigest,
      destinationSha256: destinationDigest,
      completedAt: new Date().toISOString(),
    };
    await saveCheckpoint(checkpointPath, checkpoint);
    console.log(JSON.stringify({
      id,
      status: apply && job.bucket === LEGACY_BUCKET ? 'complete' : 'verified',
      size: metadata.size,
      sha256Verified: true,
    }));
  }

  if (!apply) {
    checkpoint.dryRun = {
      inventoryFingerprint,
      referenced: plan.references.length,
      unreferenced: plan.unreferenced.length,
      completedAt: new Date().toISOString(),
    };
    await saveCheckpoint(checkpointPath, checkpoint);
    console.log(JSON.stringify({ status: 'dry-run-complete', inventoryVerified: true }));
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' }));
  process.exitCode = 1;
});
