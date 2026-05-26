import type { Program } from '../types';

const PLACEHOLDER_PATTERN = /확인 필요|활동 공간 확인|미정|undefined|null|NaN/i;

export function isPlaceholderMeta(value: string | undefined | null): boolean {
  const text = String(value ?? '').trim();
  return !text || PLACEHOLDER_PATTERN.test(text);
}

export function hasExplicitSpomoveLink(program: Program): boolean {
  const related = program.lessonDetail?.relatedSpomoveIds ?? [];
  return related.length > 0;
}

export function getPrimarySpomoveDrillId(program: Program, availableDrillIds: string[]): string | null {
  const related = program.lessonDetail?.relatedSpomoveIds ?? [];
  const matched = related.find((id) => availableDrillIds.includes(id));
  return matched ?? related[0] ?? null;
}

export function getSpomoveSessionHref(program: Program, drillId: string): string {
  return `/spokedu-master/spomove/session?drill=${drillId}&mode=projector&program=${program.id}`;
}
