import { describe, expect, it } from 'vitest';
import { toStudentProfile } from './operationalDataAdapter';
import type { MasterStudentDto } from '../types/operational';

describe('operational student adapter', () => {
  it('keeps the server UUID and legacy display metadata without deriving membership', () => {
    const dto: MasterStudentDto = {
      id: '11111111-1111-4111-8111-111111111111', legacyId: 'legacy-student-1', name: '학생 1',
      group: '과거 A반', meta: '만 8세', createdAt: '2026-06-17T00:00:00.000Z', updatedAt: '2026-06-17T00:00:00.000Z',
    };
    expect(toStudentProfile(dto)).toMatchObject({ id: dto.id, name: dto.name, group: '과거 A반', meta: '만 8세' });
  });
});
