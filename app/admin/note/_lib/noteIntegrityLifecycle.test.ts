/**
 * Integrity lifecycle — Save Trust + delete Intent + passive seal을 한 줄기로 잠근다.
 * 조각 unit만 통과하고 edit→flush→switch→reload / 삭제→부활이 다시 열리는 걸 막는다.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import { applyNoteCommand } from './noteCommandReducer';
import { buildDeleteBlockForestCommand } from './noteBlockCommands';
import {
  applyNoteEmergencyDrafts,
  clearNoteEmergencyDrafts,
  saveNoteEmergencyDraft,
} from './noteEmergencyDrafts';
import { mergePassiveIncomingContent, sealPassiveIncomingBlock } from './noteDataIntegrity';
import { mergeServerBlocksIntoLocalSnapshot } from './notePersistOpToBlockOps';
import {
  registerNoteSaveTrustGate,
  reportNoteDurableSave,
} from './noteSaveTrust';
import { setNoteContentSavePending } from './notePendingSave';
import type { NoteBlock } from './types';

function block(id: string, overrides: Partial<NoteBlock> = {}): NoteBlock {
  return {
    id,
    document_id: 'doc-1',
    parent_block_id: null,
    type: 'text',
    order_index: 0,
    content: { text: id, html: `<p>${id}</p>` },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
    ...overrides,
  };
}

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => { map.delete(key); },
    setItem: (key, value) => { map.set(key, value); },
  };
}

describe('integrity lifecycle (edit → flush → switch → reload)', () => {
  beforeEach(() => {
    setNoteContentSavePending(false);
    registerNoteSaveTrustGate(null);
    useNoteBlockStore.setState({
      byId: {},
      order: [],
      activeDocumentId: 'doc-1',
      activeEditor: null,
    });
  });

  it('keeps authored text through passive seal + gated save + doc switch hydrate', async () => {
    const authored = block('a', {
      content: { text: '작성본문', html: '<p>작성본문</p>' },
      version: 2,
    });
    useNoteBlockStore.getState().hydrate([authored]);

    // flush 전: saved 금지
    setNoteContentSavePending(true);
    const pendingSave = vi.fn();
    await expect(reportNoteDurableSave({
      onSaved: vi.fn(),
      onPending: pendingSave,
    })).resolves.toBe(false);
    expect(pendingSave).toHaveBeenCalled();

    setNoteContentSavePending(false);
    registerNoteSaveTrustGate({
      hasPendingContent: () => false,
      hasPendingOutbound: async () => false,
    });
    const onSaved = vi.fn();
    await expect(reportNoteDurableSave({ onSaved })).resolves.toBe(true);
    expect(onSaved).toHaveBeenCalledOnce();

    // 다른 문서 열었다가 다시 오면: empty/stale remote가 본문을 지우면 안 됨
    const sealed = sealPassiveIncomingBlock(
      authored,
      block('a', { content: { text: '', html: '<p></p>' }, version: 9 }),
    );
    expect(sealed.content?.text).toBe('작성본문');

    const { blocks: afterSwitch } = applyNoteCommand(
      [authored],
      {
        type: 'syncSnapshot',
        blocks: [block('a', { content: { text: '다른탭덮어쓰기', html: '<p>다른탭덮어쓰기</p>' }, version: 9 })],
      },
      { documentId: 'doc-1', activeBlockId: null, storeContentById: {} },
    );
    expect(afterSwitch.find((item) => item.id === 'a')?.content?.text).toBe('작성본문');
  });

  it('delete Intent drops local IDB + drafts so reload cannot resurrect', () => {
    const storage = memoryStorage();
    const keep = block('keep', { order_index: 0, content: { text: '남음' } });
    const gone = block('gone', {
      order_index: 1,
      content: { text: '지움', html: '<p>지움</p>' },
      created_at: '2020-01-01T00:00:00.000Z',
    });
    saveNoteEmergencyDraft('doc-1', 'gone', { text: '지움' }, storage);

    const command = buildDeleteBlockForestCommand([keep, gone], ['gone']);
    expect(command.removedBlocks.map((item) => item.id)).toContain('gone');

    // 제품 삭제 choke와 동일: deleteIds에 draft clear
    clearNoteEmergencyDrafts('doc-1', command.removedBlocks.map((item) => item.id), storage);

    const afterDelete = command.nextBlocks;
    const serverAfterAck = [keep];
    const merged = mergeServerBlocksIntoLocalSnapshot(
      [...afterDelete, gone], // stale IDB still had gone
      serverAfterAck,
      new Set(['gone']),
      { pruneLocalOnlyNotOnServer: true },
    );
    expect(merged.map((item) => item.id)).toEqual(['keep']);

    const { blocks: reopened } = applyNoteCommand(
      merged,
      { type: 'syncSnapshot', blocks: serverAfterAck },
      {
        documentId: 'doc-1',
        activeBlockId: null,
        storeContentById: {},
        pendingLeaveIds: new Set(['gone']),
      },
    );
    expect(reopened.map((item) => item.id)).toEqual(['keep']);

    const recovered = applyNoteEmergencyDrafts(
      'doc-1',
      reopened,
      storage,
    );
    expect(recovered.blocks.find((item) => item.id === 'gone')).toBeUndefined();
    expect(recovered.blocks.find((item) => item.id === 'keep')?.content?.text).toBe('남음');
    expect(recovered.recovered.some((draft) => draft.blockId === 'gone')).toBe(false);
  });

  it('passive merge never treats intentional empty wipe of authored text as fill', () => {
    const next = mergePassiveIncomingContent(
      { text: '작성본문', checked: true },
      { text: '', checked: false },
    );
    expect(next.text).toBe('작성본문');
    expect(next.checked).toBe(true);
  });
});
