import { curriculumInquiryHref } from '@/app/spokedu/data/commercial-routes';
import {
  MASTER_BUSINESS_INFO,
  MASTER_CUSTOMER_SERVICE_HREF,
  MASTER_CUSTOMER_SERVICE_TEL_HREF,
} from '../lib/businessInfo';
import { LandingLoggedInBanner } from './LandingLoggedInBanner';
import { MasterLocalNav } from './components/LandingChrome';
import { SubscriptionInquirySection } from './components/SubscriptionInquirySection';
import {
  AudienceSection,
  CenterSection,
  CoreProductStory,
  FaqAndFinalCta,
  FieldProofSection,
  LandingHero,
  PlansSection,
  ProductDetailSection,
  ProductOverview,
  SpomoveSection,
  WhyMasterSection,
} from './components/LandingSections';
import { getLandingProductModel } from './models/landingProduct';
import styles from './landing.module.css';

export function CommercialLanding() {
  const publicProduct = getLandingProductModel();
  const product = {
    ...publicProduct,
    business: MASTER_BUSINESS_INFO,
    customerServiceHref: MASTER_CUSTOMER_SERVICE_HREF,
    customerServiceTelHref: MASTER_CUSTOMER_SERVICE_TEL_HREF,
    // Primary: 온페이지 CurriculumInquiryForm(master mode). 전화·메일은 fallback으로 유지.
    centerInquiryHref: curriculumInquiryHref({ mode: 'master' }),
  };

  return (
    <div className={styles.landingRoot}>
      <LandingLoggedInBanner />
      <MasterLocalNav product={product} />
      <div className={styles.landingContent}>
        <LandingHero product={product} />
        <ProductOverview />
        <CoreProductStory />
        <SpomoveSection />
        <WhyMasterSection />
        <ProductDetailSection />
        <FieldProofSection />
        <AudienceSection />
        <PlansSection product={product} />
        <CenterSection product={product} />
        <SubscriptionInquirySection />
        <FaqAndFinalCta product={product} />
      </div>
    </div>
  );
}
