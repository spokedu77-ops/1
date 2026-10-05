import {
  MASTER_BUSINESS_INFO,
  MASTER_CENTER_INQUIRY_HREF,
  MASTER_CUSTOMER_SERVICE_HREF,
  MASTER_CUSTOMER_SERVICE_TEL_HREF,
} from '../lib/businessInfo';
import { LandingFooter, LandingHeader } from './components/LandingChrome';
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
        <WhyMasterSection />
        <ProductDetailSection />
        <FieldProofSection />
        <AudienceSection />
        <PlansSection product={product} />
        <CenterSection product={product} />
        <FaqAndFinalCta product={product} />
      </main>
      <LandingFooter product={product} />
    </div>
  );
}
