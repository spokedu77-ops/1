import { describe, expect, it } from 'vitest';

import {
  getFavoritesByOwner,
  getFavoritesOwnerId,
  isFavoriteByOwner,
  migrateLegacyFavorites,
  toggleFavoriteByOwner,
} from './favoriteLib';

describe('getFavoritesOwnerId', () => {
  it('null profile은 "local" 반환', () => {
    expect(getFavoritesOwnerId(null)).toBe('local');
  });

  it('일반 id 계정은 id: 접두사 사용', () => {
    expect(getFavoritesOwnerId({ id: 'user-1', email: '' } as never)).toBe('id:user-1');
  });

  it('"local" id + 이메일이 있으면 email: 접두사 사용', () => {
    expect(getFavoritesOwnerId({ id: 'local', email: 'Test@EXAMPLE.COM' } as never))
      .toBe('email:test@example.com');
  });

  it('이메일 대소문자 혼합 → 소문자 통일', () => {
    expect(getFavoritesOwnerId({ id: 'user-2', email: 'A@B.COM' } as never)).toBe('id:user-2');
    expect(getFavoritesOwnerId({ id: 'local', email: 'A@B.COM' } as never))
      .toBe('email:a@b.com');
  });

  it('id도 email도 없으면 "local" 반환', () => {
    expect(getFavoritesOwnerId({ id: 'local', email: '' } as never)).toBe('local');
  });
});

describe('getFavoritesByOwner', () => {
  it('없는 owner는 빈 배열 반환', () => {
    expect(getFavoritesByOwner({}, 'id:user-1')).toEqual([]);
  });

  it('있는 owner는 해당 배열 반환', () => {
    expect(getFavoritesByOwner({ 'id:user-1': ['p1', 'p2'] }, 'id:user-1')).toEqual(['p1', 'p2']);
  });
});

describe('isFavoriteByOwner', () => {
  const state = { 'id:user-1': ['p1', 'p2'] };

  it('즐겨찾기된 ID는 true', () => {
    expect(isFavoriteByOwner(state, 'id:user-1', 'p1')).toBe(true);
  });

  it('즐겨찾기 안 된 ID는 false', () => {
    expect(isFavoriteByOwner(state, 'id:user-1', 'p3')).toBe(false);
  });

  it('없는 owner는 false', () => {
    expect(isFavoriteByOwner(state, 'id:user-2', 'p1')).toBe(false);
  });
});

describe('toggleFavoriteByOwner', () => {
  it('없는 ID를 추가하면 배열에 포함됨', () => {
    const next = toggleFavoriteByOwner({}, 'id:user-1', 'p1');
    expect(next['id:user-1']).toContain('p1');
  });

  it('이미 있는 ID를 누르면 제거됨', () => {
    const state = { 'id:user-1': ['p1', 'p2'] };
    const next = toggleFavoriteByOwner(state, 'id:user-1', 'p1');
    expect(next['id:user-1']).not.toContain('p1');
    expect(next['id:user-1']).toContain('p2');
  });

  it('다른 owner에 영향 없음', () => {
    const state = { 'id:user-1': ['p1'], 'id:user-2': ['p2'] };
    const next = toggleFavoriteByOwner(state, 'id:user-1', 'p1');
    expect(next['id:user-2']).toEqual(['p2']);
  });

  it('원본 상태를 변경하지 않음 (immutable)', () => {
    const state = { 'id:user-1': ['p1'] };
    const original = state['id:user-1'];
    toggleFavoriteByOwner(state, 'id:user-1', 'p2');
    expect(state['id:user-1']).toBe(original);
  });

  it('add → remove → add 반복 toggle 가능', () => {
    const s0 = {};
    const s1 = toggleFavoriteByOwner(s0, 'id:user-1', 'p1');
    const s2 = toggleFavoriteByOwner(s1, 'id:user-1', 'p1');
    const s3 = toggleFavoriteByOwner(s2, 'id:user-1', 'p1');
    expect(s1['id:user-1']).toContain('p1');
    expect(s2['id:user-1']).not.toContain('p1');
    expect(s3['id:user-1']).toContain('p1');
  });
});

describe('migrateLegacyFavorites', () => {
  it('기존 favorites 배열을 ownerId 아래로 마이그레이션', () => {
    const result = migrateLegacyFavorites(['p1', 'p2'], 'id:user-1');
    expect(result['id:user-1']).toEqual(['p1', 'p2']);
  });

  it('ownerId가 null이면 빈 객체 반환', () => {
    expect(migrateLegacyFavorites(['p1'], null)).toEqual({});
  });

  it('legacy가 빈 배열이면 빈 객체 반환', () => {
    expect(migrateLegacyFavorites([], 'id:user-1')).toEqual({});
  });

  it('legacy가 undefined면 빈 객체 반환', () => {
    expect(migrateLegacyFavorites(undefined, 'id:user-1')).toEqual({});
  });

  it('원본 배열을 복사하여 독립적으로 저장', () => {
    const legacy = ['p1'];
    const result = migrateLegacyFavorites(legacy, 'id:user-1');
    legacy.push('p2');
    expect(result['id:user-1']).toEqual(['p1']);
  });
});
