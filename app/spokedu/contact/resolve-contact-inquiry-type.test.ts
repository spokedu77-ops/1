import { describe, expect, it } from 'vitest';
import { resolveContactInquiryType } from './resolve-contact-inquiry-type';

describe('resolveContactInquiryType', () => {
  it('keeps known inquiry types from the query', () => {
    expect(resolveContactInquiryType('dispatch', null)).toBe('dispatch');
    expect(resolveContactInquiryType('private', null)).toBe('private');
    expect(resolveContactInquiryType('spomove', null)).toBe('spomove');
    expect(resolveContactInquiryType('curriculum', null)).toBe('curriculum');
    expect(resolveContactInquiryType('other', null)).toBe('other');
  });

  it('maps proposal requests to institution consultation', () => {
    expect(resolveContactInquiryType(null, 'true')).toBe('dispatch');
  });

  it('does not preselect a service on generic contact', () => {
    expect(resolveContactInquiryType(null, null)).toBeNull();
    expect(resolveContactInquiryType('', null)).toBeNull();
    expect(resolveContactInquiryType('unknown', null)).toBeNull();
  });
});
