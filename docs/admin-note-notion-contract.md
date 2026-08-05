# Admin Note Notion Contract

This file defines the minimum Notion-like contract for Admin Note. New fixes should preserve these rules instead of adding symptom-level workarounds.

## Foundation: Data Preservation (ZERO LOSS)

**The product baseline for Admin Note is data preservation, not feature completeness.**

Precedence when contracts tension:

```
ZERO LOSS (this section)  >  Sync / Save Trust  >  Editing C1–C6
```

| Tension | Winner |
|---------|--------|
| Silent body wipe protection vs soft-delete / purge / leave | **Delete Intent** (no resurrection) |
| Silent body/check change vs editing UX (C1–C6) | **ZERO LOSS** (do not invent a new C-number) |
| Unsent local vs ACK'd remote Intent | **ACK'd remote Intent** — passive seal blocks stale only |
| Open with no topology outbound | **Server sibling order** |
| Densify vs create renumber | Densify only on **duplicate orders** + encounter order; create `0..n-1` is **C1 Intent** |

Notion-like editing grammar is C1–C6. Silent overwrite on save/merge is ZERO LOSS — they do not contradict when precedence is applied.

- User-authored text, callout bodies, checklist text/checked, html marks, and sibling relative order must not change or disappear without an explicit Intent.
- `ACK ≡ materialize`: a regressive `patch_content` must not be committed to the op-log as a successful content write. Rejected ops must not clear emergency drafts or flip UI to `saved`.
- Content authority is a **single** shared predicate: `app/lib/note/noteContentAuthority.ts` (`shouldIgnoreRegressiveContentPatch`). Server, push filter, flush, and passive merge must not invent alternate length/LWW rules. `decideRegressiveContentOp` is only an outbound empty/prefix prefilter — **not** the authority SSOT.
- Equal-length rewrites (e.g. `1400만원` ↔ `1100만원`) without a matching `baseContent` are forbidden. Same for silent `checked` flips and html-only rewrites without matching base.
- Sibling densify runs only on duplicate `order_index` and must preserve encounter order (never reshuffle by id).
- Document leave/switch must not drop pending content because the store row is temporarily missing.

If a change makes the UI look saved while reload shows older text or a scrambled checklist, it is a P0 contract break — fix the choke, do not add a hook-level workaround.

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
- Checklist blocks use the same tree model as other blocks. Checked state is `content.checked`; nesting is **only** `parent_block_id` (never `content.listNestLevel`). Tab indent, DnD inside, paste nest depth, and empty-Enter outdent must all use that tree. Legacy `listNestLevel` values are migration input on document load only and must be stripped from content after conversion.

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
- Marquee hit-testing is scoped to the active editor `[data-note-marquee-zone]` and then filtered to the open document's visual block ids. It must not select rows outside that zone.
- A drag from a marquee selection moves only top-level selected roots; selected descendants of those roots are implied and must not be moved twice.
- Dropping a block or selected block forest onto a page block with `inside` intent transfers the forest to the target child document.
- A document transfer must reject any selected root forest that contains a page block pointing to the target document. This prevents self-link page blocks after cross-document moves.
- Dropping a page block inside another page block is not document insertion; it is coerced to before or after the target page block at both drop-target resolution and drag-end execution layers.
- Dropping inside a non-page block reparents the selected root forest under that block when the block tree contract allows it.
- **Placement (all documents):** inbound roots from DnD `inside` or cross-document transfer land at the **top** of the target sibling group (newest on top). Existing siblings shift down. The full sibling group is renumbered to unique `order_index` values `0..n-1`. Transfer must load the target document's current root siblings before assigning orders so inbound indexes do not collide with existing roots.
- Enter / `+` insert still place the new block **after** the focused block (cursor-below). That is a different gesture from inbound DnD/transfer placement.
- **Paste (all documents):** multi-block copy from block chrome selection or cross-select writes the same `NOTE_BLOCKS_JSON` clipboard. Structural paste uses one insert mode helper: block-clipboard paste always **inserts after** the anchor (never overwrites). TipTap HTML/MD/plain multi-block paste fills only a truly blank live anchor; otherwise inserts after. Live store content (not stale props) decides blankness.
- **Paste fidelity (foundation, not cosmetic):** HTML/MD clipboard → block specs must be lossless for the supported surface and must not invent duplicates or glyph junk.
  - Nested `UL`/`OL` under an `LI` must become **separate child specs only**. Parent LI `text`/`html` must be extracted **after removing nested lists** so the same phrase is not stored twice.
  - Notion-like bullet glyph nodes (lone `.` / `•` / `aria-hidden` markers, glyph-only DIVs) must be stripped. They must never become their own text blocks or prefixes on list body text.
  - List-type paste content must run through the same list marker normalize path as loaded list blocks (`normalizeListBlockContentRecord` / marker strip).
  - Regression tests must fail on nested-LI duplication and glyph-only DIV paste. Fixing paste only in `NoteEditor` UI without the HTML/MD parser choke is a contract violation.

## Sync Contract

- Structural changes and text/content patches are different classes of operations.
- Remote snapshots must not wipe local unpublished structural intent.
- When local structure is authoritative (`hasUnpublishedTopology` / preserve_local), `type`, `parent_block_id`, `order_index`, and `document_id` stay local. When structure authority is **incoming** (idle), `syncSnapshot` / `mergeSnapshots` must project incoming order/parent — they must not unconditionally overwrite incoming positions with local ones.
- **Data integrity (foundation):** Passive paths must not change user-authored payload without an explicit Intent. The shared gate is `shouldIgnoreRegressiveContentPatch` (text / checked / html). Clearing, truncating, equal-length replacement, or non-extension rewrite of non-empty local text is forbidden. Passive may only fill empty local text or apply a **strict extension**: incoming starts with local, is longer, local trimmed length is **> 2**, and the suffix has **no newline** (blocks paste residue). Short-prefix false hits like `"A"` → `"A server"` are forbidden. `checked` / html-only flips without matching base are forbidden. `page_document_id` / media ids must not clear while local still holds them. Every passive hole uses `mergePassiveIncomingContent` / `sealPassiveIncomingBlock` (which call the shared predicate). **Adding a new passive merge that assigns `content` from server/remote without seal is a contract violation.**
- **Intentional delete is Intent, not passive wipe:** Soft-delete / purge / leave-exclude is an explicit user (or system leave) Intent. Integrity must not resurrect deleted block ids.
  - Soft-delete enqueue must clear emergency drafts for those ids. Product delete uses `persistBlockTransaction(deleteIds)`: draft clear, content-patch clear, and `markPendingBlockDeletes` (leave-exclude) on that choke. TipTap late `scheduleContentPatch` for excluded/missing ids must not rewrite drafts or store.
  - `mergeServerBlocksIntoLocalSnapshot` must **drop** pending-delete / leave-exclude ids from the **local** side, not only skip re-adding them from the server.
  - When outbound is empty, local-only ids absent from the authoritative server snapshot must be pruned after create grace (`LOCAL_ONLY_BLOCK_GRACE_MS`). Stale IDB rows for already-deleted blocks must not reappear on open/sync.
  - Empty-snapshot race protection (`reject_race_wipe`) still applies to **unconfirmed** empty loads. It must not be used as a reason to keep soft-deleted ids that leave-exclude or server absence already confirmed.
- Sibling `order_index` compaction is allowed only when duplicates exist. Sanitize must not rewrite unique orders solely to densify 0..n-1.
- Outbound coalescing may collapse repeated `patch_content` operations, but it must preserve structural operations and their order. Explicit `parent_block_id: null` is a meaningful root move and must not be stripped.
- Op replay and the `note_apply_block_transaction` RPC must apply `block_transaction` deterministically as field patches, soft deletes, then creates. Local replay and server materialization must share the same payload meaning.
- The `note_apply_block_transaction` RPC expands `deleteIds` to active descendants before soft-delete. Callers may send roots, but server materialization must preserve the subtree delete contract.
- Reconcile code may repair projections, but it must not silently invent a second source of truth.
- **Project:** Coordinator transport updates (`push` / `pull` / `applyRemote` / leader broadcast) must project into the UI only through pipeline `syncSnapshot` (`dispatchSnapshotIfChanged`). Skipping `onBlocksUpdated` or writing store from coordinator callbacks directly is forbidden.
- **Pull:** `pipeline.schedulePull` must call coordinator pull. Idle/realtime invalidate must not be a no-op.

## Load And Cost Contract

- Performance fixes must not bypass `syncWithServer`, toggle migration cleanup, child-document reconciliation, or structural-authority merge rules.
- Bootstrap snapshots are allowed to reduce duplicate network calls only when they flow through the same document-open path as an ordinary block load.
- First paint must not apply remembered/session/IndexedDB block snapshots as authoritative document content. A stale local snapshot may be useful for diagnostics or recovery, but the visible document tree must be established by the server/bootstrap open path. Document switch must clear the store projection and keep the editor skeleton until `openNoteDocument` settles (`loadSettledDocId`).
- Body whitespace clicks must not create blocks. Current product behavior is selection-clear only (`handleClickEditorWhitespace`). Re-introducing whitespace create without a `loadSettledDocId` gate and regression test is a contract violation.
- Database reads for active block trees, active page links, and active document lists must be supported by explicit indexes instead of relying on broad scans as note volume grows.
- Idle note screens must not poll note APIs unless a feature explicitly requires live refresh. Realtime or user-triggered refresh should be preferred over timer-based reloads.
- Temporary QA/smoke documents must be deleted or soft-deleted at the end of the script that created them.

## Save Trust Contract

- The UI must not report content as saved merely because a local outbound op was queued **or because the server ACKed an ignored regressive patch**.
- Debounced content edits may batch locally, but once flushed they must request immediate server push before showing the saved state.
- If server push fails, remains pending, or returns `rejectedClientOpIds` for content, the note must stay in a pending/error state instead of silently implying durable persistence.
- `triggerSave` / UI `saved` may fire only through `reportNoteDurableSave` (`noteSaveTrust`). Content debounce pending, outbound remaining, or content reject → never `saved`.
- Emergency drafts clear only after content patch **materialize** success (`onContentPersisted` only when `persistViaOpLog` returns true after a non-rejected content push).
- Content edits must write a synchronous emergency draft before the debounce/server push path. The draft is cleared only after the corresponding content patch is persisted, and newer emergency drafts may recover over stale server snapshots on document load.
- Missing-content investigations must start with `node scripts/admin-note-search-data.mjs <terms...>` before assuming a rendering bug.
- **Integrity gate:** After edit → save flush → document switch → reload, the same block ids must keep the same user-authored content unless the user explicitly changed them. Regression suites must fail on silent content clear/truncate (`noteDataIntegrity` / `noteSyncVerification`).

## QA Contract

- `npm run test:admin-note` is the unit-level contract for block trees, paste, undo, sync, cleanup, and shared note helpers.
- `npm run qa:admin-note` is the fast always-on browser contract. It must include the real regression case for the Choi Jihoon work note: repeated reloads must keep the `7월 업무 히스토리` page block visible and must not create stored blank root input blocks from load-time body clicks.
- `npm run qa:admin-note-regression` is the deeper browser editing contract. It covers document switching, hard refresh, toggle child body display, deleted block non-resurrection, legacy toggle-body cleanup, Backspace focus behavior, and idle typing persistence.
- CI **always** runs `verify:admin-note` (vitest + ops materialization + tsc). Foundation / regression Playwright E2E and DB audits run **only when** repository secrets are configured; when secrets are missing the E2E job skips with an explicit honesty notice (do not claim "CI always runs foundation"). When secrets exist, regression editing QA runs on pull_request as well as main/manual.
- QA scripts must clean only their own temporary document title families. Foundation cleanup must not delete Regression/Toggle QA documents, and regression cleanup must not delete Foundation QA documents.
- QA auth helpers should tolerate transient Supabase magic-link invalidation with bounded retry. Authentication flake must not be confused with product data loss.
- Load profiling uses `node scripts/admin-note-load-profile.mjs`. The default profile document should remain a stable, real-world admin note with child-page links, currently Choi Jihoon's work note.
