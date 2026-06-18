import { getActiveEditorBridgeSnapshot } from './noteActiveEditorBridge';
import { getNoteEditor } from '../_components/noteEditorRegistry';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import type { NoteBlock } from './types';
import { stripListItemMarkerPrefix } from '../_components/noteBulletInput';

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
    if (fromStore.content === block.content) return block;
    return { ...block, content: fromStore.content };
  });
}

/** 문서 전환·블록 비우기 직전 — 싱글톤 TipTap의 미반영 입력을 스토어/저장 경로로 밀어 넣는다 */
export function commitActiveNoteEditorToStore(): void {
  const config = getActiveEditorBridgeSnapshot();
  if (!config) return;
  const editor = getNoteEditor(config.blockId);
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
  currentBlocks: NoteBlock[],
  reconciledBlocks: NoteBlock[],
): NoteBlock[] {
  const store = useNoteBlockStore.getState();
  const activeId = store.activeEditor?.blockId;
  const activeDocumentId = store.activeDocumentId;
  const currentById = new Map(currentBlocks.map((block) => [block.id, block]));

  return reconciledBlocks.map((block) => {
    if (activeDocumentId && block.document_id !== activeDocumentId) return block;
    const fromStore = store.byId[block.id];
    const fromCurrent = currentById.get(block.id);

    if (block.id === activeId && fromStore?.content) {
      if (activeDocumentId && fromStore.document_id !== activeDocumentId) return block;
      return { ...block, content: fromStore.content };
    }

    if (fromStore?.content) {
      if (activeDocumentId && fromStore.document_id !== activeDocumentId) return block;
      const serverText = typeof block.content?.text === 'string' ? block.content.text : '';
      const storeText = typeof fromStore.content?.text === 'string' ? fromStore.content.text : '';
      if (storeText !== serverText) {
        return { ...block, content: fromStore.content };
      }
      if (fromCurrent && fromStore.content !== fromCurrent.content) {
        return { ...block, content: fromStore.content };
      }
    }

    return block;
  });
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
