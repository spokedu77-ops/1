# Admin Note Notion Contract

This file defines the minimum Notion-like contract for Admin Note. New fixes should preserve these rules instead of adding symptom-level workarounds.

## Scope

The supported Notion-like surface is intentionally small:

- Toggle blocks
- Checklist blocks
- Child documents represented as page blocks
- Marquee multi-select
- Drag movement, including dropping blocks into child documents

## Block Tree Contract

- Every visual block belongs to exactly one document through `document_id`.
- Block nesting is represented only by `parent_block_id`.
- Root blocks have `parent_block_id = null`.
- Sibling order is represented only by `order_index` within the same `parent_block_id`.
- Moving a block moves its whole subtree. Descendants must not become orphaned.
- A block cannot be moved into its own descendant.
- Soft-deleting a block soft-deletes its active subtree. A delete path must not leave active children pointing at a deleted or missing parent block.
- Restoring a deleted block restores descendants from the same delete batch. If the restored root's parent is missing or still deleted, the root is restored at document root instead of keeping a broken `parent_block_id`.
- Toggle blocks do not own a separate content body model. Toggle children are regular blocks whose `parent_block_id` is the toggle block id.
- Legacy toggle body fields are migration input only. Migration may create or fill one child block, but a migrated toggle must not recreate deleted children from stored legacy body fields.
- If a toggle already has displayable children, legacy body cleanup must avoid data loss. Do not silently merge or delete that archive unless the body has a deterministic child target or a cleanup path after child deletion.
- Checklist blocks use the same tree model as other blocks. Checked state is `content.checked`; nesting is not a separate checklist-only data model.

## Child Document Contract

- A child document is a normal `note_documents` row.
- A parent document contains a `type = "page"` block that points to the child through `content.page_document_id`.
- The canonical parent of a child document is the host document of its active page block.
- If duplicate active page blocks point to the same child document, the newest active page block is canonical. Reconcile must be deterministic and must not depend on database return order.
- `note_documents.parent_id` is a projection for listing and search. It must be repaired from active page blocks, not treated as the source of truth.
- Deleting or moving a page block changes child-document parent projection.
- Moving a child document creates or moves the page block; it must not rely on `parent_id` alone.
- Deleting a child document must also soft-delete every active page block that points to it. This is a server responsibility, not a best-effort client cleanup.
- Clients may optimistically remove page links from local UI after document delete, but they must not own database page-link cleanup.
- Restoring a child document with a live parent must ensure an active page block exists in that parent. Restore must not rely on `parent_id` alone.
- A page block must not point to its own document.
- Renaming a child document must sync every active page block title that points to it, preserving other page block content fields. Placeholder document titles may be enriched from page block titles, but real document titles must not be overwritten by page block display text.
- Production data integrity must be audited with `npm run audit:admin-note-data`. The audit is dry-run by default; safe repairs require `node scripts/admin-note-data-integrity.mjs --apply`.

## Marquee And Drag Contract

- Marquee selection produces visual-order block ids.
- A drag from a marquee selection moves only top-level selected roots; selected descendants of those roots are implied and must not be moved twice.
- Dropping a block or selected block forest onto a page block with `inside` intent transfers the forest to the target child document.
- A document transfer must reject any selected root forest that contains a page block pointing to the target document. This prevents self-link page blocks after cross-document moves.
- Dropping a page block inside another page block is not document insertion; it is coerced to before or after the target page block at both drop-target resolution and drag-end execution layers.
- Dropping inside a non-page block reparents the selected root forest under that block when the block tree contract allows it.

## Sync Contract

- Structural changes and text/content patches are different classes of operations.
- Remote snapshots must not wipe local unpublished structural intent.
- When local structure is authoritative, `type`, `parent_block_id`, `order_index`, and `document_id` stay local; incoming snapshots may update content, version, and timestamps for the same block id.
- Outbound coalescing may collapse repeated `patch_content` operations, but it must preserve structural operations and their order. Explicit `parent_block_id: null` is a meaningful root move and must not be stripped.
- Op replay and the `note_apply_block_transaction` RPC must apply `block_transaction` deterministically as field patches, soft deletes, then creates. Local replay and server materialization must share the same payload meaning.
- The `note_apply_block_transaction` RPC expands `deleteIds` to active descendants before soft-delete. Callers may send roots, but server materialization must preserve the subtree delete contract.
- Reconcile code may repair projections, but it must not silently invent a second source of truth.

## Load And Cost Contract

- Performance fixes must not bypass `syncWithServer`, toggle migration cleanup, child-document reconciliation, or structural-authority merge rules.
- Bootstrap snapshots are allowed to reduce duplicate network calls only when they flow through the same document-open path as an ordinary block load.
- Database reads for active block trees, active page links, and active document lists must be supported by explicit indexes instead of relying on broad scans as note volume grows.
- Idle note screens must not poll note APIs unless a feature explicitly requires live refresh. Realtime or user-triggered refresh should be preferred over timer-based reloads.
- Temporary QA/smoke documents must be deleted or soft-deleted at the end of the script that created them.

## Save Trust Contract

- The UI must not report content as saved merely because a local outbound op was queued.
- Debounced content edits may batch locally, but once flushed they must request immediate server push before showing the saved state.
- If server push fails or remains pending, the note must stay in a pending/error state instead of silently implying durable persistence.
- Content edits must write a synchronous emergency draft before the debounce/server push path. The draft is cleared only after the corresponding content patch is persisted, and newer emergency drafts may recover over stale server snapshots on document load.
- Missing-content investigations must start with `node scripts/admin-note-search-data.mjs <terms...>` before assuming a rendering bug.
