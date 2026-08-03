import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { canPlaceBlockTypeInParent } from '@/app/lib/note/noteBlockPolicy';
import { devLogger } from '@/app/lib/logging/devLogger';

type NoteBlock = {
  id: string;
  document_id: string;
  parent_block_id: string | null;
  type: string;
  order_index: number;
  content: unknown;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  version: number;
};

const BLOCK_SELECT =
  'id, document_id, parent_block_id, type, order_index, content, created_at, updated_at, deleted_at, deleted_by, version';

export function collectRestoreSubtreeIds(rootId: string, rows: NoteBlock[]): string[] {
  const restoreIds = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of rows) {
      if (!row.parent_block_id || !restoreIds.has(row.parent_block_id) || restoreIds.has(row.id)) {
        continue;
      }
      restoreIds.add(row.id);
      changed = true;
    }
  }
  return [...restoreIds];
}

/**
 * root가 될 수 없는 타입(column 등)은 삭제된 조상 컨테이너까지 복구 집합에 넣는다.
 */
export function expandRestoreAncestorIds(
  restoreIds: Iterable<string>,
  documentRows: NoteBlock[],
): string[] {
  const byId = new Map(documentRows.map((row) => [row.id, row]));
  const result = new Set(restoreIds);
  for (const id of [...result]) {
    let cursor = byId.get(id);
    while (cursor?.parent_block_id) {
      if (canPlaceBlockTypeInParent(cursor.type, null)) break;
      const parent = byId.get(cursor.parent_block_id);
      if (!parent?.deleted_at) break;
      result.add(parent.id);
      cursor = parent;
    }
  }
  return [...result];
}

export function collectRestoreParentDetachIds(restoreIds: Iterable<string>, documentRows: NoteBlock[]): string[] {
  const restoreSet = new Set(restoreIds);
  const liveOrRestoringIds = new Set(
    documentRows
      .filter((row) => !row.deleted_at || restoreSet.has(row.id))
      .map((row) => row.id),
  );
  return documentRows
    .filter((row) => restoreSet.has(row.id))
    .filter((row) => row.parent_block_id && !liveOrRestoringIds.has(row.parent_block_id))
    // root 불가 타입은 detach 금지 — expandRestoreAncestorIds가 조상을 넣었어야 함
    .filter((row) => canPlaceBlockTypeInParent(row.type, null))
    .map((row) => row.id);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === 'string' ? body.id : null;
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const now = new Date().toISOString();
    const { data: root, error: rootError } = await supabase
      .from('note_blocks')
      .select(BLOCK_SELECT)
      .eq('id', id)
      .not('deleted_at', 'is', null)
      .maybeSingle();

    if (rootError) {
      devLogger.error('[admin/note/blocks/trash/restore] root error', rootError);
      return NextResponse.json({ error: rootError.message }, { status: 500 });
    }
    if (!root) {
      return NextResponse.json({ error: 'Block is not in trash' }, { status: 400 });
    }

    const { data: documentRows, error: batchError } = await supabase
      .from('note_blocks')
      .select(BLOCK_SELECT)
      .eq('document_id', root.document_id)
      .limit(1000);
    if (batchError) {
      devLogger.error('[admin/note/blocks/trash/restore] batch error', batchError);
      return NextResponse.json({ error: batchError.message }, { status: 500 });
    }

    const rows = (documentRows ?? []) as NoteBlock[];
    const deletedBatch = rows.filter((row) => row.deleted_at === root.deleted_at);
    const restoreIdSet = new Set(collectRestoreSubtreeIds(id, deletedBatch));
    for (const ancestorId of expandRestoreAncestorIds(restoreIdSet, rows)) {
      restoreIdSet.add(ancestorId);
      for (const childId of collectRestoreSubtreeIds(ancestorId, deletedBatch)) {
        restoreIdSet.add(childId);
      }
    }
    const restoreIds = [...restoreIdSet];
    const detachIds = collectRestoreParentDetachIds(restoreIds, rows);
    const illegalRootDetach = rows
      .filter((row) => restoreIdSet.has(row.id))
      .filter((row) => {
        if (!row.parent_block_id) return false;
        const parentLive = rows.some((candidate) => (
          candidate.id === row.parent_block_id
          && (!candidate.deleted_at || restoreIdSet.has(candidate.id))
        ));
        return !parentLive && !canPlaceBlockTypeInParent(row.type, null);
      })
      .map((row) => row.id);
    if (illegalRootDetach.length > 0) {
      return NextResponse.json(
        { error: '부모 컨테이너가 없어 이 블록을 복구할 수 없습니다. 상위 블록을 먼저 복구하세요.' },
        { status: 400 },
      );
    }

    if (detachIds.length > 0) {
      const { error: detachError } = await supabase
        .from('note_blocks')
        .update({
          parent_block_id: null,
          updated_at: now,
          updated_by: auth.userId,
        })
        .in('id', detachIds);
      if (detachError) {
        devLogger.error('[admin/note/blocks/trash/restore] detach error', detachError);
        return NextResponse.json({ error: detachError.message }, { status: 500 });
      }
    }

    const { data: restored, error: restoreError } = await supabase
      .from('note_blocks')
      .update({
        deleted_at: null,
        deleted_by: null,
        updated_at: now,
        updated_by: auth.userId,
      })
      .in('id', restoreIds)
      .not('deleted_at', 'is', null)
      .select(BLOCK_SELECT);

    if (restoreError) {
      devLogger.error('[admin/note/blocks/trash/restore] restore error', restoreError);
      return NextResponse.json({ error: restoreError.message }, { status: 500 });
    }

    const restoredBlocks = (restored ?? []) as NoteBlock[];
    const restoredRoot = restoredBlocks.find((block) => block.id === id);
    if (!restoredRoot) {
      return NextResponse.json({ error: 'Block restore failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, block: restoredRoot, blocks: restoredBlocks });
  } catch (err) {
    devLogger.error('[admin/note/blocks/trash/restore] POST exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}
