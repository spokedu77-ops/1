import { describe, expect, it } from 'vitest';

import { migrateMasterStore } from './index';

describe('today lesson persisted-store migration', () => {
  it('wraps a valid legacy assignment and preserves unrelated fields', () => {
    const assignment = {
      programId: 'p1',
      programTitle: '피구',
      assignedAt: '2026-08-15T00:00:00.000Z',
      dayKey: '2026-08-15',
    };
    const migrated = migrateMasterStore({
      todayLessonByOwner: { 'id:user': assignment },
      favoriteProgramIdsByOwner: { 'id:user': ['p2'] },
    }, 16);

    expect(migrated.todayLessonByOwner).toEqual({ 'id:user': [assignment] });
    expect(migrated.favoriteContentRefsByOwner).toEqual({});
    expect(migrated.pendingLegacyFavoriteIdsByOwner).toEqual({ 'id:user': ['p2'] });
  });

  it('drops invalid legacy values without throwing', () => {
    expect(() => migrateMasterStore({
      todayLessonByOwner: {
        'id:user': { programId: 'missing-day-key' },
        'email:user@example.com': null,
      },
    }, 16)).not.toThrow();
    expect(migrateMasterStore({ todayLessonByOwner: { 'id:user': false } }, 16).todayLessonByOwner).toEqual({});
  });
});
