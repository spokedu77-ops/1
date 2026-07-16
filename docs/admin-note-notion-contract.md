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

## Marquee And Drag Contract

- Marquee selection produces visual-order block ids.
- A drag from a marquee selection moves only top-level selected roots; selected descendants of those roots are implied and must not be moved twice.
- Dropping a block or selected block forest onto a page block with `inside` intent transfers the forest to the target child document.
- A document transfer must reject any selected root forest that contains a page block pointing to the target document. This prevents self-link page blocks after cross-document moves.
- Dropping a page block inside another page block is not document insertion; it is coerced to before or after the target page block.
- Dropping inside a non-page block reparents the selected root forest under that block when the block tree contract allows it.

## Sync Contract

- Structural changes and text/content patches are different classes of operations.
- Remote snapshots must not wipe local unpublished structural intent.
- When local structure is authoritative, `type`, `parent_block_id`, `order_index`, and `document_id` stay local; incoming snapshots may update content, version, and timestamps for the same block id.
- Outbound coalescing may collapse repeated `patch_content` operations, but it must preserve structural operations and their order. Explicit `parent_block_id: null` is a meaningful root move and must not be stripped.
- Op replay must apply `block_transaction` deterministically as field patches, soft deletes, then creates. Local replay and server materialization must share the same payload meaning.
- Reconcile code may repair projections, but it must not silently invent a second source of truth.
