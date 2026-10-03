import { access, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_MASTER_STORAGE_STATE_PATH = path.join(
  process.cwd(),
  '.tmp',
  'spm-master-auth',
  'storage-state.json',
);

export function getMasterStorageStatePath() {
  return path.resolve(process.env.SPOKEDU_MASTER_STORAGE_STATE || DEFAULT_MASTER_STORAGE_STATE_PATH);
}

export async function requireMasterStorageState() {
  const storageStatePath = getMasterStorageStatePath();
  try {
    await access(storageStatePath);
  } catch {
    throw new Error(
      `MASTER QA storage state is required at ${storageStatePath}. Run scripts/spokedu-master-auth-state-capture.mjs and complete passwordless login first.`,
    );
  }
  return storageStatePath;
}

export async function applyMasterStorageState(context) {
  const storageStatePath = await requireMasterStorageState();
  const storageState = JSON.parse(await readFile(storageStatePath, 'utf8'));
  if (Array.isArray(storageState.cookies) && storageState.cookies.length > 0) {
    await context.addCookies(storageState.cookies);
  }
  if (Array.isArray(storageState.origins)) {
    await context.addInitScript((origins) => {
      const origin = origins.find((candidate) => candidate.origin === window.location.origin);
      for (const item of origin?.localStorage ?? []) window.localStorage.setItem(item.name, item.value);
    }, storageState.origins);
  }
  return storageStatePath;
}

export async function assertMasterQaAccess(context, baseUrl, { requireLibrary = true } = {}) {
  const response = await context.request.get(`${baseUrl.replace(/\/$/, '')}/api/spokedu-master/access`);
  const snapshot = await response.json().catch(() => null);
  if (response.status() !== 200 || snapshot?.authenticated !== true) {
    throw new Error(`MASTER QA session is not authenticated (HTTP ${response.status()}).`);
  }
  if (requireLibrary && snapshot?.canUseLibrary !== true) {
    throw new Error('MASTER QA session does not have Library capability.');
  }
  return {
    status: response.status(),
    authenticated: true,
    canUseLibrary: snapshot.canUseLibrary === true,
    plan: snapshot.plan ?? null,
  };
}

export async function ensureMasterStorageStateDirectory() {
  const storageStatePath = getMasterStorageStatePath();
  await mkdir(path.dirname(storageStatePath), { recursive: true });
  return storageStatePath;
}
