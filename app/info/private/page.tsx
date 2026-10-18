import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { legacyPrivateRedirectTarget } from '@/app/spokedu/lib/legacy-info-redirects';

export const metadata: Metadata = {
  title: 'SPOKEDU | 개인·소그룹 체육 상담',
  description: '개인·소그룹 수업 상담은 SPOKEDU private 페이지에서 접수합니다.',
  robots: { index: false, follow: true },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy ads URL → canonical /private#apply (no fake live counters). */
export default async function PrivateLegacyRedirectPage({ searchParams }: PageProps) {
  const params = await searchParams;
  permanentRedirect(legacyPrivateRedirectTarget(params));
}
