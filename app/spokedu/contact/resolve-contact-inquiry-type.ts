import { contactTypeOptions } from './contact-page-data';
import type { InquiryType } from './inquiry-types';

export function isInquiryType(value: string | null): value is InquiryType {
  return contactTypeOptions.some((option) => option.id === value);
}

/**
 * Known query (`type` or proposal) selects a consultation type.
 * Bare `/contact` stays unselected so Header 상담하기 does not imply a service.
 */
export function resolveContactInquiryType(
  type: string | null,
  proposal: string | null,
): InquiryType | null {
  if (isInquiryType(type)) return type;
  if (proposal === 'true') return 'dispatch';
  return null;
}
