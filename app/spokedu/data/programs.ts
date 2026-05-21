import { programDetailBlocks } from './program-details';
import {
  getProgramImageAsset,
  getProgramRegistryItem,
  PROGRAM_DETAIL_SLUGS,
  programRegistry,
  type ProgramCategory,
  type ProgramDetailSlug,
  type ProgramSlug,
  type ProgramTrack,
} from './programs-catalog';

export type { ProgramCategory, ProgramDetailSlug, ProgramSlug, ProgramTrack } from './programs-catalog';
export { PROGRAM_DETAIL_SLUGS } from './programs-catalog';

/** 사례·관련 프로그램 링크 등 레거시 호환용 뷰 (기준 데이터는 programs-catalog) */
export type ProgramData = {
  title: string;
  slug: ProgramSlug;
  category: ProgramCategory;
  description: string;
  connectedTracks: ProgramTrack[];
  effects: string[];
  target: string;
  expandable: boolean;
  detailDescription?: string;
  inquiryHref: string;
  href: string;
  image: string;
  imageAlt: string;
};

function registryToProgramData(slug: ProgramSlug): ProgramData | undefined {
  const item = getProgramRegistryItem(slug);
  if (!item) return undefined;
  const asset = getProgramImageAsset(slug);
  const detail =
    item.hasDetailPage && (PROGRAM_DETAIL_SLUGS as readonly string[]).includes(slug)
      ? programDetailBlocks[slug as ProgramDetailSlug]
      : undefined;

  return {
    title: item.title,
    slug: item.slug,
    category: item.category,
    description: item.listDescription,
    connectedTracks: item.tracks,
    effects: item.effects,
    target: item.target,
    expandable: item.hasDetailPage,
    detailDescription: detail?.heroSubtitle,
    inquiryHref: item.inquiryHref,
    href: item.detailHref,
    image: asset.src,
    imageAlt: asset.alt,
  };
}

export const programCatalog: Record<ProgramSlug, ProgramData> = Object.fromEntries(
  programRegistry.map((item) => [item.slug, registryToProgramData(item.slug)!]),
) as Record<ProgramSlug, ProgramData>;

export const programs: ProgramData[] = programRegistry.map((item) => registryToProgramData(item.slug)!);

export const expandableProgramSlugs = [...PROGRAM_DETAIL_SLUGS];

export function getProgramBySlug(slug: ProgramSlug): ProgramData | undefined {
  return registryToProgramData(slug);
}
