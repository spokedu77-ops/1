import type { NoteDocument } from './types';

export type NoteDocumentPatch = {
  id: string;
  title?: string;
  parent_id?: string | null;
  properties?: NoteDocument['properties'];
  is_pinned?: boolean;
  is_favorite?: boolean;
  is_public?: boolean;
  is_archived?: boolean;
  slug?: string;
};

export async function patchNoteDocument(patch: NoteDocumentPatch): Promise<NoteDocument> {
  const res = await fetch('/api/admin/note/documents', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    throw new Error((j as { error?: string } | null)?.error || '문서 저장 실패');
  }
  const json = (await res.json()) as { document: NoteDocument };
  if (!json.document || typeof json.document.id !== 'string') {
    throw new Error('문서 저장 응답이 올바르지 않습니다');
  }
  return json.document;
}
