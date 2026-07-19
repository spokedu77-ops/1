import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectIssues,
  countIssues,
} from './admin-note-data-integrity-core.mjs';

test('detects missing and deleted block parents without deleting child data', () => {
  const issues = collectIssues(
    [doc('doc-a')],
    [
      block('deleted-parent', 'doc-a', { deleted_at: '2026-07-17T00:00:00.000Z' }),
      block('child-of-deleted', 'doc-a', { parent_block_id: 'deleted-parent' }),
      block('child-of-missing', 'doc-a', { parent_block_id: 'missing-parent' }),
    ],
  );

  assert.deepEqual(
    issues.missingBlockParents.map((item) => item.id).sort(),
    ['child-of-deleted', 'child-of-missing'],
  );
  assert.equal(countIssues(issues), 2);
});

test('detects cross-document block parents as a structural integrity issue', () => {
  const issues = collectIssues(
    [doc('doc-a'), doc('doc-b')],
    [
      block('parent', 'doc-a'),
      block('child', 'doc-b', { parent_block_id: 'parent' }),
    ],
  );

  assert.equal(issues.crossDocumentBlockParents.length, 1);
  assert.equal(issues.crossDocumentBlockParents[0].block.id, 'child');
  assert.equal(issues.crossDocumentBlockParents[0].parent.id, 'parent');
  assert.equal(countIssues(issues), 1);
});

test('keeps newest active non-self page block as canonical child document parent', () => {
  const issues = collectIssues(
    [
      doc('parent-old'),
      doc('parent-new'),
      doc('child', { parent_id: 'parent-old' }),
    ],
    [
      pageBlock('link-old', 'parent-old', 'child', {
        updated_at: '2026-07-17T00:00:00.000Z',
        order_index: 0,
      }),
      pageBlock('link-new', 'parent-new', 'child', {
        updated_at: '2026-07-17T01:00:00.000Z',
        order_index: 1,
      }),
    ],
  );

  assert.equal(issues.duplicatePageLinks.length, 1);
  assert.equal(issues.staleParentDocuments.length, 1);
  assert.equal(issues.staleParentDocuments[0].doc.id, 'child');
  assert.equal(issues.staleParentDocuments[0].canonicalParent, 'parent-new');
});

test('dedupes repeated rows from unstable paginated reads before duplicate-link checks', () => {
  const link = pageBlock('same-link-row', 'parent', 'child');
  const issues = collectIssues(
    [
      doc('parent'),
      doc('child', { parent_id: 'parent' }),
      doc('child', { parent_id: 'parent' }),
    ],
    [link, { ...link }],
  );

  assert.equal(issues.duplicatePageLinks.length, 0);
  assert.equal(countIssues(issues), 0);
});

test('does not treat self page links as canonical parents', () => {
  const issues = collectIssues(
    [doc('child', { parent_id: 'child' })],
    [pageBlock('self-link', 'child', 'child')],
  );

  assert.equal(issues.selfParentDocuments.length, 1);
  assert.equal(issues.selfPageLinks.length, 1);
});

test('detects active blocks inside deleted documents', () => {
  const issues = collectIssues(
    [doc('deleted-doc', { deleted_at: '2026-07-17T00:00:00.000Z' })],
    [
      block('active-leftover', 'deleted-doc'),
      block('already-deleted', 'deleted-doc', { deleted_at: '2026-07-17T00:00:01.000Z' }),
    ],
  );

  assert.equal(issues.activeBlocksInDeletedDocuments.length, 1);
  assert.equal(issues.activeBlocksInDeletedDocuments[0].block.id, 'active-leftover');
});

test('does not require page blocks for children of deleted documents', () => {
  const issues = collectIssues(
    [
      doc('deleted-parent', { deleted_at: '2026-07-17T00:00:00.000Z' }),
      doc('deleted-child', {
        parent_id: 'deleted-parent',
        deleted_at: '2026-07-17T00:00:00.000Z',
      }),
    ],
    [],
  );

  assert.equal(issues.missingPageBlocks.length, 0);
  assert.equal(issues.staleParentDocuments.length, 0);
});

function doc(id, overrides = {}) {
  return {
    id,
    title: id,
    parent_id: null,
    deleted_at: null,
    updated_at: '2026-07-17T00:00:00.000Z',
    ...overrides,
  };
}

function block(id, documentId, overrides = {}) {
  return {
    id,
    document_id: documentId,
    parent_block_id: null,
    type: 'text',
    order_index: 0,
    content: {},
    deleted_at: null,
    updated_at: '2026-07-17T00:00:00.000Z',
    ...overrides,
  };
}

function pageBlock(id, documentId, childId, overrides = {}) {
  return block(id, documentId, {
    type: 'page',
    content: { page_document_id: childId, title: childId },
    ...overrides,
  });
}
