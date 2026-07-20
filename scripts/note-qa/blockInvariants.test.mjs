import assert from 'node:assert/strict';
import test from 'node:test';
import {
  auditBlockInvariants,
  canPlaceBlockTypeInParent,
  countCriticalInvariantIssues,
  readBlockText,
} from './blockInvariants.mjs';

test('mirrors the note block parent contract', () => {
  assert.equal(canPlaceBlockTypeInParent('todo', null), true);
  assert.equal(canPlaceBlockTypeInParent('page', 'page'), true);
  assert.equal(canPlaceBlockTypeInParent('bulletList', 'toggle'), true);
  assert.equal(canPlaceBlockTypeInParent('page', 'toggle'), false);
  assert.equal(canPlaceBlockTypeInParent('toggle', 'toggle'), false);
  assert.equal(canPlaceBlockTypeInParent('todo', 'todo'), false);
});

test('detects parent, cycle, forbidden placement, and order drift', () => {
  const blocks = [
    { id: 'a', document_id: 'doc', type: 'todo', parent_block_id: null, order_index: 0, content: { text: 'A' } },
    { id: 'b', document_id: 'doc', type: 'todo', parent_block_id: null, order_index: 0, content: { text: 'B' } },
    { id: 'c', document_id: 'doc', type: 'page', parent_block_id: 'a', order_index: 0, content: { title: 'Bad' } },
    { id: 'd', document_id: 'doc', type: 'text', parent_block_id: 'missing', order_index: 0, content: { text: 'D' } },
    { id: 'e', document_id: 'doc', type: 'toggle', parent_block_id: 'f', order_index: 0, content: { text: 'E' } },
    { id: 'f', document_id: 'doc', type: 'text', parent_block_id: 'e', order_index: 0, content: { text: 'F' } },
  ];

  const issues = auditBlockInvariants(blocks);

  assert.equal(issues.duplicateSiblingOrders.length, 1);
  assert.equal(issues.forbiddenParents.length, 2);
  assert.equal(issues.missingParents.length, 1);
  assert.equal(issues.cycles.length, 2);
  assert.equal(countCriticalInvariantIssues(issues) > 0, true);
});

test('empty visible rows are warnings, not critical failures', () => {
  const issues = auditBlockInvariants([
    { id: 'a', document_id: 'doc', type: 'todo', parent_block_id: null, order_index: 0, content: { text: '' } },
  ]);

  assert.equal(issues.emptyVisibleBlocks.length, 1);
  assert.equal(countCriticalInvariantIssues(issues), 0);
});

test('reads visible text from html-ish content', () => {
  assert.equal(readBlockText({ content: { text: '<p>&nbsp;Hello <b>there</b></p>' } }), 'Hello there');
});
