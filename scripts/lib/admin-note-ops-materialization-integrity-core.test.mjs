import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectOpsMaterializationIssues,
  countOpsMaterializationIssues,
} from './admin-note-ops-materialization-integrity-core.mjs';

const patch = (seq, blockId, text) => ({
  seq,
  created_at: `2026-07-19T00:00:${String(seq).padStart(2, '0')}Z`,
  payload: {
    opType: 'patch_content',
    blockId,
    content: { text, html: `<p>${text}</p>` },
  },
});

test('passes when the latest text patch is materialized in the block table', () => {
  const issues = collectOpsMaterializationIssues([
    { id: 'block-1', document_id: 'doc-1', content: { text: 'saved' }, deleted_at: null },
  ], [
    patch(1, 'block-1', 'saved'),
  ]);

  assert.equal(countOpsMaterializationIssues(issues), 0);
});

test('flags a non-empty latest text patch whose block is missing', () => {
  const issues = collectOpsMaterializationIssues([], [
    {
      seq: 1,
      created_at: '2026-07-19T00:00:01Z',
      payload: {
        opType: 'create_block',
        id: 'block-1',
        documentId: 'doc-1',
        blockType: 'todo',
        content: { text: '' },
        parent_block_id: null,
      },
    },
    patch(2, 'block-1', 'lost text'),
  ]);

  assert.equal(issues.missingLatestText.length, 1);
  assert.equal(issues.missingLatestText[0].expectedText, 'lost text');
});

test('flags a recent text patch that is quickly emptied by a later field patch', () => {
  const issues = collectOpsMaterializationIssues([
    { id: 'block-1', document_id: 'doc-1', content: { text: '' }, deleted_at: null },
  ], [
    patch(1, 'block-1', 'lost text'),
    {
      seq: 2,
      created_at: '2026-07-19T00:00:02Z',
      payload: {
        opType: 'patch_fields',
        patches: [{ id: 'block-1', content: { text: '' } }],
      },
    },
  ], { strictOrder: true });

  assert.equal(issues.suspiciousTextThenDelete.length, 1);
  assert.equal(issues.suspiciousTextThenDelete[0].destructive.kind, 'empty_patch_fields');
});

test('passes when the lost block id was restored as an equivalent active block in the same document', () => {
  const issues = collectOpsMaterializationIssues([
    { id: 'restored-block', document_id: 'doc-1', content: { text: 'restored text' }, deleted_at: null },
  ], [
    {
      seq: 1,
      document_id: 'doc-1',
      created_at: '2026-07-19T00:00:01Z',
      payload: {
        opType: 'patch_content',
        blockId: 'lost-block',
        content: { text: 'restored text' },
      },
    },
  ]);

  assert.equal(countOpsMaterializationIssues(issues), 0);
});

test('flags a latest topology patch that was rolled back in materialized blocks', () => {
  const issues = collectOpsMaterializationIssues([
    {
      id: 'move-me',
      document_id: 'doc-1',
      parent_block_id: null,
      order_index: 5,
      content: { text: 'move me' },
      deleted_at: null,
    },
  ], [
    {
      seq: 1,
      document_id: 'doc-1',
      created_at: '2026-07-19T00:00:01Z',
      payload: {
        opType: 'block_transaction',
        patches: [{ id: 'move-me', parent_block_id: null, order_index: 1 }],
        deleteIds: [],
      },
    },
  ], { strictOrder: true });

  assert.equal(issues.staleMaterializedTopology.length, 1);
  assert.equal(issues.staleMaterializedTopology[0].expectedOrder, 1);
  assert.equal(issues.staleMaterializedTopology[0].actualOrder, 5);
});

test('flags a latest topology parent patch that was rolled back in materialized blocks', () => {
  const issues = collectOpsMaterializationIssues([
    {
      id: 'move-me',
      document_id: 'doc-1',
      parent_block_id: null,
      order_index: 1,
      content: { text: 'move me' },
      deleted_at: null,
    },
  ], [
    {
      seq: 1,
      document_id: 'doc-1',
      created_at: '2026-07-19T00:00:01Z',
      payload: {
        opType: 'block_transaction',
        patches: [{ id: 'move-me', parent_block_id: 'parent-1', order_index: 0 }],
        deleteIds: [],
      },
    },
  ]);

  assert.equal(issues.staleMaterializedTopology.length, 1);
  assert.equal(issues.staleMaterializedTopology[0].expectedParent, 'parent-1');
  assert.equal(issues.staleMaterializedTopology[0].actualParent, null);
});
