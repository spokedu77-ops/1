/**
 * Note Data Integrity — Save Trust + Sync 계약의 강제 핵.
 *
 * “사용자가 쓴/편집한 페이로드는 Intent 없이 바뀌면 안 된다.”
 * 새 C번호가 아니다. docs/admin-note-notion-contract Sync·Save Trust의 구현 choke다.
 *
 * Passive path = hydrate / syncSnapshot / applyRemoteOps / mergeSnapshots / sanitize
 * Explicit Intent = create / patchContent / applyPatches(user) / structure command / 명시 migration
 */

import { readAuthorityBlockText } from './noteAuthority';
import {
  isStrictNoteTextExtension,
  shouldIgnoreRegressiveContentPatch,
} from '@/app/lib/note/noteContentAuthority';
import type { NoteBlock } from './types';

const USER_CONTENT_KEYS = [
  'text',
  'title',
  'html',
  'body',
  'caption',
  'url',
  'page_document_id',
  'checked',
  'language',
] as const;

export type NoteIntegrityViolation = {
  blockId: string;
  kind: 'content_regress' | 'topology_drift' | 'id_drop' | 'relative_order';
  detail: string;
};

function isEmptyHtml(value: unknown): boolean {
  if (typeof value !== 'string') return true;
  const stripped = value
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
  return stripped.length === 0;
}

/** 사용자 가시 본문 지문 — topology 제외 */
export function userContentFingerprint(
  content: Record<string, unknown> | null | undefined,
): string {
  if (!content) return '';
  const parts: string[] = [];
  for (const key of USER_CONTENT_KEYS) {
    const value = content[key];
    if (key === 'checked') {
      parts.push(`checked:${value === true ? '1' : '0'}`);
      continue;
    }
    if (key === 'html') {
      if (typeof value === 'string' && !isEmptyHtml(value)) parts.push(`html:${value.trim()}`);
      continue;
    }
    if (typeof value === 'string' && value.trim()) parts.push(`${key}:${value.trim()}`);
  }
  return parts.join('|');
}

function copyLocalUserFieldsOnto(
  incoming: Record<string, unknown>,
  local: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...incoming };
  for (const key of USER_CONTENT_KEYS) {
    if (key === 'checked') {
      if ('checked' in local) next.checked = local.checked === true;
      continue;
    }
    const localValue = local[key];
    if (typeof localValue === 'string' && localValue.trim()) {
      next[key] = localValue;
    } else if (key === 'html' && typeof localValue === 'string' && !isEmptyHtml(localValue)) {
      next[key] = localValue;
    }
  }
  return next;
}

/**
 * Passive strict extension — `app/lib/note/noteContentAuthority` SSOT.
 */
export function isStrictPassiveTextExtension(localText: string, incomingText: string): boolean {
  return isStrictNoteTextExtension(localText, incomingText);
}

/**
 * Passive merge: 공유 shouldIgnoreRegressiveContentPatch로 본문·체크 회귀를 거부한다.
 * (active editor / storeAhead와 독립 — 비활성 체크리스트·빈 체크 todo도 보호)
 * 허용: 로컬이 비었을 때 incoming 채움, 로컬의 **엄격한 확장**(prefix + 더 김).
 */
export function mergePassiveIncomingContent(
  localContent: Record<string, unknown> | null | undefined,
  incomingContent: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const local = { ...(localContent ?? {}) };
  const incoming = { ...(incomingContent ?? {}) };

  // ZERO LOSS: passive도 서버 push와 동일 predicate — 이중 판정 금지
  if (shouldIgnoreRegressiveContentPatch(local, incoming)) {
    return copyLocalUserFieldsOnto(incoming, local);
  }

  // push: incoming 채택하되, local-only 사용자 필드가 incoming에 비어 있으면 보존
  const next = { ...incoming };
  for (const key of USER_CONTENT_KEYS) {
    if (key === 'checked') continue;
    const incomingValue = incoming[key];
    const localValue = local[key];
    const incomingEmpty = key === 'html'
      ? isEmptyHtml(incomingValue)
      : !(typeof incomingValue === 'string' && incomingValue.trim());
    const localFilled = key === 'html'
      ? typeof localValue === 'string' && !isEmptyHtml(localValue)
      : typeof localValue === 'string' && localValue.trim().length > 0;
    if (incomingEmpty && localFilled) next[key] = localValue;
  }
  // passive는 Intent base가 없다 — 체크된 로컬을 침묵 uncheck 금지 (빈 본문 포함)
  if (local.checked === true && incoming.checked !== true) {
    next.checked = true;
  } else if (!('checked' in incoming) && 'checked' in local) {
    next.checked = local.checked === true;
  }
  return next;
}

/** 같은 parent 형제들의 상대 순서 서명 (id 나열) — absolute order_index와 무관, 동점은 만남 순서 */
export function siblingRelativeOrderSignature(
  blocks: ReadonlyArray<Pick<NoteBlock, 'id' | 'parent_block_id' | 'order_index'>>,
  parentId: string | null,
): string {
  return blocks
    .filter((block) => (block.parent_block_id ?? null) === parentId)
    .slice()
    .sort((left, right) => left.order_index - right.order_index)
    .map((block) => block.id)
    .join(',');
}

export function hasDuplicateSiblingOrders(
  blocks: ReadonlyArray<Pick<NoteBlock, 'parent_block_id' | 'order_index'>>,
): boolean {
  const seen = new Map<string, Set<number>>();
  for (const block of blocks) {
    const key = block.parent_block_id ?? '__root__';
    const orders = seen.get(key) ?? new Set<number>();
    if (orders.has(block.order_index)) return true;
    orders.add(block.order_index);
    seen.set(key, orders);
  }
  return false;
}

/**
 * Passive 경로 회귀 검출 (테스트·assert용).
 * options.allowTopologyChange: 서버가 권위일 때 parent/order 변경 허용.
 * options.allowMissingIds: leave/exclude로 빠진 id 허용.
 */
export function findSilentUserPayloadRegressions(
  before: ReadonlyArray<NoteBlock>,
  after: ReadonlyArray<NoteBlock>,
  options?: {
    allowTopologyChange?: boolean;
    allowMissingIds?: ReadonlySet<string>;
  },
): NoteIntegrityViolation[] {
  const afterById = new Map(after.map((block) => [block.id, block]));
  const violations: NoteIntegrityViolation[] = [];
  const allowMissing = options?.allowMissingIds ?? new Set<string>();

  for (const local of before) {
    const next = afterById.get(local.id);
    if (!next) {
      if (allowMissing.has(local.id)) continue;
      const fp = userContentFingerprint(local.content as Record<string, unknown>);
      if (fp.length > 0) {
        violations.push({
          blockId: local.id,
          kind: 'id_drop',
          detail: 'protectable block missing after passive merge',
        });
      }
      continue;
    }

    const beforeFp = userContentFingerprint(local.content as Record<string, unknown>);
    const afterFp = userContentFingerprint(next.content as Record<string, unknown>);
    const beforeText = readAuthorityBlockText(local.content);
    const afterText = readAuthorityBlockText(next.content);
    if (beforeText.length > 0 && afterText.length === 0) {
      violations.push({
        blockId: local.id,
        kind: 'content_regress',
        detail: 'non-empty user text cleared',
      });
    } else if (
      beforeText.length > afterText.length
      && beforeText.startsWith(afterText)
      && afterText.length > 0
    ) {
      violations.push({
        blockId: local.id,
        kind: 'content_regress',
        detail: 'user text truncated by stale incoming',
      });
    } else if (
      beforeText.length > 0
      && afterText.length > 0
      && beforeText !== afterText
      && !(afterText.startsWith(beforeText) && afterText.length > beforeText.length)
    ) {
      violations.push({
        blockId: local.id,
        kind: 'content_regress',
        detail: 'user text replaced without strict extension',
      });
    } else if (
      beforeFp.includes('checked:1')
      && afterFp.includes('checked:0')
      && beforeText === afterText
    ) {
      violations.push({
        blockId: local.id,
        kind: 'content_regress',
        detail: 'checked cleared without text change',
      });
    }

    if (!options?.allowTopologyChange) {
      if ((local.parent_block_id ?? null) !== (next.parent_block_id ?? null)) {
        violations.push({
          blockId: local.id,
          kind: 'topology_drift',
          detail: 'parent_block_id changed without explicit intent',
        });
      }
      if (local.order_index !== next.order_index) {
        violations.push({
          blockId: local.id,
          kind: 'topology_drift',
          detail: 'order_index changed without explicit intent',
        });
      }
    }
  }

  if (!options?.allowTopologyChange) {
    const parents = new Set<string | null>();
    for (const block of before) parents.add(block.parent_block_id ?? null);
    for (const parentId of parents) {
      const beforeSig = siblingRelativeOrderSignature(before, parentId);
      const afterSig = siblingRelativeOrderSignature(after, parentId);
      if (beforeSig && afterSig && beforeSig !== afterSig) {
        violations.push({
          blockId: parentId ?? '__root__',
          kind: 'relative_order',
          detail: `sibling relative order changed: ${beforeSig} → ${afterSig}`,
        });
      }
    }
  }

  return violations;
}

/** migration 등 Intent 경로: id별 text/checked는 반드시 보존 */
export function assertMigrationPreservesUserContent(
  before: ReadonlyArray<NoteBlock>,
  after: ReadonlyArray<NoteBlock>,
): NoteIntegrityViolation[] {
  const afterById = new Map(after.map((block) => [block.id, block]));
  const violations: NoteIntegrityViolation[] = [];
  for (const local of before) {
    const next = afterById.get(local.id);
    if (!next) {
      violations.push({
        blockId: local.id,
        kind: 'id_drop',
        detail: 'migration dropped block id',
      });
      continue;
    }
    const localContent = (local.content ?? {}) as Record<string, unknown>;
    const nextContent = (next.content ?? {}) as Record<string, unknown>;
    const localText = typeof localContent.text === 'string' ? localContent.text : '';
    const nextText = typeof nextContent.text === 'string' ? nextContent.text : '';
    if (localText !== nextText) {
      violations.push({
        blockId: local.id,
        kind: 'content_regress',
        detail: 'migration changed text',
      });
    }
    if ((localContent.checked === true) !== (nextContent.checked === true) && local.type === 'todo') {
      violations.push({
        blockId: local.id,
        kind: 'content_regress',
        detail: 'migration changed checked',
      });
    }
  }
  return violations;
}

/**
 * Passive 블록 1개 봉인 — incoming 골격·메타를 쓰되 사용자 필드는 mergePassiveIncomingContent만.
 * IDB/op-replay/snapshot/engine 등 mergeReconciledBlocks를 안 타는 모든 구멍에 쓴다.
 */
export function sealPassiveIncomingBlock<T extends Pick<NoteBlock, 'content'>>(
  local: T | null | undefined,
  incoming: T,
): T {
  if (!local) return incoming;
  const sealedContent = mergePassiveIncomingContent(
    (local.content ?? {}) as Record<string, unknown>,
    (incoming.content ?? {}) as Record<string, unknown>,
  );
  if (sealedContent === incoming.content) return incoming;
  return { ...incoming, content: sealedContent };
}

/** id 교집합에 대해 sealPassiveIncomingBlock 적용 */
export function sealPassiveIncomingBlocks<T extends NoteBlock>(
  localBlocks: ReadonlyArray<T>,
  incomingBlocks: ReadonlyArray<T>,
): T[] {
  if (localBlocks.length === 0 || incomingBlocks.length === 0) {
    return [...incomingBlocks];
  }
  const localById = new Map(localBlocks.map((block) => [block.id, block]));
  return incomingBlocks.map((incoming) => {
    const local = localById.get(incoming.id);
    return local ? sealPassiveIncomingBlock(local, incoming) : incoming;
  });
}
