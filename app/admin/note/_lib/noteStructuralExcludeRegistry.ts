'use client';

import type { NoteLocalOutboundOp } from './noteLocalDb';
import { collectPendingOutboundExcludedIds } from './notePersistOpToBlockOps';

/** outbound enqueue 직전·직후 레이스용 — refresh 시 outbound에 반영되면 제거 */
const extraUntilOutboundSynced = new Map<string, Set<string>>();

const structuralExcludeByDocument = new Map<string, Set<string>>();

/** push ack 직후 서버 스냅샷이 아직 옛 위치를 줄 때 되살림 방지 */
const LEAVE_CONFIRM_GRACE_MS = 20_000;
const leaveConfirmUntilByDocument = new Map<string, Map<string, number>>();

function pruneLeaveConfirmGrace(documentId: string, now = Date.now()): void {
  const grace = leaveConfirmUntilByDocument.get(documentId);
  if (!grace) return;
  for (const [id, until] of [...grace]) {
    if (now > until) grace.delete(id);
  }
  if (grace.size === 0) leaveConfirmUntilByDocument.delete(documentId);
}

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

/** soft delete·이동 등 구조 변경 직후 — outbound identityLeave 투영(SSOT 아님). push ack 전 Project 되살림 방지 */
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
  leaveConfirmUntilByDocument.delete(documentId);
}

/** outbound 큐 기준 투영 동기화 — push ack로 op 소비 시 자동 해제 */
export function syncStructuralExcludeFromOutbound(
  documentId: string,
  outbound: NoteLocalOutboundOp[],
): void {
  if (!documentId) return;
  const fromOutbound = collectPendingOutboundExcludedIds(outbound, documentId);
  mergeExcludeSets(documentId, fromOutbound);
}

/** push ack된 leave/relocation — 서버 스냅샷이 빠질 때까지(또는 grace) 유지 */
export function retainLeaveExcludeAfterAck(documentId: string, ids: string[]): void {
  if (!documentId || ids.length === 0) return;
  const grace = leaveConfirmUntilByDocument.get(documentId) ?? new Map<string, number>();
  const until = Date.now() + LEAVE_CONFIRM_GRACE_MS;
  for (const id of ids) grace.set(id, until);
  leaveConfirmUntilByDocument.set(documentId, grace);
}

/** 서버 스냅샷에 더 이상 없으면 leave 확정으로 grace 해제 */
export function releaseLeaveExcludeConfirmedAbsent(
  documentId: string,
  serverPresentIds: ReadonlySet<string>,
): void {
  const grace = leaveConfirmUntilByDocument.get(documentId);
  if (!grace) return;
  for (const id of [...grace.keys()]) {
    if (!serverPresentIds.has(id)) grace.delete(id);
  }
  if (grace.size === 0) leaveConfirmUntilByDocument.delete(documentId);
}

/** pipeline·store·reconcile이 동기적으로 읽는 exclude 집합 */
export function getStructuralExcludeIds(documentId: string): Set<string> {
  pruneLeaveConfirmGrace(documentId);
  const result = new Set(structuralExcludeByDocument.get(documentId));
  const grace = leaveConfirmUntilByDocument.get(documentId);
  if (grace) {
    for (const id of grace.keys()) result.add(id);
  }
  return result;
}

export function hasStructuralExcludeIds(documentId: string): boolean {
  return getStructuralExcludeIds(documentId).size > 0;
}
