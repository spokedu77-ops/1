'use client';

import { FileText } from 'lucide-react';
import type { NoteDocument } from './types';

export function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export function buildDocumentBreadcrumb(
  doc: NoteDocument | null | undefined,
  allDocs: Map<string, NoteDocument>,
): NoteDocument[] {
  if (!doc) return [];
  const chain: NoteDocument[] = [];
  let current: NoteDocument | undefined = doc;
  const visited = new Set<string>();
  while (current) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    chain.unshift(current);
    if (!current.parent_id) break;
    current = allDocs.get(current.parent_id);
  }
  return chain;
}

export function resolveDocIcon(properties?: NoteDocument['properties'] | null): string | null {
  const icon = properties?.icon?.trim();
  return icon || null;
}

export function resolveDocCover(properties?: NoteDocument['properties'] | null): string | null {
  const cover = properties?.cover?.trim();
  return cover || null;
}

export function DocIconGlyph({
  icon,
  fallbackClassName = 'h-4 w-4 shrink-0 text-neutral-400',
  emojiClassName = 'shrink-0 text-[15px] leading-none',
}: {
  icon: string | null;
  fallbackClassName?: string;
  emojiClassName?: string;
}) {
  if (icon) return <span className={emojiClassName}>{icon}</span>;
  return <FileText className={fallbackClassName} />;
}
