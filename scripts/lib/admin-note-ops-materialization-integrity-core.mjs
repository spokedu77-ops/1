function opTimeMs(op) {
  const ms = Date.parse(op.created_at ?? op.createdAt ?? '');
  return Number.isFinite(ms) ? ms : 0;
}

function opSeq(op) {
  const seq = Number(op.seq);
  return Number.isFinite(seq) ? seq : 0;
}

function blockUpdatedAfterOp(block, op) {
  const blockMs = Date.parse(block?.updated_at ?? '');
  const opMs = opTimeMs(op);
  return Number.isFinite(blockMs) && blockMs > opMs + 1000;
}

function sortOps(ops) {
  return [...ops].sort((left, right) => (
    opTimeMs(left) - opTimeMs(right)
    || opSeq(left) - opSeq(right)
    || String(left.id ?? '').localeCompare(String(right.id ?? ''))
  ));
}

function payloadOf(op) {
  if (!op || typeof op !== 'object') return {};
  return op.payload && typeof op.payload === 'object' ? op.payload : {};
}

function contentText(content) {
  if (!content || typeof content !== 'object') return String(content ?? '').trim();
  const text = typeof content.text === 'string' ? content.text.trim() : '';
  if (text) return text;
  const html = typeof content.html === 'string' ? content.html.replace(/<[^>]+>/g, ' ').trim() : '';
  return html.replace(/\s+/g, ' ').trim();
}

function sameContent(left, right) {
  return contentText(left) === contentText(right);
}

function getLatestCreate(blockId, ops) {
  let latest = null;
  for (const op of ops) {
    const payload = payloadOf(op);
    if (payload.opType !== 'create_block' || payload.id !== blockId) continue;
    latest = op;
  }
  return latest;
}

function getLaterDestructiveEvent(blockId, patchOp, ops) {
  const patchTime = opTimeMs(patchOp);
  const patchSeq = opSeq(patchOp);
  for (const op of ops) {
    const payload = payloadOf(op);
    const isLater = opTimeMs(op) > patchTime || (opTimeMs(op) === patchTime && opSeq(op) > patchSeq);
    if (!isLater) continue;
    if (payload.opType === 'soft_delete' && Array.isArray(payload.ids) && payload.ids.includes(blockId)) {
      return { kind: 'soft_delete', op };
    }
    if (payload.opType === 'purge_block' && payload.id === blockId) {
      return { kind: 'purge_block', op };
    }
    if (payload.opType === 'patch_fields' && Array.isArray(payload.patches)) {
      const patch = payload.patches.find((item) => item?.id === blockId);
      if (patch && patch.content !== undefined && !contentText(patch.content)) {
        return { kind: 'empty_patch_fields', op };
      }
    }
    if (payload.opType === 'block_transaction') {
      if (Array.isArray(payload.deleteIds) && payload.deleteIds.includes(blockId)) {
        return { kind: 'block_transaction_delete', op };
      }
      const patch = Array.isArray(payload.patches)
        ? payload.patches.find((item) => item?.id === blockId)
        : null;
      if (patch && patch.content !== undefined && !contentText(patch.content)) {
        return { kind: 'block_transaction_empty_patch', op };
      }
    }
  }
  return null;
}

export function collectOpsMaterializationIssues(blocks, ops, options = {}) {
  const recentDeleteWindowMs = options.recentDeleteWindowMs ?? 10 * 60 * 1000;
  const strictOrder = options.strictOrder === true;
  const sortedOps = sortOps(ops);
  const blockById = new Map(blocks.map((block) => [block.id, block]));
  const activeBlocksByDocumentText = new Set(
    blocks
      .filter((block) => !block.deleted_at && block.document_id)
      .map((block) => `${block.document_id}\u0000${contentText(block.content)}`)
      .filter((key) => !key.endsWith('\u0000')),
  );
  const latestTextPatchByBlock = new Map();
  const latestTopologyPatchByBlock = new Map();

  for (const op of sortedOps) {
    const payload = payloadOf(op);
    if (payload.opType === 'patch_content') {
      if (typeof payload.blockId !== 'string') continue;
      if (!contentText(payload.content)) continue;
      latestTextPatchByBlock.set(payload.blockId, op);
      continue;
    }
    if (payload.opType === 'patch_fields' && Array.isArray(payload.patches)) {
      for (const patch of payload.patches) {
        if (!patch?.id || typeof patch.id !== 'string') continue;
        if (
          patch.order_index === undefined
          && patch.parent_block_id === undefined
          && patch.document_id === undefined
        ) continue;
        latestTopologyPatchByBlock.set(patch.id, { op, patch });
      }
      continue;
    }
    if (payload.opType === 'block_transaction' && Array.isArray(payload.patches)) {
      for (const patch of payload.patches) {
        if (!patch?.id || typeof patch.id !== 'string') continue;
        if (
          patch.order_index === undefined
          && patch.parent_block_id === undefined
          && patch.document_id === undefined
        ) continue;
        latestTopologyPatchByBlock.set(patch.id, { op, patch });
      }
    }
  }

  const missingLatestText = [];
  const suspiciousTextThenDelete = [];
  const staleMaterializedText = [];
  const staleMaterializedTopology = [];

  for (const [blockId, patchOp] of latestTextPatchByBlock.entries()) {
    const payload = payloadOf(patchOp);
    const block = blockById.get(blockId);
    const destructive = getLaterDestructiveEvent(blockId, patchOp, sortedOps);
    const createOp = getLatestCreate(blockId, sortedOps);
    const createDocumentId = payloadOf(createOp).documentId ?? null;
    if (createDocumentId && patchOp.document_id && createDocumentId !== patchOp.document_id) {
      continue;
    }
    const expectedText = contentText(payload.content);
    const expectedDocumentId = block?.document_id ?? patchOp.document_id ?? payload.documentId ?? payload.document_id ?? createDocumentId;
    const deletedAtMs = destructive ? opTimeMs(destructive.op) : 0;
    const patchAtMs = opTimeMs(patchOp);

    if (block && !block.deleted_at && patchOp.document_id && block.document_id !== patchOp.document_id) {
      continue;
    }
    if (expectedDocumentId && activeBlocksByDocumentText.has(`${expectedDocumentId}\u0000${expectedText}`)) {
      continue;
    }

    if (destructive) {
      if (deletedAtMs - patchAtMs <= recentDeleteWindowMs) {
        suspiciousTextThenDelete.push({
          blockId,
          documentId: expectedDocumentId,
          expectedContent: payload.content,
          expectedText,
          patchOp,
          destructive,
          block: block ?? null,
          createOp,
        });
      }
      continue;
    }

    if (!block || block.deleted_at) {
      missingLatestText.push({
        blockId,
        documentId: expectedDocumentId,
        expectedContent: payload.content,
        expectedText,
        patchOp,
        block: block ?? null,
        createOp,
      });
      continue;
    }

    if (blockUpdatedAfterOp(block, patchOp)) {
      continue;
    }
    if (!sameContent(payload.content, block.content)) {
      staleMaterializedText.push({
        blockId,
        documentId: block.document_id,
        expectedContent: payload.content,
        expectedText,
        actualContent: block.content,
        actualText: contentText(block.content),
        patchOp,
        block,
        createOp,
      });
    }
  }

  for (const [blockId, item] of latestTopologyPatchByBlock.entries()) {
    const { op, patch } = item;
    const block = blockById.get(blockId);
    const destructive = getLaterDestructiveEvent(blockId, op, sortedOps);
    if (destructive || !block || block.deleted_at) continue;
    if (blockUpdatedAfterOp(block, op)) continue;
    if (patch.document_id && block.document_id !== patch.document_id) continue;
    if (op.document_id && block.document_id !== op.document_id && !patch.document_id) continue;

    const expectedParent = patch.parent_block_id === undefined
      ? (block.parent_block_id ?? null)
      : (patch.parent_block_id ?? null);
    const expectedOrder = patch.order_index === undefined
      ? block.order_index
      : patch.order_index;
    const expectedDocument = patch.document_id ?? block.document_id;
    if (
      block.document_id !== expectedDocument
      || (block.parent_block_id ?? null) !== expectedParent
      || (strictOrder && block.order_index !== expectedOrder)
    ) {
      staleMaterializedTopology.push({
        blockId,
        documentId: op.document_id ?? block.document_id,
        expectedDocument,
        expectedParent,
        expectedOrder,
        actualDocument: block.document_id,
        actualParent: block.parent_block_id ?? null,
        actualOrder: block.order_index,
        op,
        patch,
        block,
        expectedText: contentText(block.content),
      });
    }
  }

  return {
    missingLatestText,
    staleMaterializedText,
    staleMaterializedTopology,
    suspiciousTextThenDelete,
  };
}

export function countOpsMaterializationIssues(issues) {
  return Object.values(issues).reduce((sum, list) => sum + list.length, 0);
}

export function readContentTextForOpsIntegrity(content) {
  return contentText(content);
}
