import { access, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { applyMasterAdminSession } from './spokedu-master-admin-auth.mjs';

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

export async function readMasterQaAccess(context, baseUrl) {
  const response = await context.request.get(`${baseUrl.replace(/\/$/, '')}/api/spokedu-master/access`);
  const snapshot = await response.json().catch(() => null);
  return { status: response.status(), snapshot };
}

export async function assertMasterQaAccess(context, baseUrl, { requireLibrary = true, expectedPlan } = {}) {
  const { status, snapshot } = await readMasterQaAccess(context, baseUrl);
  if (status !== 200 || snapshot?.authenticated !== true) {
    throw new Error(`MASTER QA session is not authenticated (HTTP ${status}).`);
  }
  if (requireLibrary && snapshot?.canUseLibrary !== true) {
    throw new Error('MASTER QA session does not have Library capability.');
  }
  if (expectedPlan && snapshot?.plan !== expectedPlan) {
    throw new Error(`MASTER QA session has plan=${snapshot?.plan ?? 'none'}; expected ${expectedPlan}.`);
  }
  return {
    status,
    authenticated: true,
    canUseLibrary: snapshot.canUseLibrary === true,
    plan: snapshot.plan ?? null,
  };
}

export async function clearMasterQaCookies(context) {
  await context.clearCookies({ name: /^sb-.*-auth-token(?:\.\d+)?$/ });
}

export async function ensureMasterQaAccess(context, baseUrl, {
  email,
  expectedPlan,
  requireLibrary = true,
  useStorageState = true,
  onDiagnostic,
} = {}) {
  let recovered = false;
  if (useStorageState) {
    try {
      await applyMasterStorageState(context);
      onDiagnostic?.({ stage: 'storage-state', ok: true });
      const access = await assertMasterQaAccess(context, baseUrl, { requireLibrary, expectedPlan });
      onDiagnostic?.({ stage: 'server-auth', ok: true, status: access.status, plan: access.plan });
      return { ...access, recovered };
    } catch (error) {
      const { status } = await readMasterQaAccess(context, baseUrl).catch(() => ({ status: 0 }));
      onDiagnostic?.({ stage: 'storage-state', ok: false, status });
      if (status !== 401 && status !== 0) throw error;
    }
  }

  if (!email) throw new Error('MASTER QA email is required to recover authentication.');
  recovered = useStorageState;
  await clearMasterQaCookies(context);
  onDiagnostic?.({ stage: 'stale-cookie-cleared', ok: true });
  await applyMasterAdminSession(context, baseUrl, email, { onDiagnostic });
  try {
    const access = await assertMasterQaAccess(context, baseUrl, { requireLibrary, expectedPlan });
    onDiagnostic?.({ stage: 'server-auth', ok: true, status: access.status, plan: access.plan });
    return { ...access, recovered };
  } catch (error) {
    const { status } = await readMasterQaAccess(context, baseUrl).catch(() => ({ status: 0 }));
    onDiagnostic?.({ stage: 'server-auth', ok: false, status });
    throw error;
  }
}

export async function ensureMasterStorageStateDirectory() {
  const storageStatePath = getMasterStorageStatePath();
  await mkdir(path.dirname(storageStatePath), { recursive: true });
  return storageStatePath;
}
