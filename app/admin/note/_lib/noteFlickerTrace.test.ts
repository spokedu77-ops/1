import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  initNoteFlickerTrace,
  traceApiEgress,
  traceRealtime,
  traceSnapshotDecision,
} from './noteFlickerTrace';
import { describeSnapshotDiff } from './noteSnapshotEquivalence';
import type { NoteBlock } from './types';

function block(id: string, content: Record<string, unknown>, overrides: Partial<NoteBlock> = {}): NoteBlock {
  return {
    id,
    document_id: 'doc-1',
    parent_block_id: null,
    type: 'text',
    order_index: 0,
    content,
    created_at: '2026-07-09T00:00:00Z',
    updated_at: '2026-07-09T00:00:00Z',
    ...overrides,
  };
}

describe('noteFlickerTrace', () => {
  beforeEach(() => {
    window.localStorage.setItem('NOTE_FLICKER_TRACE', '1');
    initNoteFlickerTrace();
    window.__noteFlickerTrace?.reset();
  });

  afterEach(() => {
    window.localStorage.removeItem('NOTE_FLICKER_TRACE');
    window.__noteFlickerTrace?.disable();
  });

  it('records snapshot skip/dispatch and api egress', () => {
    traceSnapshotDecision('coordinator:push', 'skip', 'equivalent', 'doc-1');
    traceSnapshotDecision('coordinator:pull', 'dispatch', 'content_diff', 'doc-1');
    traceApiEgress('pullOps', 'doc-1');
    traceRealtime('suppressed', 'doc-1');

    const dump = window.__noteFlickerTrace?.dump();
    expect(dump?.counters.snapshotSkip).toBe(1);
    expect(dump?.counters.snapshotDispatch).toBe(1);
    expect(dump?.counters.api.pullOps).toBe(1);
    expect(dump?.counters.realtime.suppressed).toBe(1);
    expect(dump?.counters.snapshotByOrigin['coordinator:pull']?.dispatch).toBe(1);
  });
});

describe('describeSnapshotDiff', () => {
  it('treats content key order differences as equivalent', () => {
    const left = [block('a', { text: 'hi', html: '<p>hi</p>' })];
    const right = [block('a', { html: '<p>hi</p>', text: 'hi' })];
    expect(describeSnapshotDiff(left, right, 'doc-1')).toBe('equivalent');
  });
});
