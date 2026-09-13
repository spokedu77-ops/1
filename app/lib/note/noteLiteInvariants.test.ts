import { describe, expect, it } from 'vitest';
import {
  assignSiblingOrdersFromEncounter,
  canClientPersistSnapshot,
  densifyDuplicateSiblingOrders,
  isNoteLiteBlockType,
  shouldRejectEmptySnapshot,
  siblingRelativeOrderSignature,
  sortLiteBlocksForDisplay,
} from './noteLiteInvariants';

describe('noteLiteInvariants', () => {
  it('허용 타입만 라이트 블록이다', () => {
    expect(isNoteLiteBlockType('text')).toBe(true);
    expect(isNoteLiteBlockType('todo')).toBe(true);
    expect(isNoteLiteBlockType('table')).toBe(false);
    expect(isNoteLiteBlockType('toggle')).toBe(false);
  });

  it('서버에 글이 있으면 빈 스냅샷을 거부한다', () => {
    expect(
      shouldRejectEmptySnapshot({ existingLiveCount: 3, incomingCount: 0, allowEmpty: false }),
    ).toBe(true);
    expect(
      shouldRejectEmptySnapshot({ existingLiveCount: 3, incomingCount: 0, allowEmpty: true }),
    ).toBe(false);
    expect(
      shouldRejectEmptySnapshot({ existingLiveCount: 0, incomingCount: 0, allowEmpty: false }),
    ).toBe(false);
  });

  it('hydrate 전·다른 문서 스냅샷은 저장하지 않는다', () => {
    expect(
      canClientPersistSnapshot({
        hydrated: false,
        openDocumentId: 'a',
        snapshotDocumentId: 'a',
      }),
    ).toBe(false);
    expect(
      canClientPersistSnapshot({
        hydrated: true,
        openDocumentId: 'a',
        snapshotDocumentId: 'b',
      }),
    ).toBe(false);
    expect(
      canClientPersistSnapshot({
        hydrated: true,
        openDocumentId: 'a',
        snapshotDocumentId: 'a',
      }),
    ).toBe(true);
  });

  it('로드 표시 순서는 order_index이고 동점은 만남 순서다', () => {
    const rows = [
      { id: 'b', parent_block_id: null, order_index: 1 },
      { id: 'a', parent_block_id: null, order_index: 0 },
      { id: 'c', parent_block_id: null, order_index: 1 },
    ];
    expect(sortLiteBlocksForDisplay(rows).map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('중복 order일 때만 densify하고 만남 순서를 지킨다', () => {
    const dup = [
      { id: 'x', parent_block_id: null, order_index: 0 },
      { id: 'y', parent_block_id: null, order_index: 0 },
    ];
    expect(densifyDuplicateSiblingOrders(dup).map((r) => r.order_index)).toEqual([0, 1]);
    const unique = [
      { id: 'x', parent_block_id: null, order_index: 2 },
      { id: 'y', parent_block_id: null, order_index: 5 },
    ];
    expect(densifyDuplicateSiblingOrders(unique)).toEqual(unique);
  });

  it('저장 시 형제 순서는 배열 등장 순이다', () => {
    const rows = [
      { id: 'z', parent_block_id: null, order_index: 99 },
      { id: 'a', parent_block_id: null, order_index: 0 },
    ];
    const next = assignSiblingOrdersFromEncounter(rows);
    expect(next.map((r) => r.id)).toEqual(['z', 'a']);
    expect(next.map((r) => r.order_index)).toEqual([0, 1]);
    expect(siblingRelativeOrderSignature(next)).toBe('root:z|root:a');
  });
});
