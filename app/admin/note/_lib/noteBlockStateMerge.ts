import { getActiveEditorBridgeSnapshot } from './noteActiveEditorBridge';
import { getNoteEditor } from '../_components/noteEditorRegistry';
import { useNoteBlockStore, type NoteActiveEditorField } from '../_store/noteBlockStore';
import type { NoteBlock } from './types';
import {
  normalizeLoadedNoteBlocks,
  stripListItemMarkerPrefix,
} from '../_components/noteBulletInput';
import { dedupeNoteBlocksById } from '@/app/lib/note/noteBlockTree';
import { mergeBlockContentWithStore } from './noteContentPatch';

/** 서버 reconcile에 아직 없는 로컬 블록을 유지하는 최대 시간 (생성 직후만) */
export const LOCAL_ONLY_BLOCK_GRACE_MS = 5000;

/** 서버 스냅샷이 로컬보다 훨씬 많을 때 — regression guard를 건너뛰고 복구 */
export function serverSnapshotRecoversMissingBlocks(
  localBlocks: NoteBlock[],
  serverBlocks: NoteBlock[],
  documentId: string,
): boolean {
  const localCount = localBlocks.filter((block) => block.document_id === documentId).length;
  const serverCount = serverBlocks.filter((block) => block.document_id === documentId).length;
  if (serverCount === 0) return false;
  if (localCount === 0) return serverCount > 0;
  if (serverCount >= localCount + 2) return true;
  return serverCount > localCount * 1.25;
}

/**
 * React blocks 갱신 전 스토어에만 반영된 최신 content를 병합한다.
 * (타이핑은 syncBlockContent → 스토어, 구조 변경은 setBlocks → React)
 */
export function mergeBlocksWithStoreContent(blocks: NoteBlock[]): NoteBlock[] {
  const { byId, activeDocumentId } = useNoteBlockStore.getState();
  return blocks.map((block) => {
    if (activeDocumentId && block.document_id !== activeDocumentId) return block;
    const fromStore = byId[block.id];
    if (!fromStore?.content) return block;
    if (activeDocumentId && fromStore.document_id !== activeDocumentId) return block;
    const merged = mergeBlockContentWithStore(
      block.content as Record<string, unknown> | null | undefined,
      fromStore.content as Record<string, unknown>,
    );
    if (!merged || merged === block.content) return block;
    return { ...block, content: merged };
  });
}

/** 싱글톤 TipTap 내용을 스토어에 반영 — blockId·field가 bridge와 일치할 때만 */
export function commitNoteEditorBlock(
  blockId: string,
  field?: NoteActiveEditorField,
): void {
  const config = getActiveEditorBridgeSnapshot();
  if (!config || config.blockId !== blockId) return;
  if (field && config.field !== field) return;
  const editor = getNoteEditor(blockId);
  if (!editor || (editor as { isDestroyed?: boolean }).isDestroyed) return;
  try {
    const props = config.getProps();
    props.onChange?.({
      text: editor.getText(),
      html: editor.getHTML(),
    });
  } catch {
    // editor teardown race — 무시
  }
}

export function commitActiveNoteEditorToStore(): void {
  const config = getActiveEditorBridgeSnapshot();
  if (!config) return;
  commitNoteEditorBlock(config.blockId, config.field);
}

/** ↑ 이동 시 커서를 둘 문자 위치 — 스토어 최신 content 기준 */
export function resolveBlockTextCaretOffset(block: NoteBlock): number {
  const fromStore = useNoteBlockStore.getState().getBlock(block.id);
  const content = fromStore?.content ?? block.content;
  let text = typeof content?.text === 'string' ? content.text : '';
  if (block.type === 'bulletList' || block.type === 'numberedList') {
    text = stripListItemMarkerPrefix(text);
  }
  return text.length;
}

/** reconcile 로드 결과를 병합 — 편집 중 content는 스토어 우선, 구조·신규 블록은 서버 반영 */
export function mergeReconciledBlocks(
  _currentBlocks: NoteBlock[],
  reconciledBlocks: NoteBlock[],
): NoteBlock[] {
  const store = useNoteBlockStore.getState();
  const activeId = store.activeEditor?.blockId;
  const activeDocumentId = store.activeDocumentId;

  const merged = reconciledBlocks.map((block) => {
    if (activeDocumentId && block.document_id !== activeDocumentId) return block;
    const fromStore = store.byId[block.id];

    if (block.id === activeId && fromStore?.content) {
      if (activeDocumentId && fromStore.document_id !== activeDocumentId) return block;
      return {
        ...block,
        content: mergeBlockContentWithStore(
          block.content as Record<string, unknown> | null | undefined,
          fromStore.content as Record<string, unknown>,
        ),
      };
    }

    return block;
  });

  return dedupeNoteBlocksById(normalizeLoadedNoteBlocks(merged));
}

/** 서버 reconcile에 아직 없는 로컬 블록(생성 직후 등)을 유지 */
export function unionReconciledWithLocalBlocks(
  currentBlocks: NoteBlock[],
  reconciledBlocks: NoteBlock[],
  documentId: string,
): NoteBlock[] {
  const merged = mergeReconciledBlocks(currentBlocks, reconciledBlocks);
  const mergedIds = new Set(merged.map((block) => block.id));
  const now = Date.now();
  const localOnly = currentBlocks.filter((block) => {
    if (block.document_id !== documentId || mergedIds.has(block.id)) return false;
    if (!block.created_at) return false;
    const createdAt = new Date(block.created_at).getTime();
    if (!Number.isFinite(createdAt)) return false;
    return now - createdAt <= LOCAL_ONLY_BLOCK_GRACE_MS;
  });
  if (localOnly.length === 0) return merged;
  return dedupeNoteBlocksById([...merged, ...localOnly]);
}

/** idle reconcile이 로컬에서 바꾼 type 등 구조를 서버 스냅샷으로 되돌리려 할 때 */
export function wouldReconcileRegressLocalStructure(
  localBlocks: NoteBlock[],
  mergedBlocks: NoteBlock[],
): boolean {
  const localById = new Map(localBlocks.map((block) => [block.id, block]));
  return mergedBlocks.some((block) => {
    const local = localById.get(block.id);
    if (!local) return false;
    return local.type !== block.type
      || local.parent_block_id !== block.parent_block_id
      || local.order_index !== block.order_index;
  });
}

/** idle reconcile이 편집 중인 본문을 짧은 서버 스냅샷으로 되돌리려 할 때 */
export function wouldReconcileRegressActiveText(
  mergedBlocks: NoteBlock[],
): boolean {
  const store = useNoteBlockStore.getState();
  const activeId = store.activeEditor?.blockId;
  if (!activeId) return false;
  const storeBlock = store.byId[activeId];
  if (!storeBlock?.content) return false;
  const mergedBlock = mergedBlocks.find((block) => block.id === activeId);
  if (!mergedBlock) return false;
  const storeText = typeof storeBlock.content.text === 'string' ? storeBlock.content.text : '';
  const mergedText = typeof mergedBlock.content?.text === 'string' ? mergedBlock.content.text : '';
  return storeText.length > mergedText.length;
}

export function isActiveNoteEditorFocused(): boolean {
  const activeId = useNoteBlockStore.getState().activeEditor?.blockId;
  if (!activeId) return false;
  const editor = getNoteEditor(activeId);
  return Boolean(editor?.isFocused);
}

/** restore-blocks undo/redo 적용 */
export function applyRestoreBlockSnapshots(
  currentBlocks: NoteBlock[],
  snapshots: NoteBlock[],
): NoteBlock[] {
  const snapshotMap = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));
  const seen = new Set<string>();
  const next = currentBlocks.map((block) => {
    const snapshot = snapshotMap.get(block.id);
    if (!snapshot) return block;
    seen.add(block.id);
    return {
      ...block,
      type: snapshot.type,
      content: snapshot.content,
      parent_block_id: snapshot.parent_block_id,
      order_index: snapshot.order_index,
    };
  });
  for (const snapshot of snapshots) {
    if (!seen.has(snapshot.id) && !next.some((block) => block.id === snapshot.id)) {
      next.push(snapshot);
    }
  }
  return next;
}

/** 배치 content 저장(flushContentPatches) — useNoteBlockActions에서 등록 */
let registeredContentFlush: (() => Promise<void>) | null = null;

export function registerNoteContentFlush(fn: (() => Promise<void>) | null): void {
  registeredContentFlush = fn;
}

/** 문서 이탈 전 편집 내용을 최대한 보존 */
export async function commitNoteDocumentBeforeLeave(): Promise<void> {
  commitActiveNoteEditorToStore();
  if (registeredContentFlush) {
    try {
      await registeredContentFlush();
    } catch {
      // 저장 실패해도 스토어 커밋은 유지
    }
  }
}

/** 부모↔하위 문서 전환 시 에디터·스토어 격리 */
export function resetNoteDocumentEditorState(): void {
  const store = useNoteBlockStore.getState();
  store.setActiveEditor(null);
  store.setActiveDocumentId(null);
  store.hydrate([]);
}

/** 이탈 커밋 후 스토어 초기화 — 하위 문서 로드 전 부모 content 혼입 방지 */
export async function commitAndResetNoteDocumentBeforeSwitch(): Promise<void> {
  await commitNoteDocumentBeforeLeave();
  resetNoteDocumentEditorState();
}
