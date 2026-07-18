/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  blockSupportsInsideDrop,
  resolveBlockDropTarget,
  resolveDropPositionForBlock,
  TOGGLE_TITLE_BAND_PX,
} from './noteDropResolver';
import type { DragEndEvent } from '@dnd-kit/core';
import type { NoteBlock } from './types';

describe('resolveDropPositionForBlock', () => {
  it('splits regular text blocks only before/after at midpoint', () => {
    const rect = { top: 100, height: 40 };
    expect(resolveDropPositionForBlock('text', rect, 110)).toBe('before');
    expect(resolveDropPositionForBlock('text', rect, 130)).toBe('after');
    expect(resolveDropPositionForBlock('heading1', rect, 125)).toBe('after');
  });

  it('never returns inside for non-container blocks', () => {
    const rect = { top: 0, height: 100 };
    for (const y of [10, 50, 90]) {
      const pos = resolveDropPositionForBlock('text', rect, y);
      expect(pos === 'before' || pos === 'after').toBe(true);
    }
  });

  it('uses title band for toggle before / inside / after', () => {
    const rect = { top: 100, height: TOGGLE_TITLE_BAND_PX };
    const titleBottom = 100 + 30;
    expect(resolveDropPositionForBlock('toggle', rect, 102, { titleBandBottom: titleBottom })).toBe('before');
    expect(resolveDropPositionForBlock('toggle', rect, 120, { titleBandBottom: titleBottom })).toBe('inside');
    expect(resolveDropPositionForBlock('toggle', rect, 133, { titleBandBottom: titleBottom })).toBe('after');
  });

  it('uses edge bands for page blocks', () => {
    const rect = { top: 0, height: 100 };
    expect(resolveDropPositionForBlock('page', rect, 10)).toBe('before');
    expect(resolveDropPositionForBlock('page', rect, 50)).toBe('inside');
    expect(resolveDropPositionForBlock('page', rect, 90)).toBe('after');
  });

  it('allows inside for list items in the center band', () => {
    const rect = { top: 0, height: 40 };
    expect(resolveDropPositionForBlock('bulletList', rect, 5)).toBe('before');
    expect(resolveDropPositionForBlock('bulletList', rect, 20)).toBe('inside');
    expect(resolveDropPositionForBlock('numberedList', rect, 35)).toBe('after');
  });

  it('allows inside for column blocks in the center band', () => {
    const rect = { top: 0, height: 80 };
    expect(resolveDropPositionForBlock('column', rect, 10)).toBe('before');
    expect(resolveDropPositionForBlock('column', rect, 40)).toBe('inside');
    expect(resolveDropPositionForBlock('column', rect, 70)).toBe('after');
  });
});

describe('blockSupportsInsideDrop', () => {
  it('matches container block types only', () => {
    expect(blockSupportsInsideDrop('toggle')).toBe(true);
    expect(blockSupportsInsideDrop('page')).toBe(true);
    expect(blockSupportsInsideDrop('column')).toBe(true);
    expect(blockSupportsInsideDrop('bulletList')).toBe(true);
    expect(blockSupportsInsideDrop('text')).toBe(false);
    expect(blockSupportsInsideDrop('heading1')).toBe(false);
  });
});

describe('resolveBlockDropTarget page insertion contract', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const pageBlock = (id: string, order_index: number): NoteBlock => ({
    id,
    document_id: 'doc',
    parent_block_id: null,
    type: 'page',
    order_index,
    content: { title: id, page_document_id: `${id}-doc` },
    created_at: '',
    updated_at: '',
  });

  it('coerces block-inside page-on-page drops to before or after', () => {
    document.body.innerHTML = '<div data-note-block-row data-block-id="target"></div>';
    const row = document.querySelector<HTMLElement>('[data-block-id="target"]');
    row!.getBoundingClientRect = () => ({
      top: 100,
      bottom: 140,
      left: 0,
      right: 200,
      width: 200,
      height: 40,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    }) as DOMRect;

    const blocks = [pageBlock('moving', 0), pageBlock('target', 1)];
    const event = { over: null } as unknown as DragEndEvent;

    expect(resolveBlockDropTarget('block-inside:target', blocks, event, 110, 'moving')).toEqual({
      blockId: 'target',
      position: 'before',
    });
    expect(resolveBlockDropTarget('block-inside:target', blocks, event, 130, 'moving')).toEqual({
      blockId: 'target',
      position: 'after',
    });
  });

  it('coerces page-on-page center-band drops to before or after in fallback resolver', () => {
    const blocks = [pageBlock('moving', 0), pageBlock('target', 1)];
    const event = {
      over: {
        rect: {
          top: 100,
          height: 100,
        },
      },
    } as unknown as DragEndEvent;

    expect(resolveBlockDropTarget('target', blocks, event, 145, 'moving')).toEqual({
      blockId: 'target',
      position: 'before',
    });
    expect(resolveBlockDropTarget('target', blocks, event, 155, 'moving')).toEqual({
      blockId: 'target',
      position: 'after',
    });
  });
});
