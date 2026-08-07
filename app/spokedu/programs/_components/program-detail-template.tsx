import { notFound } from 'next/navigation';
import { ProgramDetailLanding } from '../../components/program-detail-landing';
import { buildProgramDetailOgImage, buildSpokeduPageMetadata } from '../../data/seo';
import {
  getProgramDetailMetadata,
  isProgramDetailSlug,
  type ProgramDetailSlug,
} from '../../data/program-details';
import { SPOKEDU_PATHS } from '../../data/site';
import type { ProgramSlug } from '../../data/programs-catalog';

export function buildProgramDetailMetadata(slug: ProgramDetailSlug) {
  const program = getProgramDetailMetadata(slug);
  if (!program) return {};
  return buildSpokeduPageMetadata({
    title: `${program.title} | SPOKEDU 프로그램`,
    description: program.detailDescription ?? program.description,
    canonical: slug === 'spomove' ? SPOKEDU_PATHS.spomove : SPOKEDU_PATHS.dispatch,
    keywords: [program.title],
    pageKey: 'programs',
    ogImage: buildProgramDetailOgImage(slug),
  });
}

type ProgramDetailTemplateProps = {
  slug: ProgramSlug;
};

export function ProgramDetailTemplate({ slug }: ProgramDetailTemplateProps) {
  if (!isProgramDetailSlug(slug)) {
    notFound();
  }

  return <ProgramDetailLanding slug={slug} />;
}
