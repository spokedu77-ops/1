import { describe, expect, it } from 'vitest';
import { matchesCenterFilters } from './listItem';
import type { Center } from './types';

describe('post-save list membership', () => {
  const center = { name: '센터', address: '강남로 123', contact_name: '담당', contact_email: 'test@example.test', status: 'active', region_tag: '서울' } as Center;
  it('uses the existing four search fields and exact status/region filters', () => {
    expect(matchesCenterFilters(center, { search: '강남', status: 'active', region: '서울' })).toBe(true);
    expect(matchesCenterFilters(center, { search: 'example.test', status: '', region: '' })).toBe(true);
    expect(matchesCenterFilters(center, { search: '강남', status: 'ended', region: '' })).toBe(false);
    expect(matchesCenterFilters(center, { search: '', status: '', region: '부산' })).toBe(false);
    expect(matchesCenterFilters(center, { search: '일치하지않음', status: '', region: '' })).toBe(false);
  });
  it('escapes regular expression syntax while retaining existing ilike underscore wildcard semantics', () => {
    expect(matchesCenterFilters(center, { search: '강_로', status: '', region: '' })).toBe(true);
    expect(matchesCenterFilters(center, { search: '[강남]', status: '', region: '' })).toBe(false);
    expect(matchesCenterFilters(center, { search: '%%', status: '', region: '' })).toBe(false);
  });
});
