export type NoteBlockFieldPatch = {
  id: string;
  type?: string;
  content?: unknown;
  order_index?: number;
  parent_block_id?: string | null;
};

async function parseApiError(res: Response, fallback: string): Promise<never> {
  const j = await res.json().catch(() => null);
  throw new Error((j as { error?: string } | null)?.error || fallback);
}

/** 블록 필드 1~N개 일괄 PATCH (N=1이면 기존 단건 형식) */
export async function patchNoteBlocks(updates: NoteBlockFieldPatch[]): Promise<void> {
  if (updates.length === 0) return;
  const res = await fetch('/api/admin/note/blocks', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates.length === 1 ? updates[0] : { updates }),
  });
  if (!res.ok) await parseApiError(res, '블록 저장 실패');
}

/** 순서 PUT + 선택적 필드 일괄 갱신 (depth·content 등) */
export async function putNoteBlockOrders(
  orders: { id: string; order_index: number }[],
  updates?: NoteBlockFieldPatch[],
): Promise<void> {
  const hasOrders = orders.length > 0;
  const hasUpdates = !!updates && updates.length > 0;
  if (!hasOrders && !hasUpdates) return;

  const body: { orders?: typeof orders; updates?: NoteBlockFieldPatch[] } = {};
  if (hasOrders) body.orders = orders;
  if (hasUpdates) body.updates = updates;

  const res = await fetch('/api/admin/note/blocks', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseApiError(res, '블록 순서 저장 실패');
}
