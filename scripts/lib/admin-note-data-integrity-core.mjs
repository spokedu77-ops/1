export function readPageDocumentId(content) {
  const childId = typeof content?.page_document_id === 'string'
    ? content.page_document_id.trim()
    : '';
  return childId || null;
}

function byId(rows) {
  return new Map(rows.map((row) => [row.id, row]));
}

export function sortPageLinks(links) {
  return [...links].sort((left, right) => {
    const leftTime = Date.parse(left.updated_at ?? '');
    const rightTime = Date.parse(right.updated_at ?? '');
    return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0)
      || (left.order_index ?? 0) - (right.order_index ?? 0)
      || String(left.id).localeCompare(String(right.id));
  });
}

export function canonicalParentByChild(pageBlocks, documentIds) {
  const parentByChild = new Map();
  const linksByChild = new Map();
  for (const block of sortPageLinks(pageBlocks)) {
    const childId = readPageDocumentId(block.content);
    if (!childId || !documentIds.has(childId)) continue;
    const list = linksByChild.get(childId) ?? [];
    list.push(block);
    linksByChild.set(childId, list);
    if (childId === block.document_id) continue;
    if (!parentByChild.has(childId)) parentByChild.set(childId, block.document_id);
  }
  return { parentByChild, linksByChild };
}

export function collectIssues(documents, blocks) {
  const uniqueDocuments = [...byId(documents).values()];
  const uniqueBlocks = [...byId(blocks).values()];
  const documentMap = byId(uniqueDocuments);
  const blockMap = byId(uniqueBlocks);
  const activeDocuments = uniqueDocuments.filter((doc) => !doc.deleted_at);
  const activeDocumentIds = new Set(activeDocuments.map((doc) => doc.id));
  const activePageBlocks = uniqueBlocks.filter((block) =>
    block.type === 'page'
    && !block.deleted_at
    && activeDocumentIds.has(block.document_id));
  const { parentByChild, linksByChild } = canonicalParentByChild(activePageBlocks, activeDocumentIds);

  const selfParentDocuments = [];
  const staleParentDocuments = [];
  const missingPageBlocks = [];
  const selfPageLinks = [];
  const duplicatePageLinks = [];
  const missingBlockParents = [];
  const crossDocumentBlockParents = [];
  const activeBlocksInDeletedDocuments = [];

  for (const doc of activeDocuments) {
    if (doc.parent_id === doc.id) {
      selfParentDocuments.push(doc);
      continue;
    }
    const canonicalParent = parentByChild.get(doc.id) ?? null;
    if (doc.parent_id !== canonicalParent) {
      if (doc.parent_id && activeDocumentIds.has(doc.parent_id) && !canonicalParent) {
        missingPageBlocks.push({ child: doc, parent: documentMap.get(doc.parent_id) });
      } else {
        staleParentDocuments.push({ doc, canonicalParent });
      }
    }
  }

  for (const [childId, links] of linksByChild.entries()) {
    for (const link of links) {
      if (link.document_id === childId) selfPageLinks.push(link);
    }
    const nonSelfLinks = links.filter((link) => link.document_id !== childId);
    if (nonSelfLinks.length > 1) {
      duplicatePageLinks.push({ child: documentMap.get(childId), links: nonSelfLinks });
    }
  }

  for (const block of uniqueBlocks) {
    const document = documentMap.get(block.document_id);
    if (!block.deleted_at && document?.deleted_at) {
      activeBlocksInDeletedDocuments.push({ block, document });
    }
    if (!block.parent_block_id || block.deleted_at) continue;
    const parent = blockMap.get(block.parent_block_id);
    if (!parent || parent.deleted_at) {
      missingBlockParents.push(block);
      continue;
    }
    if (parent.document_id !== block.document_id) {
      crossDocumentBlockParents.push({ block, parent });
    }
  }

  return {
    selfParentDocuments,
    staleParentDocuments,
    missingPageBlocks,
    selfPageLinks,
    duplicatePageLinks,
    missingBlockParents,
    crossDocumentBlockParents,
    activeBlocksInDeletedDocuments,
  };
}

export function countIssues(issues) {
  return Object.values(issues).reduce((sum, list) => sum + list.length, 0);
}
