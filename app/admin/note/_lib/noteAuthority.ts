import { wouldReconcileRegressLocalStructure } from './noteBlockStateMerge';
import type { NoteBlock } from './types';

/**
 * Authority — open/pull/cache/content 충돌을 한곳에서 판정.
 * OpKind(Outbound)와 직교: 여기는 “누가 활성 집합·본문을 이겼는지”.
 */

export type EmptySnapshotDecision = 'accept_empty' | 'reject_race_wipe' | 'merge_non_empty';

export type RegressiveContentDecision = 'push' | 'drop_stale';

export type StructureReconcileDecision = 'accept_incoming' | 'preserve_local';

/**
 * 미ack topology op가 있을 때 incoming 구조가 로컬 reorder를 되돌리려 하면 local 유지.
 * outbound 없으면 coordinator/incoming 구조 authority (다중 탭·pull).
 */
export function decideStructureReconcile(input: {
  localBlocks: ReadonlyArray<NoteBlock>;
  incomingBlocks: ReadonlyArray<NoteBlock>;
  hasUnpublishedTopology: boolean;
}): StructureReconcileDecision {
  if (!input.hasUnpublishedTopology) return 'accept_incoming';
  if (wouldReconcileRegressLocalStructure(
    [...input.localBlocks],
    [...input.incomingBlocks],
  )) {
    return 'preserve_local';
  }
  return 'accept_incoming';
}

/** text/title 공통 — empty 보호·regressive content 동일 기준 */
export function readAuthorityBlockText(content: unknown): string {
  if (!content || typeof content !== 'object') return '';
  const record = content as Record<string, unknown>;
  for (const key of ['text', 'title', 'html', 'body', 'caption', 'url', 'page_document_id']) {
    const value = record[key];
    if (key === 'html' && isEmptyHtml(value)) continue;
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function isEmptyHtml(value: unknown): boolean {
  return value === ''
    || value === '<p></p>'
    || value === '<p><br></p>'
    || value === '<p><br class="ProseMirror-trailingBreak"></p>';
}

function contentHasStructuredPresence(content: unknown): boolean {
  if (!content || typeof content !== 'object') return false;
  return Object.entries(content as Record<string, unknown>).some(([key, value]) => {
    if (['checked', 'collapsed'].includes(key)) return false;
    if (typeof value === 'string') {
      if (key === 'html') return !isEmptyHtml(value);
      return value.trim().length > 0;
    }
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === 'object') return Object.keys(value).length > 0;
    return false;
  });
}

const STRUCTURAL_PRESENCE_TYPES = new Set([
  'image',
  'video',
  'table',
  'page',
  'columnList',
  'column',
  'divider',
  'embed',
]);

/** local에 보호할 활성 내용이 있는지 — race wipe 거부 */
export function documentHasProtectablePresence(
  blocks: ReadonlyArray<Pick<NoteBlock, 'type' | 'content'>>,
): boolean {
  return blocks.some((block) => {
    if (readAuthorityBlockText(block.content).length > 0) return true;
    if (STRUCTURAL_PRESENCE_TYPES.has(block.type)) return true;
    const content = block.content;
    return contentHasStructuredPresence(content);
  });
}

/** @deprecated alias — body text만 보던 이름 유지 */
export function documentHasProtectableBodyText(
  blocks: ReadonlyArray<Pick<NoteBlock, 'content'>>,
): boolean {
  return blocks.some((block) => readAuthorityBlockText(block.content).length > 0);
}

/**
 * 서버/remote가 []일 때 local을 비울지.
 * accept: emptyConfirmed · leave가 local id를 모두 설명 · local도 비었음 · 빈 stub만
 * reject: local에 보호할 내용이 있는데 unconfirmed empty (레이스 wipe)
 */
export function decideEmptySnapshotApply(input: {
  localBlocks: ReadonlyArray<Pick<NoteBlock, 'id' | 'type' | 'content'>>;
  incomingBlocks: ReadonlyArray<{ id: string }>;
  emptyConfirmed?: boolean;
  pendingLeaveIds?: ReadonlySet<string>;
}): EmptySnapshotDecision {
  if (input.incomingBlocks.length > 0) return 'merge_non_empty';
  if (input.localBlocks.length === 0) return 'accept_empty';
  if (input.emptyConfirmed === true) return 'accept_empty';

  const leave = input.pendingLeaveIds ?? new Set<string>();
  if (
    leave.size > 0
    && input.localBlocks.every((block) => leave.has(block.id))
  ) {
    return 'accept_empty';
  }

  // 빈 text stub만 남았으면 수용. 이미지·페이지·본문 등은 보호.
  if (!documentHasProtectablePresence(input.localBlocks)) {
    return 'accept_empty';
  }

  return 'reject_race_wipe';
}

/**
 * patch_content가 본문·미디어 presence를 비울 때.
 * store가 이미 비었으면 clear intent → push.
 * store에 text/title/url 등이 남아 있으면 reconcile 레이스 → drop_stale.
 */
export function decideRegressiveContentOp(input: {
  localText: string;
  patchText: string;
  /** image url 등 — local에만 남으면 stale wipe 후보 */
  localHasMediaPresence?: boolean;
  patchHasMediaPresence?: boolean;
}): RegressiveContentDecision {
  if (input.patchText.length > 0 || input.patchHasMediaPresence) {
    if (
      input.localText.length > input.patchText.length
      && input.localText.startsWith(input.patchText)
    ) {
      return 'drop_stale';
    }
    return 'push';
  }
  if (input.localText.length === 0 && !input.localHasMediaPresence) return 'push';
  return 'drop_stale';
}

/** regressive용 — content.url 등 미디어 필드 (type만으로는 true 아님) */
export function contentHasMediaPresence(content: unknown): boolean {
  return contentHasStructuredPresence(content);
}

/** open: 빈 서버보다 local 본문을 지킬지 */
export function shouldKeepLocalOverEmptyServerAuthority(input: {
  localBlocks: ReadonlyArray<Pick<NoteBlock, 'id' | 'type' | 'content'>>;
  serverBlocks: ReadonlyArray<{ id: string }>;
  pendingLeaveIds?: ReadonlySet<string>;
}): boolean {
  if (input.serverBlocks.length > 0) return false;
  const decision = decideEmptySnapshotApply({
    localBlocks: input.localBlocks,
    incomingBlocks: input.serverBlocks,
    emptyConfirmed: false,
    pendingLeaveIds: input.pendingLeaveIds,
  });
  return decision === 'reject_race_wipe';
}
