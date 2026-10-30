import { describe, expect, it } from 'vitest';
import { teacherFeePreview } from './teacherFeePreview';
import { cloneTierFeeMap } from '@/app/lib/teacherTierSchedule';
import { resolveDefaultSessionPrice, resolveDefaultAssistSessionPrice } from '@/app/admin/classes/lib/bulkSessionDefaults';

const map = cloneTierFeeMap();
map.gold.fee_center_main = 51000;
const tiers = [{ tier_id: 'gold' as const, fee_center_main: 51000, fee_center_assist: 30000 }];
const teacher = { id: 'teacher-uuid', session_count: 100, logCount: 6, fee_center_main: null, fee_center_assist: 27000 };
describe('center fee provenance uses existing arithmetic', () => {
  it('matches both session resolvers including log-count tier and individual override', () => {
    expect(teacherFeePreview(teacher.id, [teacher], tiers, map).amount).toBe(51000);
    expect(teacherFeePreview(teacher.id, [teacher], tiers, map, 'assist').amount).toBe(27000);
    expect(teacherFeePreview(teacher.id, [teacher], tiers, map).amount).toBe(resolveDefaultSessionPrice(teacher, 'regular_center', map));
    expect(teacherFeePreview(teacher.id, [teacher], tiers, map, 'assist').amount).toBe(resolveDefaultAssistSessionPrice(teacher, 'regular_center', map));
    expect(teacherFeePreview(teacher.id, [teacher], tiers, map).label).toContain('teacher_tier_fees');
    expect(teacherFeePreview(teacher.id, [teacher], tiers, map, 'assist').label).toContain('users');
  });
  it('distinguishes missing selection, unknown UUID and unregistered DB fee from fallback', () => {
    expect(teacherFeePreview(null, [], [], map).state).toBe('unselected');
    expect(teacherFeePreview('unknown', [], [], map).state).toBe('unavailable');
    expect(teacherFeePreview(teacher.id, [teacher], [], map)).toMatchObject({ state: 'unregistered', amount: null });
    expect(teacherFeePreview(teacher.id, [teacher], [{ ...tiers[0], fee_center_main: null }], map).amount).toBeNull();
    expect(resolveDefaultSessionPrice(null, 'regular_center', map)).toBe(30000);
    expect(resolveDefaultAssistSessionPrice(null, 'regular_center', map)).toBe(25000);
  });
  it('keeps explicit zero and individual fees over tier fees', () => {
    expect(teacherFeePreview(teacher.id, [{ ...teacher, fee_center_main: 0 }], tiers, map).amount).toBe(0);
    expect(teacherFeePreview(teacher.id, [{ ...teacher, fee_center_main: 60000 }], tiers, map).amount).toBe(60000);
  });
});
