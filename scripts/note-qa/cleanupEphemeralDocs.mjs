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

/** QA 스크립트가 만드는 일회성 문서 제목 패턴 */
export function isEphemeralQaDocumentTitle(title) {
  if (typeof title !== 'string') return false;
  const trimmed = title.trim();
  if (!trimmed) return false;
  if (trimmed === 'Smoke QA' || trimmed.startsWith('Smoke ')) return true;
  if (trimmed.startsWith('Typing QA ')) return true;
  if (trimmed.startsWith('Regression QA ')) return true;
  if (trimmed === '스모크 하위') return true;
  return false;
}

/** 삭제 대상 id — 제목 매칭 + ephemeral 부모의 하위 문서 포함 */
export function collectEphemeralQaDocumentIds(documents) {
  const toDelete = new Set();

  for (const doc of documents) {
    if (PROTECTED_IDS.has(doc.id)) continue;
    if (isEphemeralQaDocumentTitle(doc.title)) toDelete.add(doc.id);
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

/** 브라우저 세션(Playwright page)으로 ephemeral QA 문서 휴지통 이동 */
export async function cleanupEphemeralQaDocumentsViaPage(page) {
  const documents = await fetchActiveNoteDocumentsViaPage(page);
  const ids = collectEphemeralQaDocumentIds(documents);
  if (ids.length === 0) {
    return { deleted: 0, titles: [] };
  }
  const titleById = new Map(documents.map((doc) => [doc.id, doc.title]));
  await softDeleteDocumentsViaPage(page, ids);
  return {
    deleted: ids.length,
    titles: ids.map((id) => titleById.get(id) ?? id),
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
export async function cleanupEphemeralQaDocumentsViaService() {
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
  const ids = collectEphemeralQaDocumentIds(documents);
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
