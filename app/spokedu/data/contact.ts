import { CONTACT_SUCCESS_MESSAGE, contactTypeOptions as contactPageTypeOptions } from '../contact/contact-page-data';
import type { ContactInquiryType } from './site';

export type InquiryType = ContactInquiryType;

/** @deprecated contact-page-data.contactTypeOptions 사용 */
export const contactTypeOptions = contactPageTypeOptions.map((item) => ({
  id: item.id,
  title: item.title,
  description: item.description,
  selectTrackLabel: item.selectTrackLabel,
  submitTrackLabel: item.submitTrackLabel,
  successMessage: CONTACT_SUCCESS_MESSAGE,
}));
