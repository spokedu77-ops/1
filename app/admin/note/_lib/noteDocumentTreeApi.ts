import type { NoteBlock, NoteDocument } from './types';

async function postTreeAction(body: Record<string, unknown>) {
  const response = await fetch('/api/admin/note/documents/tree', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error ?? '문서 트리 변경 실패');
  return json;
}

export async function createSubPageTree(input: {
  parentDocumentId: string;
  parentBlockId: string | null;
  orderIndex: number;
  title: string;
}): Promise<{ document: NoteDocument; pageBlock: NoteBlock; initialBlock: NoteBlock }> {
  const json = await postTreeAction({ action: 'createSubPage', ...input });
  return {
    document: json.document,
    pageBlock: json.page_block,
    initialBlock: json.initial_block,
  };
}

export async function reparentDocumentTree(input: {
  documentId: string;
  newParentId: string | null;
}): Promise<{ document: NoteDocument; pageBlock: NoteBlock | null }> {
  const json = await postTreeAction({ action: 'reparentDocument', ...input });
  return { document: json.document, pageBlock: json.page_block ?? null };
}
