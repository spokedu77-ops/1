import { notFound } from 'next/navigation';
import { ProgramDetailLanding } from '../../components/program-detail-landing';
import { buildSpokeduPageMetadata } from '../../data/seo';
import { getProgramBySlug, type ProgramSlug } from '../../data/programs';

const EXPANDABLE_SLUGS = ['spomove', 'paps', 'oneday-event', 'camp'] as const;
type ExpandableSlug = (typeof EXPANDABLE_SLUGS)[number];

function isExpandableSlug(slug: ProgramSlug): slug is ExpandableSlug {
  return EXPANDABLE_SLUGS.includes(slug as ExpandableSlug);
}

export function buildProgramDetailMetadata(slug: ExpandableSlug) {
  const program = getProgramBySlug(slug);
  if (!program) return {};
  return buildSpokeduPageMetadata({
    title: `${program.title} | SPOKEDU 프로그램`,
    description: program.detailDescription ?? program.description,
    canonical: `/spokedu/programs/${slug}`,
    keywords: [program.title, ...program.effects],
  });
}

type ProgramDetailTemplateProps = {
  slug: ProgramSlug;
};

export function ProgramDetailTemplate({ slug }: ProgramDetailTemplateProps) {
  const program = getProgramBySlug(slug);
  if (!program || !program.expandable || !isExpandableSlug(slug)) {
    notFound();
  }

  return <ProgramDetailLanding slug={slug} />;
}
