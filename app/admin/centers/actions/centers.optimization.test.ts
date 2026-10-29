import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({ auth: vi.fn(), service: vi.fn(), from: vi.fn() }));
vi.mock('@/app/lib/server/adminAuth', () => ({ requireAdmin: mock.auth, getServiceSupabase: mock.service }));
import { getCenters, getCenterById, getActiveTeachers, createCenter, updateCenter, deleteCenter, getCenterCriminalCheckPassword } from './centers';

const id = '11111111-1111-4111-8111-111111111111';
function query(data: unknown) {
  const result = { data, error: null };
  const q: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ['select', 'eq', 'or', 'order', 'in', 'single']) q[method] = vi.fn(() => q);
  q.then = vi.fn((resolve) => Promise.resolve(result).then(resolve));
  return q;
}

beforeEach(() => {
  vi.clearAllMocks();
  mock.auth.mockResolvedValue({ ok: true, userId: id, email: 'admin@example.test' });
  mock.service.mockReturnValue({ from: mock.from });
});

describe('center query and security behavior', () => {
  it('keeps all list displays but removes detail placeholders and unused projection fields', async () => {
    const q = query([{ id, name: '센터', status: 'active', updated_at: '2026-10-30',
      main_teacher: { name: '강사1' }, mt2: [{ name: '강사2' }], mt3: null,
      contact_phone: '000', weekly_schedule: [{ day: 'mon', start: '09:00', end: '10:00' }] }]);
    mock.from.mockReturnValue(q);
    const rows = await getCenters({ status: 'active', region_tag: '서울', search: '주소' });
    expect(mock.from).toHaveBeenCalledTimes(1);
    const select = q.select.mock.calls[0][0];
    expect(select).not.toContain('created_at');
    expect(select).not.toContain('(id, name)');
    expect(select).not.toContain('criminal_check');
    expect(q.or).toHaveBeenCalledWith('name.ilike.%주소%,address.ilike.%주소%,contact_name.ilike.%주소%,contact_email.ilike.%주소%');
    expect(q.eq).toHaveBeenCalledWith('status', 'active');
    expect(q.eq).toHaveBeenCalledWith('region_tag', '서울');
    expect(rows[0]).toMatchObject({ main_teacher_name: '강사1', main_teacher_2_name: '강사2', contact_phone: '000' });
    expect(rows[0]).not.toHaveProperty('contract_start');
    expect(rows[0]).not.toHaveProperty('criminal_check_files');
    expect(rows[0]).not.toHaveProperty('instructors_default');
    expect(rows[0]).not.toHaveProperty('address');
  });

  it('loads one chosen detail with no facility password', async () => {
    const q = query({ id, name: '센터' }); mock.from.mockReturnValue(q);
    await getCenterById(id);
    expect(mock.from).toHaveBeenCalledTimes(1);
    expect(q.eq).toHaveBeenCalledWith('id', id);
    expect(q.select.mock.calls[0][0]).not.toContain('criminal_check_facility_password');
    expect(q.select.mock.calls[0][0]).toContain('session_fee');
  });

  it('rejects nonadmins before any service-role access for all public center operations', async () => {
    mock.auth.mockResolvedValue({ ok: false });
    await expect(getCenters()).rejects.toThrow();
    await expect(getCenterById(id)).rejects.toThrow();
    await expect(getActiveTeachers()).rejects.toThrow();
    expect(await createCenter({ name: 'x' })).toHaveProperty('error');
    expect(await updateCenter(id, { name: 'x' })).toHaveProperty('error');
    expect(await deleteCenter(id)).toHaveProperty('error');
    expect(await getCenterCriminalCheckPassword(id)).toHaveProperty('error');
    expect(mock.service).not.toHaveBeenCalled();
  });
});
