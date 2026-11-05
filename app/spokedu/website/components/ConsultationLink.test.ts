import { describe, expect, it } from 'vitest';
import { consultationHref } from './ConsultationLink';

describe('Public consultation handoff after inline-form removal', () => {
  it('preserves the private-class selection and acquisition tags', () => {
    const url = new URL(consultationHref('/contact?type=private', '?classType=small-group&utm_source=partner&utm_campaign=school'), 'https://spokedu.invalid');
    expect(url.searchParams.get('classType')).toBe('small-group');
    expect(url.searchParams.get('utm_source')).toBe('partner');
    expect(url.searchParams.get('utm_campaign')).toBe('school');
    expect(url.searchParams.get('type')).toBe('private');
  });
  it('keeps the authoritative type/program and never forwards arbitrary redirects', () => {
    const url = new URL(consultationHref('/contact?type=dispatch&program=inclusive', '?type=private&program=other&proposal=true&redirect=https://example.com'), 'https://spokedu.invalid');
    expect(url.searchParams.get('type')).toBe('dispatch');
    expect(url.searchParams.get('program')).toBe('inclusive');
    expect(url.searchParams.get('proposal')).toBe('true');
    expect(url.searchParams.has('redirect')).toBe(false);
  });
  it('preserves the SPOMOVE operation without changing the default destination', () => {
    expect(consultationHref('/contact?type=spomove', '')).toBe('/contact?type=spomove');
    const url = new URL(consultationHref('/contact?type=spomove', '?operation=SPOMOVE%2F%EA%B5%90%EA%B5%AC+%EB%8F%84%EC%9E%85'), 'https://spokedu.invalid');
    expect(url.searchParams.get('operation')).toBe('SPOMOVE/교구 도입');
  });
});
