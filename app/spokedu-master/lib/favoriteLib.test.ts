import { describe, expect, it } from 'vitest';

import {
  claimPendingLegacyFavorites,
  getFavoritesByOwner,
  getFavoritesOwnerId,
  isFavoriteByOwner,
  migrateLegacyFavorites,
  normalizeFavoriteProgramIds,
  toggleFavoriteByOwner,
} from './favoriteLib';

describe('favorite owner identity', () => {
  it('uses stable user ID before normalized email', () => {
    expect(getFavoritesOwnerId({ id: 'user-1', email: 'A@EXAMPLE.COM' } as never))
      .toBe('id:user-1');
    expect(getFavoritesOwnerId({ id: 'local', email: 'A@EXAMPLE.COM' } as never))
      .toBe('email:a@example.com');
  });

  it('does not create an owner for a logged-out or unidentified profile', () => {
    expect(getFavoritesOwnerId(null)).toBeNull();
    expect(getFavoritesOwnerId({ id: 'local', email: '' } as never)).toBeNull();
  });
});

describe('favorite selectors', () => {
  const state = {
    'id:user-a': ['p1', 'p2'],
    'id:user-b': ['p3'],
  };

  it('keeps owner A and B separate', () => {
    expect(getFavoritesByOwner(state, 'id:user-a')).toEqual(['p1', 'p2']);
    expect(getFavoritesByOwner(state, 'id:user-b')).toEqual(['p3']);
    expect(isFavoriteByOwner(state, 'id:user-b', 'p1')).toBe(false);
  });

  it('does not expose the last owner while logged out', () => {
    expect(getFavoritesByOwner(state, null)).toEqual([]);
    expect(isFavoriteByOwner(state, null, 'p1')).toBe(false);
    expect(getFavoritesByOwner(state, 'id:user-a')).toEqual(['p1', 'p2']);
  });
});

describe('favorite toggle', () => {
  it('adds and removes a program for one owner only', () => {
    const initial = { 'id:user-b': ['p-b'] };
    const added = toggleFavoriteByOwner(initial, 'id:user-a', 'p1');
    expect(added).toEqual({
      'id:user-b': ['p-b'],
      'id:user-a': ['p1'],
    });

    const removed = toggleFavoriteByOwner(added, 'id:user-a', 'p1');
    expect(removed).toEqual({ 'id:user-b': ['p-b'] });
  });

  it('deduplicates an owner list while preserving order', () => {
    const state = { 'id:user-a': ['p1', 'p1', 'p2'] };
    const next = toggleFavoriteByOwner(state, 'id:user-a', 'p3');
    expect(next['id:user-a']).toEqual(['p1', 'p2', 'p3']);
  });

  it('does not write without a resolved owner', () => {
    const state = { 'id:user-a': ['p1'] };
    expect(toggleFavoriteByOwner(state, null, 'p2')).toBe(state);
  });
});

describe('legacy favorite migration helpers', () => {
  it('deduplicates legacy IDs while preserving first-seen order', () => {
    expect(migrateLegacyFavorites(['p2', 'p1', 'p2'], 'id:user-a'))
      .toEqual({ 'id:user-a': ['p2', 'p1'] });
  });

  it('does not assign unidentified legacy data to an arbitrary owner', () => {
    expect(migrateLegacyFavorites(['p1'], null)).toEqual({});
  });

  it('claims pending data once and keeps other owners isolated', () => {
    const first = claimPendingLegacyFavorites(
      { 'id:user-b': ['p-b'] },
      ['p1', 'p1', 'p2'],
      { ownerId: 'id:user-a', emailOwnerId: 'email:a@example.com' },
    );
    expect(first).toEqual({
      favoriteProgramIdsByOwner: {
        'id:user-b': ['p-b'],
        'id:user-a': ['p1', 'p2'],
      },
      pendingLegacyFavoriteProgramIds: [],
    });

    const second = claimPendingLegacyFavorites(
      first.favoriteProgramIdsByOwner,
      first.pendingLegacyFavoriteProgramIds,
      { ownerId: 'id:user-a', emailOwnerId: 'email:a@example.com' },
    );
    expect(second).toEqual(first);
  });

  it('moves matching email data to stable user ID without duplication', () => {
    const result = claimPendingLegacyFavorites(
      {
        'email:a@example.com': ['p1', 'p2'],
        'id:user-a': ['p2', 'p3'],
      },
      [],
      { ownerId: 'id:user-a', emailOwnerId: 'email:a@example.com' },
    );
    expect(result.favoriteProgramIdsByOwner).toEqual({
      'id:user-a': ['p2', 'p3', 'p1'],
    });
  });

  it('normalizes only unique non-empty string IDs', () => {
    expect(normalizeFavoriteProgramIds(['p1', '', 'p1', null, 'p2']))
      .toEqual(['p1', 'p2']);
  });
});
