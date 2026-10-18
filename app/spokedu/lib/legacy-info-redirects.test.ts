import { describe, expect, it } from 'vitest';
import { legacyCurriculumRedirectTarget, legacyPrivateRedirectTarget } from './legacy-info-redirects';

describe('legacy info redirects', () => {
  it('curriculum defaults program=spomove and lands on education#contact', () => {
    expect(legacyCurriculumRedirectTarget({})).toBe('/education?program=spomove#contact');
  });

  it('curriculum preserves utm and does not override explicit program', () => {
    const url = legacyCurriculumRedirectTarget({
      utm_source: 'naver',
      utm_campaign: '한글캠페인',
      program: 'paps',
    });
    expect(url).toContain('/education?');
    expect(url).toContain('utm_source=naver');
    expect(url).toContain('program=paps');
    expect(url.endsWith('#contact')).toBe(true);
  });

  it('curriculum keeps duplicate keys', () => {
    const url = legacyCurriculumRedirectTarget({ tag: ['a', 'b'] });
    expect(url).toContain('tag=a');
    expect(url).toContain('tag=b');
  });

  it('private preserves query and #apply', () => {
    expect(legacyPrivateRedirectTarget({ utm_medium: 'cpc' })).toBe('/private?utm_medium=cpc#apply');
  });

  it('private skips empty values', () => {
    expect(legacyPrivateRedirectTarget({ utm_source: '', keep: '1' })).toBe('/private?keep=1#apply');
  });
});
