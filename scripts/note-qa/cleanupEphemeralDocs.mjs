/**
 * Smoke / Regression QA가 남긴 임시 note_documents 정리.
 * 고정 QA 문서(NOTE_QA_DOCUMENTS)는 건드리지 않는다.
 */
import { createClient } from '@supabase/supabase-js';
import {
  NOTE_QA_DOCUMENTS,
  SUPABASE_SERVICE,
  SUPABASE_URL,
  resolveAdminEmail,
} from './shared.mjs';

const PROTECTED_IDS = new Set(NOTE_QA_DOCUMENTS.map((doc) => doc.id));

/** QA 스크립트·디버그 세션이 만드는 일회성 문서 제목 패턴 */
export function isEphemeralQaDocumentTitle(title, options = {}) {
  if (typeof title !== 'string') return false;
  const trimmed = title.trim();
  if (!trimmed) return false;
  if (Array.isArray(options.titlePrefixes) && options.titlePrefixes.length > 0) {
    return options.titlePrefixes.some((prefix) => trimmed.startsWith(prefix));
  }
  // Smoke … (공백 유무) — LeaveAck / ToggleForest / TodoChain 포함
  if (/^Smoke(\s|$)/i.test(trimmed) || trimmed.startsWith('SmokeTodoChain')) return true;
  if (trimmed.startsWith('Typing QA ')) return true;
  if (trimmed.startsWith('Regression QA ')) return true;
  if (trimmed.startsWith('Foundation QA ')) return true;
  if (trimmed.startsWith('Toggle KB QA ')) return true;
  if (trimmed.startsWith('Toggle Zombie QA ')) return true;
  if (trimmed.startsWith('dbg ')) return true;
  if (trimmed === '스모크 하위' || trimmed.startsWith('스모크 ')) return true;
  // 임시 프로브/디버그 문서 (에이전트·수동 점검 잔여)
  if (/^(BS|UIProbe|ChainProbe|SeedProbe|Debug|Probe)\b/i.test(trimmed)) return true;
  return false;
}

/** 삭제 대상 id — 제목 매칭 + ephemeral 부모의 하위 문서 포함 */
export function collectEphemeralQaDocumentIds(documents, options = {}) {
  const toDelete = new Set();

  for (const doc of documents) {
    if (PROTECTED_IDS.has(doc.id)) continue;
    if (isEphemeralQaDocumentTitle(doc.title, options)) toDelete.add(doc.id);
  }

  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const doc of documents) {
      if (PROTECTED_IDS.has(doc.id) || toDelete.has(doc.id)) continue;
      if (doc.parent_id && toDelete.has(doc.parent_id)) {
        toDelete.add(doc.id);
        expanded = true;
      }
    }
  }

  return [...toDelete];
}

export async function fetchActiveNoteDocumentsViaPage(page) {
  return page.evaluate(async () => {
    const res = await fetch('/api/admin/note/bootstrap', { credentials: 'include' });
    if (!res.ok) throw new Error(`bootstrap ${res.status}`);
    const json = await res.json();
    return (json.documents ?? []).filter((doc) => !doc.deleted_at);
  });
}

export async function softDeleteDocumentsViaPage(page, ids) {
  for (const id of ids) {
    const ok = await page.evaluate(async (docId) => {
      const res = await fetch(`/api/admin/note/documents?id=${encodeURIComponent(docId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      return res.ok;
    }, id);
    if (!ok) throw new Error(`soft delete failed for document ${id}`);
  }
}

/** 브라우저 세션(Playwright page)으로 ephemeral QA 문서 휴지통 이동 (잔여 없을 때까지 최대 2회) */
export async function cleanupEphemeralQaDocumentsViaPage(page, options = {}) {
  let deleted = 0;
  const titles = [];
  for (let pass = 0; pass < 2; pass += 1) {
    const documents = await fetchActiveNoteDocumentsViaPage(page);
    const ids = collectEphemeralQaDocumentIds(documents, options);
    if (ids.length === 0) break;
    const titleById = new Map(documents.map((doc) => [doc.id, doc.title]));
    await softDeleteDocumentsViaPage(page, ids);
    deleted += ids.length;
    for (const id of ids) titles.push(titleById.get(id) ?? id);
  }
  return { deleted, titles };
}

/** cleanup 후에도 ephemeral이 남아 있으면 메시지와 함께 목록 반환 */
export async function listRemainingEphemeralQaDocumentsViaPage(page, options = {}) {
  const documents = await fetchActiveNoteDocumentsViaPage(page);
  const ids = new Set(collectEphemeralQaDocumentIds(documents, options));
  return documents
    .filter((doc) => ids.has(doc.id))
    .map((doc) => ({ id: doc.id, title: doc.title }));
}

/**
 * Browser session cleanup first, service_role fallback second.
 * QA scripts must not leave Smoke/Regression documents behind just because the
 * page session is already broken by the failure being investigated.
 */
export async function cleanupEphemeralQaDocumentsBestEffort(page, options = {}) {
  const errors = [];
  if (page) {
    try {
      const cleaned = await cleanupEphemeralQaDocumentsViaPage(page, options);
      const remaining = await listRemainingEphemeralQaDocumentsViaPage(page, options);
      if (remaining.length === 0) {
        return { ...cleaned, remaining, via: 'page', errors };
      }
      errors.push(new Error(`page cleanup left ${remaining.length} document(s)`));
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }

  const cleaned = await cleanupEphemeralQaDocumentsViaService(options);
  return {
    ...cleaned,
    remaining: [],
    via: 'service',
    errors,
  };
}

async function resolveActorUserId(service) {
  const email = await resolveAdminEmail();
  const { data, error } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(`listUsers failed: ${error.message}`);
  const user = data.users.find((row) => row.email?.toLowerCase() === email.toLowerCase());
  if (!user?.id) throw new Error(`admin user not found for ${email}`);
  return user.id;
}

/** service_role로 ephemeral QA 문서 일괄 soft-delete (dev 서버 불필요) */
export async function cleanupEphemeralQaDocumentsViaService(options = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE, { auth: { persistSession: false } });
  const actorId = await resolveActorUserId(service);

  const { data, error } = await service
    .from('note_documents')
    .select('id, title, parent_id, deleted_at')
    .is('deleted_at', null);
  if (error) throw new Error(`note_documents list failed: ${error.message}`);

  const documents = data ?? [];
  const ids = collectEphemeralQaDocumentIds(documents, options);
  if (ids.length === 0) {
    return { deleted: 0, titles: [] };
  }

  const now = new Date().toISOString();
  const titleById = new Map(documents.map((doc) => [doc.id, doc.title]));

  for (const chunk of chunkIds(ids, 50)) {
    const { error: updateError } = await service
      .from('note_documents')
      .update({
        deleted_at: now,
        deleted_by: actorId,
        updated_at: now,
        updated_by: actorId,
      })
      .in('id', chunk)
      .is('deleted_at', null);
    if (updateError) throw new Error(`soft delete failed: ${updateError.message}`);
  }

  return {
    deleted: ids.length,
    titles: ids.map((id) => titleById.get(id) ?? id),
  };
}

function chunkIds(ids, size) {
  const chunks = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}
