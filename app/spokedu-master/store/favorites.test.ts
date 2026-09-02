import { describe, expect, it } from 'vitest';

import { migrateMasterStore } from './index';

describe('master store favorite migration', () => {
  it('keeps owner-scoped legacy IDs pending until exact catalogs can classify them', () => {
    const migrated = migrateMasterStore({
      profile: { id: 'user-a', email: 'A@example.com' },
      favorites: ['p1', 'p1', 'p2'],
    }, 13);

    expect(migrated.favoriteContentRefsByOwner).toEqual({});
    expect(migrated.pendingLegacyFavoriteIdsByOwner).toEqual({ 'id:user-a': ['p1', 'p2'] });
    expect(migrated.pendingLegacyFavoriteIds).toEqual([]);
    expect(migrated).not.toHaveProperty('favorites');
  });

  it('preserves unidentified legacy favorites as hidden pending data', () => {
    const migrated = migrateMasterStore({
      profile: { id: 'local', email: '' },
      favorites: ['p1', 'p2'],
    }, 13);

    expect(migrated.favoriteContentRefsByOwner).toEqual({});
    expect(migrated.pendingLegacyFavoriteIds).toEqual(['p1', 'p2']);
    expect(migrated).not.toHaveProperty('favorites');
  });

  it('does not duplicate migration when migrated state is processed again', () => {
    const first = migrateMasterStore({
      profile: { id: 'local', email: '' },
      favorites: ['p1', 'p1', 'p2'],
    }, 13);
    const second = migrateMasterStore(first, 15);

    expect(second.favoriteContentRefsByOwner).toEqual({});
    expect(second.pendingLegacyFavoriteIds).toEqual(['p1', 'p2']);
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

    expect(migrated.favoriteContentRefsByOwner).toEqual({});
    expect(migrated.pendingLegacyFavoriteIdsByOwner).toEqual({
      'id:user-a': ['p1', 'p2'],
      'id:user-b': ['p1'],
    });
  });

  it('normalizes already typed favorites without collapsing content domains', () => {
    const migrated = migrateMasterStore({
      favoriteContentRefsByOwner: {
        'id:user-a': [
          { type: 'program', id: 'same-id' },
          { type: 'spomove', id: 'same-id' },
          { type: 'program', id: 'same-id' },
        ],
      },
    }, 18);
    expect(migrated.favoriteContentRefsByOwner).toEqual({
      'id:user-a': [
        { type: 'program', id: 'same-id' },
        { type: 'spomove', id: 'same-id' },
      ],
    });
  });
});
