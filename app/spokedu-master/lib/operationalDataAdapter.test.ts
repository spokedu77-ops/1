import { describe, expect, it } from 'vitest';
import { studentMetaToDisplay } from './operationalDataAdapter';

describe('operational student adapter', () => {
  it('formats active student metadata without deriving class membership', () => {
    expect(studentMetaToDisplay({ age: '만 8세', note: '초등' })).toBe('만 8세 / 초등');
  });
});
