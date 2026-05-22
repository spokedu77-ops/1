import { contactPage, type ContactInquiryType } from './site';

export type InquiryType = ContactInquiryType;

export const contactTypeOptions = contactPage.inquiryTypes.map((item) => ({
  id: item.id,
  title: item.title,
  description: item.description,
  selectTrackLabel: item.selectTrackLabel,
  submitTrackLabel: item.submitTrackLabel,
  successMessage: item.successMessage,
}));
