import type { Metadata } from 'next';
import { CommercialLanding } from '@/app/spokedu-master/landing/CommercialLanding';
import { getPublicProductContract } from '@/app/spokedu-master/lib/publicProductContract';
import { getSpokeduSiteUrl } from '@/app/spokedu/lib/site-url';

const SITE_URL = getSpokeduSiteUrl();
const CANONICAL_URL = `${SITE_URL}/subscription`;
const TITLE = '유아·초등 체육수업 준비·운영·기록 | SPOKEDU MASTER';
const DESCRIPTION = '유아·초등 체육 교사와 강사가 놀이체육 활동을 찾고, 수업반·일정·출석·기록을 관리하며 SPOMOVE까지 활용하는 수업 운영 서비스입니다.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL_URL },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website', url: CANONICAL_URL, siteName: 'SPOKEDU MASTER', title: TITLE,
    description: DESCRIPTION, locale: 'ko_KR',
    images: [{ url: `${SITE_URL}/api/spokedu-master/og`, width: 1200, height: 630, alt: 'SPOKEDU MASTER 실제 수업 운영 화면' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [`${SITE_URL}/api/spokedu-master/og`] },
};

export default function SubscriptionPage() {
  const product = getPublicProductContract();
  const paidPlans = product.plans.filter((plan) => plan.monthlyPriceKrw != null);
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: product.productDisplayName,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    url: CANONICAL_URL,
    description: DESCRIPTION,
    offers: paidPlans.map((plan) => ({ '@type': 'Offer', name: plan.displayName, priceCurrency: 'KRW', price: plan.monthlyPriceKrw, url: `${CANONICAL_URL}#plans` })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
      <CommercialLanding />
    </>
  );
}
