import type { NoteBlock } from './types';
import { ensureNoteBlockVersion, normalizeNoteBlockVersion, withExpectedVersion } from './noteBlockVersion';
import {
  chunkNoteBlockPatches,
  NOTE_BLOCK_PATCH_BATCH_MAX,
} from '@/app/lib/note/noteBlockBatch';

export type NoteBlockFieldPatch = {
  id: string;
  type?: string;
  content?: unknown;
  baseContent?: Record<string, unknown>;
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

const MAX_VERSION_CONFLICT_RETRIES = 6;

function contentRecordsEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? {}) === JSON.stringify(right ?? {});
}

/** 409 재시도 시 큐·스토어에 더 새로운 content가 있으면 반영 */
function changedContentKeys(
  base: Record<string, unknown>,
  next: Record<string, unknown>,
): string[] {
  const keys = new Set([...Object.keys(base), ...Object.keys(next)]);
  return [...keys].filter((key) => base[key] !== next[key]);
}

function stripLocalPatchMeta(patch: NoteBlockFieldPatch): NoteBlockFieldPatch {
  const serverPatch = { ...patch };
  delete serverPatch.baseContent;
  return serverPatch;
}

function applyLiveContentOnConflictRetry(
  patch: NoteBlockFieldPatch,
  conflict: PatchedNoteBlock | undefined,
  getLiveBlock: NoteBlockVersionLookup | undefined,
): NoteBlockFieldPatch {
  if (patch.content === undefined || !getLiveBlock) return patch;
  const live = getLiveBlock(patch.id);
  const liveContent = live?.content;
  if (!liveContent || typeof liveContent !== 'object') return patch;
  if (
    patch.baseContent
    && conflict?.content
    && typeof conflict.content === 'object'
  ) {
    const intendedContent = liveContent as Record<string, unknown>;
    const changedKeys = changedContentKeys(patch.baseContent, intendedContent);
    const mergedContent = { ...(conflict.content as Record<string, unknown>) };
    for (const key of changedKeys) {
      mergedContent[key] = intendedContent[key];
    }
    return { ...patch, content: mergedContent };
  }
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

/** 409 충돌은 최신 서버 version을 흡수한 뒤 같은 저장 의도를 반복 재시도한다. */
function buildVersionedPatches(
  patches: NoteBlockFieldPatch[],
  getLiveBlock: NoteBlockVersionLookup | undefined,
  conflictMap = new Map<string, PatchedNoteBlock>(),
): NoteBlockFieldPatch[] {
  return patches.map((patch) => {
    const conflict = conflictMap.get(patch.id);
    const resolvedPatch = conflictMap.size > 0
      ? applyLiveContentOnConflictRetry(patch, conflict, getLiveBlock)
      : patch;
    return withExpectedVersion(
      stripLocalPatchMeta(resolvedPatch),
      versionSourceForPatch(resolvedPatch, getLiveBlock, conflictMap),
    );
  });
}

export async function patchNoteBlocksResolvingConflicts(
  updates: NoteBlockFieldPatch[],
  getLiveBlock?: NoteBlockVersionLookup,
): Promise<PatchedNoteBlock[]> {
  if (updates.length === 0) return [];

  const patchChunk = async (
    chunk: NoteBlockFieldPatch[],
  ): Promise<PatchedNoteBlock[]> => {
    let conflictMap = new Map<string, PatchedNoteBlock>();
    for (let attempt = 0; attempt <= MAX_VERSION_CONFLICT_RETRIES; attempt += 1) {
      try {
        return await patchNoteBlockBatch(
          buildVersionedPatches(chunk, getLiveBlock, conflictMap),
        );
      } catch (error) {
        if (!(error instanceof NoteBlockVersionConflictError)) throw error;
        if (attempt === MAX_VERSION_CONFLICT_RETRIES) throw error;
        conflictMap = new Map(error.conflicts.map((block) => [block.id, block]));
      }
    }
    return [];
  };

  const patched: PatchedNoteBlock[] = [];
  for (const chunk of chunkNoteBlockPatches(updates)) {
    patched.push(...await patchChunk(chunk));
  }
  return patched;
}

export type CreateNoteBlockPayload = {
  id?: string;
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
async function patchNoteBlockBatch(
  updates: NoteBlockFieldPatch[],
): Promise<PatchedNoteBlock[]> {
  if (updates.length === 0) return [];
  if (updates.length > NOTE_BLOCK_PATCH_BATCH_MAX) {
    throw new Error(`Note block patch batch exceeds ${NOTE_BLOCK_PATCH_BATCH_MAX} updates.`);
  }
  const serverUpdates = updates.map(stripLocalPatchMeta);
  const res = await fetch('/api/admin/note/blocks', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(serverUpdates.length === 1 ? serverUpdates[0] : { updates: serverUpdates }),
  });
  if (!res.ok) await parseApiError(res, '블록 저장 실패');
  const json = await res.json().catch(() => ({}));
  return parsePatchedBlocks(json);
}

/** 서버 제한에 맞춰 블록 필드 패치를 순차 저장한다. */
export async function patchNoteBlocks(
  updates: NoteBlockFieldPatch[],
): Promise<PatchedNoteBlock[]> {
  if (updates.length === 0) return [];

  const patched: PatchedNoteBlock[] = [];
  for (const chunk of chunkNoteBlockPatches(updates)) {
    patched.push(...await patchNoteBlockBatch(chunk));
  }
  return patched;
}

export async function restoreNoteBlockFromTrash(id: string): Promise<NoteBlock[]> {
  const res = await fetch('/api/admin/note/blocks/trash/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ id }),
  });
  if (!res.ok) await parseApiError(res, '블록 복구 실패');
  const json = (await res.json().catch(() => ({}))) as {
    block?: NoteBlock;
    blocks?: NoteBlock[];
  };
  const block = json.block;
  if (!block || typeof block.id !== 'string') {
    throw new Error('블록 복구 응답이 올바르지 않습니다');
  }
  const restored = Array.isArray(json.blocks) && json.blocks.length > 0
    ? json.blocks
    : [block];
  return restored.map(ensureNoteBlockVersion);
}

export async function postNoteBlockTransaction(
  updates: NoteBlockFieldPatch[],
  deleteIds: string[],
  getLiveBlock?: NoteBlockVersionLookup,
): Promise<PatchedNoteBlock[]> {
  const merged = new Map<string, NoteBlockFieldPatch>();
  for (const update of updates) {
    merged.set(update.id, { ...merged.get(update.id), ...update });
  }
  const patches = [...merged.values()];
  let conflictMap = new Map<string, PatchedNoteBlock>();
  for (let attempt = 0; attempt <= MAX_VERSION_CONFLICT_RETRIES; attempt += 1) {
    const res = await fetch('/api/admin/note/blocks/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        updates: buildVersionedPatches(patches, getLiveBlock, conflictMap),
        deleteIds,
      }),
    });
    try {
      if (!res.ok) await parseApiError(res, '블록 트랜잭션 저장 실패');
      return parsePatchedBlocks(await res.json().catch(() => ({})));
    } catch (error) {
      if (!(error instanceof NoteBlockVersionConflictError)) throw error;
      if (attempt === MAX_VERSION_CONFLICT_RETRIES) throw error;
      conflictMap = new Map(error.conflicts.map((block) => [block.id, block]));
    }
  }
  return [];
}

export async function postNoteBlockCreateTransaction(
  create: CreateNoteBlockPayload,
  updates: NoteBlockFieldPatch[],
  getLiveBlock?: NoteBlockVersionLookup,
): Promise<{ createdBlock: NoteBlock; patchedBlocks: PatchedNoteBlock[] }> {
  let conflictMap = new Map<string, PatchedNoteBlock>();
  for (let attempt = 0; attempt <= MAX_VERSION_CONFLICT_RETRIES; attempt += 1) {
    const res = await fetch('/api/admin/note/blocks/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        updates: buildVersionedPatches(updates, getLiveBlock, conflictMap),
        deleteIds: [],
        creates: [{
          id: create.id,
          document_id: create.documentId,
          parent_block_id: create.parent_block_id ?? null,
          type: create.blockType,
          order_index: create.order_index ?? 0,
          content: create.content,
        }],
      }),
    });
    try {
      if (!res.ok) await parseApiError(res, '블록 생성 트랜잭션 실패');
      const json = await res.json().catch(() => ({})) as {
        blocks?: PatchedNoteBlock[];
        createdBlocks?: NoteBlock[];
      };
      const createdBlock = json.createdBlocks?.[0];
      if (!createdBlock?.id) throw new Error('생성된 블록 응답이 없습니다.');
      return {
        createdBlock: ensureNoteBlockVersion(createdBlock),
        patchedBlocks: parsePatchedBlocks(json),
      };
    } catch (error) {
      if (!(error instanceof NoteBlockVersionConflictError)) throw error;
      if (attempt === MAX_VERSION_CONFLICT_RETRIES) throw error;
      conflictMap = new Map(error.conflicts.map((block) => [block.id, block]));
    }
  }
  throw new Error('생성된 블록 응답이 없습니다.');
}

export async function purgeNoteBlockFromTrash(id: string): Promise<void> {
  const res = await fetch(`/api/admin/note/blocks/trash/purge?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) await parseApiError(res, '블록 영구 삭제 실패');
}
