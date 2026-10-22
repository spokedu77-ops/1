import { describe, expect, it } from 'vitest';

import { canOptimizeRemoteImage, nextImageUnoptimized } from './mediaPreferences';

describe('mediaPreferences', () => {
  it('optimizes local and known remote hosts', () => {
    expect(canOptimizeRemoteImage('/images/spokedu-master/hero.jpg')).toBe(true);
    expect(canOptimizeRemoteImage('https://img.youtube.com/vi/abc/hqdefault.jpg')).toBe(true);
    expect(canOptimizeRemoteImage('https://i.postimg.cc/abc.webp')).toBe(true);
    expect(canOptimizeRemoteImage('https://xyz.supabase.co/storage/v1/object/public/iiwarmup-files/a.png')).toBe(false);
    expect(nextImageUnoptimized('https://xyz.supabase.co/storage/v1/object/public/iiwarmup-files/a.png')).toBe(true);
  });

  it('keeps signed Supabase storage URLs direct', () => {
    const signed = 'https://xyz.supabase.co/storage/v1/object/sign/private/a.png?token=abc';
    expect(canOptimizeRemoteImage(signed)).toBe(false);
    expect(nextImageUnoptimized(signed)).toBe(true);
  });

  it('skips unknown remote hosts', () => {
    expect(canOptimizeRemoteImage('https://cdn.example.com/a.jpg')).toBe(false);
    expect(nextImageUnoptimized('https://cdn.example.com/a.jpg')).toBe(true);
  });
});
