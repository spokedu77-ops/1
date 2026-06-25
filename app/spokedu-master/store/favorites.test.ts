import { describe, expect, it } from 'vitest';

import { migrateMasterStore } from './index';

describe('master store favorite migration', () => {
  it('assigns legacy favorites only when the persisted profile identifies an owner', () => {
    const migrated = migrateMasterStore({
      profile: { id: 'user-a', email: 'A@example.com' },
      favorites: ['p1', 'p1', 'p2'],
    }, 13);

    expect(migrated.favoriteProgramIdsByOwner).toEqual({
      'id:user-a': ['p1', 'p2'],
    });
    expect(migrated.pendingLegacyFavoriteProgramIds).toEqual([]);
    expect(migrated).not.toHaveProperty('favorites');
  });

  it('preserves unidentified legacy favorites as hidden pending data', () => {
    const migrated = migrateMasterStore({
      profile: { id: 'local', email: '' },
      favorites: ['p1', 'p2'],
    }, 13);

    expect(migrated.favoriteProgramIdsByOwner).toEqual({});
    expect(migrated.pendingLegacyFavoriteProgramIds).toEqual(['p1', 'p2']);
    expect(migrated).not.toHaveProperty('favorites');
  });

  it('does not duplicate migration when migrated state is processed again', () => {
    const first = migrateMasterStore({
      profile: { id: 'local', email: '' },
      favorites: ['p1', 'p1', 'p2'],
    }, 13);
    const second = migrateMasterStore(first, 15);

    expect(second.favoriteProgramIdsByOwner).toEqual({});
    expect(second.pendingLegacyFavoriteProgramIds).toEqual(['p1', 'p2']);
    expect(second).not.toHaveProperty('favorites');
  });

  it('normalizes existing owner data without merging owners', () => {
    const migrated = migrateMasterStore({
      favoriteProgramIdsByOwner: {
        'id:user-a': ['p1', 'p1', 'p2'],
        'id:user-b': ['p1'],
        local: ['must-not-be-exposed'],
      },
      pendingLegacyFavoriteProgramIds: [],
    }, 15);

    expect(migrated.favoriteProgramIdsByOwner).toEqual({
      'id:user-a': ['p1', 'p2'],
      'id:user-b': ['p1'],
    });
  });
});
