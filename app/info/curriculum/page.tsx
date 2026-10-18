import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { legacyCurriculumRedirectTarget } from '@/app/spokedu/lib/legacy-info-redirects';

export const metadata: Metadata = {
  title: 'SPOKEDU | 기관 체육교육 상담',
  description: '기관 체육·SPOMOVE 도입 상담은 SPOKEDU 체육교육 페이지에서 접수합니다.',
  robots: { index: false, follow: true },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy ads URL → canonical institution inquiry (inline DispatchProposalForm). */
export default async function CurriculumLegacyRedirectPage({ searchParams }: PageProps) {
  const params = await searchParams;
  permanentRedirect(legacyCurriculumRedirectTarget(params));
}
