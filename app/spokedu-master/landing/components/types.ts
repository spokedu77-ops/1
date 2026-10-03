import type { getLandingProductModel } from '../models/landingProduct';
import type { MASTER_BUSINESS_INFO } from '../../lib/businessInfo';

export type ReturnTypeOfLandingModel = ReturnType<typeof getLandingProductModel> & {
  business: typeof MASTER_BUSINESS_INFO;
  customerServiceHref: string;
  customerServiceTelHref: string;
  centerInquiryHref: string;
};
