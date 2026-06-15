import type { Program } from '../types';
import {
  findOfficialSpomovePreset,
  officialPresetSessionHref,
  type OfficialSpomovePreset,
} from '../spomove/officialSpomovePresets';

const PLACEHOLDER_PATTERN = /확인 필요|활동 공간 확인|미정|undefined|null|NaN/i;

export function isPlaceholderMeta(value: string | undefined | null): boolean {
  const text = String(value ?? '').trim();
  return !text || PLACEHOLDER_PATTERN.test(text);
}

export function hasExplicitSpomoveLink(program: Program): boolean {
  return getOfficialSpomovePresets(program).length > 0;
}

export function getOfficialSpomovePresets(program: Program): OfficialSpomovePreset[] {
  const related = program.lessonDetail?.relatedSpomoveIds ?? [];
  const seen = new Set<string>();
  const presets: OfficialSpomovePreset[] = [];

  for (const id of related) {
    if (seen.has(id)) continue;
    seen.add(id);
    const preset = findOfficialSpomovePreset(id);
    if (preset) presets.push(preset);
  }

  return presets;
}

export function getPrimaryOfficialSpomovePreset(program: Program): OfficialSpomovePreset | null {
  return getOfficialSpomovePresets(program)[0] ?? null;
}

export function getSpomoveSessionHref(
  program: Program,
  preset: OfficialSpomovePreset,
  mode: 'projector' | 'class' = 'projector',
): string {
  const url = new URL(officialPresetSessionHref(preset), 'https://spokedu.local');
  url.searchParams.set('mode', mode);
  url.searchParams.set('program', program.id);
  return `${url.pathname}?${url.searchParams.toString()}`;
}
