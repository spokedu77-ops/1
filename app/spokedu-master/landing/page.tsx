import type { Metadata } from 'next';
import { getSpokeduSiteUrl } from '@/app/spokedu/lib/site-url';
import {
  MASTER_BUSINESS_INFO,
  MASTER_CENTER_INQUIRY_HREF,
  MASTER_CUSTOMER_SERVICE_HREF,
  MASTER_CUSTOMER_SERVICE_TEL_HREF,
} from '../lib/businessInfo';
import { LandingFooter, LandingHeader } from './components/LandingChrome';
import {
  CoreProductStory,
  FaqAndFinalCta,
  InclusiveAndFieldProof,
  LandingHero,
  PlansSection,
  ProductOverview,
  SpomoveSection,
} from './components/LandingSections';
import { getLandingProductModel } from './models/landingProduct';
import styles from './landing.module.css';

const SITE_URL = getSpokeduSiteUrl();
const CANONICAL_URL = `${SITE_URL}/spokedu-master/landing`;
const LANDING_TITLE = '유아·초등 체육수업 준비와 운영 | SPOKEDU MASTER';
const LANDING_DESCRIPTION =
  '유아·초등 체육 교사와 강사가 수업을 찾고, 수업반·일정·출석과 현장 도구로 운영하며, 기록을 다음 수업까지 이어가는 서비스입니다.';

export const metadata: Metadata = {
  title: { absolute: LANDING_TITLE },
  description: LANDING_DESCRIPTION,
  alternates: { canonical: CANONICAL_URL },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    url: CANONICAL_URL,
    siteName: 'SPOKEDU MASTER',
    title: LANDING_TITLE,
    description: LANDING_DESCRIPTION,
    locale: 'ko_KR',
    images: [{
      url: `${SITE_URL}/api/spokedu-master/og`,
      width: 1200,
      height: 630,
      alt: '실제 수업 화면으로 체육수업 준비와 운영을 보여주는 SPOKEDU MASTER',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: LANDING_TITLE,
    description: LANDING_DESCRIPTION,
    images: [`${SITE_URL}/api/spokedu-master/og`],
  },
};

export default function LandingPage() {
  const publicProduct = getLandingProductModel();
  const product = {
    ...publicProduct,
    business: MASTER_BUSINESS_INFO,
    customerServiceHref: MASTER_CUSTOMER_SERVICE_HREF,
    customerServiceTelHref: MASTER_CUSTOMER_SERVICE_TEL_HREF,
    centerInquiryHref: MASTER_CENTER_INQUIRY_HREF,
  };

  return (
    <div className={styles.page}>
      <LandingHeader product={product} />
      <main>
        <LandingHero product={product} />
        <ProductOverview />
        <CoreProductStory />
        <SpomoveSection />
        <InclusiveAndFieldProof />
        <PlansSection product={product} />
        <FaqAndFinalCta product={product} />
      </main>
      <LandingFooter product={product} />
    </div>
  );
}
