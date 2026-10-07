import { describe, expect, it } from 'vitest';
import { isMasterPremiumAssignedEmail, isPlatformAdminFromUserRow, isPlatformAdminIdentity } from './platformAdminIdentity';

describe('platform admin identity', () => {
  it('never authorizes a display name', () => {
    expect(isPlatformAdminFromUserRow({ name: '최지훈' } as never)).toBe(false);
    expect(isPlatformAdminIdentity('ordinary@example.com', { name: '김구민' } as never, null)).toBe(false);
  });

  it('assigns premium only to the named MASTER account', () => {
    expect(isMasterPremiumAssignedEmail('kimyoonki@spokedu.com')).toBe(true);
    expect(isMasterPremiumAssignedEmail(' KimYoonki@spokedu.com ')).toBe(true);
    expect(isMasterPremiumAssignedEmail('choijihoon@spokedu.com')).toBe(false);
    expect(isMasterPremiumAssignedEmail('kimkoomin@spokedu.com')).toBe(false);
  });

  it('accepts only server-controlled role or is_admin fields', () => {
    expect(isPlatformAdminFromUserRow({ role: 'admin' })).toBe(true);
    expect(isPlatformAdminFromUserRow({ is_admin: true })).toBe(true);
    expect(isPlatformAdminFromUserRow({ role: 'member', is_admin: false })).toBe(false);
  });
});
