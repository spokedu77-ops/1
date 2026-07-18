import { describe, expect, it } from 'vitest';

import { canOptimizeRemoteImage } from './mediaPreferences';

describe('mediaPreferences', () => {
  it('optimizes local and known remote hosts', () => {
    expect(canOptimizeRemoteImage('/images/spokedu-master/hero.jpg')).toBe(true);
    expect(canOptimizeRemoteImage('https://img.youtube.com/vi/abc/hqdefault.jpg')).toBe(true);
    expect(canOptimizeRemoteImage('https://xyz.supabase.co/storage/v1/object/public/iiwarmup-files/a.png')).toBe(true);
  });

  it('skips unknown remote hosts', () => {
    expect(canOptimizeRemoteImage('https://cdn.example.com/a.jpg')).toBe(false);
  });
});
