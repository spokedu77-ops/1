import { describe, expect, it } from 'vitest';

import { canOptimizeRemoteImage, nextImageUnoptimized } from './mediaPreferences';

describe('mediaPreferences', () => {
  it('optimizes local and known remote hosts', () => {
    expect(canOptimizeRemoteImage('/images/spokedu-master/hero.jpg')).toBe(true);
    expect(canOptimizeRemoteImage('https://img.youtube.com/vi/abc/hqdefault.jpg')).toBe(true);
    expect(canOptimizeRemoteImage('https://i.postimg.cc/abc.webp')).toBe(true);
  });

  it('serves Supabase storage direct without Vercel image optimization', () => {
    const supabase =
      'https://xyz.supabase.co/storage/v1/object/public/iiwarmup-files/a.png';
    expect(canOptimizeRemoteImage(supabase)).toBe(false);
    expect(nextImageUnoptimized(supabase)).toBe(true);
  });

  it('skips unknown remote hosts', () => {
    expect(canOptimizeRemoteImage('https://cdn.example.com/a.jpg')).toBe(false);
    expect(nextImageUnoptimized('https://cdn.example.com/a.jpg')).toBe(true);
  });
});
