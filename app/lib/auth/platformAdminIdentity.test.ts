import { describe, expect, it } from 'vitest';
import { isPlatformAdminFromUserRow, isPlatformAdminIdentity } from './platformAdminIdentity';

describe('platform admin identity', () => {
  it('never authorizes a display name', () => {
    expect(isPlatformAdminFromUserRow({ name: '최지훈' } as never)).toBe(false);
    expect(isPlatformAdminIdentity('ordinary@example.com', { name: '김구민' } as never, null)).toBe(false);
  });

  it('accepts only server-controlled role or is_admin fields', () => {
    expect(isPlatformAdminFromUserRow({ role: 'admin' })).toBe(true);
    expect(isPlatformAdminFromUserRow({ is_admin: true })).toBe(true);
    expect(isPlatformAdminFromUserRow({ role: 'member', is_admin: false })).toBe(false);
  });
});
