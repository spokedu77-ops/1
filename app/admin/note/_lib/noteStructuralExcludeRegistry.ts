'use client';

import type { NoteLocalOutboundOp } from './noteLocalDb';
import { collectPendingOutboundExcludedIds } from './notePersistOpToBlockOps';

/** outbound enqueue 직전·직후 레이스용 — refresh 시 outbound에 반영되면 제거 */
const extraUntilOutboundSynced = new Map<string, Set<string>>();

const structuralExcludeByDocument = new Map<string, Set<string>>();

function mergeExcludeSets(
  documentId: string,
  fromOutbound: Set<string>,
): void {
  const extra = extraUntilOutboundSynced.get(documentId);
  const merged = new Set(fromOutbound);
  if (extra) {
    for (const id of extra) merged.add(id);
    for (const id of fromOutbound) extra.delete(id);
    if (extra.size === 0) extraUntilOutboundSynced.delete(documentId);
  }
  if (merged.size === 0) {
    structuralExcludeByDocument.delete(documentId);
    return;
  }
  structuralExcludeByDocument.set(documentId, merged);
}

/** soft delete·이동 등 구조 변경 직후 — push ack 전까지 되살림 방지 */
export function addStructuralExcludeIds(documentId: string, ids: string[]): void {
  if (!documentId || ids.length === 0) return;
  const extra = extraUntilOutboundSynced.get(documentId) ?? new Set<string>();
  const current = structuralExcludeByDocument.get(documentId) ?? new Set<string>();
  for (const id of ids) {
    extra.add(id);
    current.add(id);
  }
  extraUntilOutboundSynced.set(documentId, extra);
  structuralExcludeByDocument.set(documentId, current);
}

export function removeStructuralExcludeIds(documentId: string, ids: string[]): void {
  if (!documentId || ids.length === 0) return;
  const extra = extraUntilOutboundSynced.get(documentId);
  const current = structuralExcludeByDocument.get(documentId);
  for (const id of ids) {
    extra?.delete(id);
    current?.delete(id);
  }
  if (extra?.size === 0) extraUntilOutboundSynced.delete(documentId);
  if (current?.size === 0) structuralExcludeByDocument.delete(documentId);
}

export function clearStructuralExcludeForDocument(documentId: string): void {
  extraUntilOutboundSynced.delete(documentId);
  structuralExcludeByDocument.delete(documentId);
}

/** outbound 큐 기준으로 SSOT 동기화 — push ack로 op 소비 시 자동 해제 */
export function syncStructuralExcludeFromOutbound(
  documentId: string,
  outbound: NoteLocalOutboundOp[],
): void {
  if (!documentId) return;
  const fromOutbound = collectPendingOutboundExcludedIds(outbound, documentId);
  mergeExcludeSets(documentId, fromOutbound);
}

/** pipeline·store·reconcile이 동기적으로 읽는 exclude 집합 */
export function getStructuralExcludeIds(documentId: string): Set<string> {
  const entry = structuralExcludeByDocument.get(documentId);
  return entry ? new Set(entry) : new Set();
}

export function hasStructuralExcludeIds(documentId: string): boolean {
  return getStructuralExcludeIds(documentId).size > 0;
}
