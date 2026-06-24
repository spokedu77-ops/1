import type { NoteBlock } from './types';
import { ensureNoteBlockVersion, normalizeNoteBlockVersion, withExpectedVersion } from './noteBlockVersion';

export type NoteBlockFieldPatch = {
  id: string;
  type?: string;
  content?: unknown;
  order_index?: number;
  parent_block_id?: string | null;
  document_id?: string;
  expected_version?: number;
};

export type PatchedNoteBlock = Pick<
  NoteBlock,
  'id' | 'version' | 'updated_at' | 'content' | 'type' | 'order_index' | 'parent_block_id'
>;

export type NoteBlockVersionLookup = (
  id: string,
) => (Pick<NoteBlock, 'id' | 'version'> & Partial<Pick<NoteBlock, 'content'>>) | undefined;

function contentRecordsEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? {}) === JSON.stringify(right ?? {});
}

/** 409 재시도 시 큐·스토어에 더 새로운 content가 있으면 반영 */
function applyLiveContentOnConflictRetry(
  patch: NoteBlockFieldPatch,
  conflict: PatchedNoteBlock | undefined,
  getLiveBlock: NoteBlockVersionLookup | undefined,
): NoteBlockFieldPatch {
  if (patch.content === undefined || !getLiveBlock) return patch;
  const live = getLiveBlock(patch.id);
  const liveContent = live?.content;
  if (!liveContent || typeof liveContent !== 'object') return patch;
  if (contentRecordsEqual(patch.content, liveContent)) return patch;
  if (conflict?.content && contentRecordsEqual(liveContent, conflict.content)) return patch;
  return { ...patch, content: liveContent };
}

export class NoteBlockVersionConflictError extends Error {
  readonly conflicts: PatchedNoteBlock[];

  constructor(conflicts: PatchedNoteBlock[]) {
    super('version_conflict');
    this.name = 'NoteBlockVersionConflictError';
    this.conflicts = conflicts;
  }
}

function isPatchedBlock(item: unknown): item is PatchedNoteBlock {
  return !!item
    && typeof item === 'object'
    && typeof (item as PatchedNoteBlock).id === 'string'
    && typeof (item as PatchedNoteBlock).version === 'number';
}

function normalizePatchedBlock(item: PatchedNoteBlock): PatchedNoteBlock {
  return {
    ...item,
    version: normalizeNoteBlockVersion(item.version),
  };
}

/** PATCH 성공·409 충돌 응답에서 블록 스냅샷 추출 */
export function parsePatchedBlocks(payload: unknown): PatchedNoteBlock[] {
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as {
    blocks?: unknown;
    block?: unknown;
    conflicts?: unknown;
  };

  if (Array.isArray(record.conflicts)) {
    return record.conflicts.filter(isPatchedBlock).map(normalizePatchedBlock);
  }
  if (Array.isArray(record.blocks)) {
    return record.blocks.filter(isPatchedBlock).map(normalizePatchedBlock);
  }
  if (record.block && typeof record.block === 'object') {
    const block = record.block as PatchedNoteBlock;
    if (isPatchedBlock(block)) return [normalizePatchedBlock(block)];
  }
  return [];
}

async function parseApiError(res: Response, fallback: string): Promise<never> {
  const j = await res.json().catch(() => null);
  if (res.status === 409) {
    const conflicts = parsePatchedBlocks(j);
    if (conflicts.length > 0) {
      throw new NoteBlockVersionConflictError(conflicts);
    }
  }
  throw new Error((j as { error?: string } | null)?.error || fallback);
}

function versionSourceForPatch(
  patch: NoteBlockFieldPatch,
  getLiveBlock: NoteBlockVersionLookup | undefined,
  conflictMap: Map<string, PatchedNoteBlock>,
): Pick<NoteBlock, 'id' | 'version'> | undefined {
  const conflict = conflictMap.get(patch.id);
  if (conflict) {
    return { id: conflict.id, version: conflict.version };
  }
  return getLiveBlock?.(patch.id);
}

/** 409 시 서버 version으로 1회 재시도 */
export async function patchNoteBlocksResolvingConflicts(
  updates: NoteBlockFieldPatch[],
  getLiveBlock?: NoteBlockVersionLookup,
): Promise<PatchedNoteBlock[]> {
  if (updates.length === 0) return [];

  const buildPatches = (conflictMap = new Map<string, PatchedNoteBlock>()) =>
    updates.map((patch) => {
      const conflict = conflictMap.get(patch.id);
      const resolvedPatch = conflictMap.size > 0
        ? applyLiveContentOnConflictRetry(patch, conflict, getLiveBlock)
        : patch;
      return withExpectedVersion(
        resolvedPatch,
        versionSourceForPatch(resolvedPatch, getLiveBlock, conflictMap),
      );
    });

  try {
    return await patchNoteBlocks(buildPatches());
  } catch (error) {
    if (!(error instanceof NoteBlockVersionConflictError)) throw error;
    const conflictMap = new Map(error.conflicts.map((block) => [block.id, block]));
    return await patchNoteBlocks(buildPatches(conflictMap));
  }
}

export type CreateNoteBlockPayload = {
  documentId: string;
  blockType: string;
  content: unknown;
  order_index?: number;
  parent_block_id?: string | null;
};

/** 블록 생성 POST */
export async function postNoteBlock(payload: CreateNoteBlockPayload): Promise<NoteBlock> {
  const res = await fetch('/api/admin/note/blocks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      documentId: payload.documentId,
      type: payload.blockType,
      content: payload.content,
      ...(typeof payload.order_index === 'number' ? { order_index: payload.order_index } : {}),
      ...(payload.parent_block_id !== undefined ? { parent_block_id: payload.parent_block_id } : {}),
    }),
  });
  if (!res.ok) await parseApiError(res, '블록 추가 실패');
  const json = await res.json().catch(() => ({}));
  const block = (json as { block?: NoteBlock }).block;
  if (!block || typeof block.id !== 'string') {
    throw new Error('블록 추가 응답이 올바르지 않습니다');
  }
  return ensureNoteBlockVersion(block);
}

/** 블록 필드 1~N개 일괄 PATCH (N=1이면 기존 단건 형식) */
export async function patchNoteBlocks(updates: NoteBlockFieldPatch[]): Promise<PatchedNoteBlock[]> {
  if (updates.length === 0) return [];
  const res = await fetch('/api/admin/note/blocks', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates.length === 1 ? updates[0] : { updates }),
  });
  if (!res.ok) await parseApiError(res, '블록 저장 실패');
  const json = await res.json().catch(() => ({}));
  return parsePatchedBlocks(json);
}

/** 순서 PUT + 필드 PATCH — version 충돌 시 필드만 재시도 */
export async function putNoteBlockOrders(
  orders: { id: string; order_index: number }[],
  updates?: NoteBlockFieldPatch[],
  getLiveBlock?: NoteBlockVersionLookup,
): Promise<PatchedNoteBlock[]> {
  const hasOrders = orders.length > 0;
  const hasUpdates = !!updates && updates.length > 0;
  if (!hasOrders && !hasUpdates) return [];

  if (hasOrders) {
    const res = await fetch('/api/admin/note/blocks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ orders }),
    });
    if (!res.ok) await parseApiError(res, '블록 순서 저장 실패');
  }

  if (!hasUpdates) return [];
  return patchNoteBlocksResolvingConflicts(updates, getLiveBlock);
}

export async function restoreNoteBlockFromTrash(id: string): Promise<NoteBlock> {
  const res = await fetch('/api/admin/note/blocks/trash/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ id }),
  });
  if (!res.ok) await parseApiError(res, '블록 복구 실패');
  const json = (await res.json().catch(() => ({}))) as { block?: NoteBlock };
  const block = json.block;
  if (!block || typeof block.id !== 'string') {
    throw new Error('블록 복구 응답이 올바르지 않습니다');
  }
  return ensureNoteBlockVersion(block);
}

export async function purgeNoteBlockFromTrash(id: string): Promise<void> {
  const res = await fetch(`/api/admin/note/blocks/trash/purge?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) await parseApiError(res, '블록 영구 삭제 실패');
}
