import { describe, expect, it } from 'vitest';
import { applyStaffSessionFees, isZeroFeeStaff, payableTeacherFee } from './staffTeacherFees';
import { cloneTierFeeMap } from './teacherTierSchedule';
import { resolveDefaultAssistSessionPrice, resolveDefaultSessionPrice } from '@/app/admin/classes/lib/bulkSessionDefaults';

describe('staff teaching is non-payable', () => {
  it('overrides individual and tier rates for both main and assistant staff assignments', () => {
    const staff = { id: 'staff', name: '운영진', role: 'admin', fee_private: 90000, fee_group: 90000, fee_center_main: 90000, fee_center_assist: 90000 };
    const map = cloneTierFeeMap();
    for (const type of ['regular_private', 'regular_group', 'regular_center', 'special_lecture']) {
      expect(resolveDefaultSessionPrice(staff, type, map)).toBe(0);
      expect(resolveDefaultAssistSessionPrice(staff, type, map)).toBe(0);
    }
    expect(payableTeacherFee(staff, 99000)).toBe(0);
  });
  it('recognizes legacy operator identities without zeroing ordinary teachers', () => {
    expect(isZeroFeeStaff({ name: '김구민', role: 'teacher' })).toBe(true);
    expect(isZeroFeeStaff({ email: 'KIMYOONKI@spokedu.com' })).toBe(true);
    expect(payableTeacherFee({ name: '김구민 선생님', role: 'teacher' }, 45000)).toBe(45000);
  });
  it('zeros only staff fees in mixed assignments and preserves the original snapshot', () => {
    const staffId = '10000000-0000-4000-8000-000000000001';
    const teacherId = '10000000-0000-4000-8000-000000000002';
    const memo = `수업 메모\nEXTRA_TEACHERS:${JSON.stringify([{ id: staffId, price: 25000 }, { id: teacherId, price: 35000 }])}`;
    const original = { created_by: staffId, price: 80000, memo };
    const payable = applyStaffSessionFees(original, new Set([staffId]));
    expect(payable.price).toBe(0);
    expect(payable.memo).toContain('"price":0');
    expect(payable.memo).toContain('35000');
    expect(original).toEqual({ created_by: staffId, price: 80000, memo });
  });
});
