import { describe, expect, it } from 'vitest';

import { omitSessionIdentityForInsertClone } from './sessionInsertClone';

describe('omitSessionIdentityForInsertClone', () => {
  it('제거: id·타임스탬프·short_code (유니크 INSERT 충돌 방지)', () => {
    const row = {
      id: 'uuid-1',
      created_at: 't1',
      updated_at: 't2',
      short_code: 'ABC12345',
      group_id: 'g1',
      title: '과외',
    };
    const out = omitSessionIdentityForInsertClone(row);
    expect(out).not.toHaveProperty('short_code');
    expect(out).not.toHaveProperty('id');
    expect(out).not.toHaveProperty('created_at');
    expect(out).not.toHaveProperty('updated_at');
    expect(out.group_id).toBe('g1');
    expect(out.title).toBe('과외');
  });
});
