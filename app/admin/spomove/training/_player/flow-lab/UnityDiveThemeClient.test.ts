import { describe, expect, it } from 'vitest';

import {
  isProductionSinglePlayerEnabled,
  isSafeProductionSinglePlayerUrl,
  resolveDivePlayer,
  resolveProductionSinglePlayerUrl,
} from './UnityDiveThemeClient';

describe('DIVE player routing', () => {
  it('defaults production to the same-origin Golden Single Player without environment variables', () => {
    expect(isProductionSinglePlayerEnabled(undefined)).toBe(true);
    expect(resolveProductionSinglePlayerUrl(undefined)).toBe('/spomove/dive/unity/player/index.html');
  });

  it('keeps an explicit off switch for the legacy theme2 rollback', () => {
    expect(isProductionSinglePlayerEnabled('0')).toBe(false);
  });
  it.each(['localhost', '127.0.0.1'])('keeps %s on the local Single Player', (hostname) => {
    expect(resolveDivePlayer(hostname, false, '')).toEqual({
      contract: 'single-player',
      url: '/spomove/dive/unity/player_release_test/index.html',
    });
  });

  it('keeps production on the legacy theme2 player while the switch is off', () => {
    expect(resolveDivePlayer('spokedu.kr', false, 'https://cdn.example.com/dive/index.html')).toEqual({
      contract: 'legacy-theme2',
      url: '/spomove/dive/unity/theme2/index.html',
    });
  });

  it('uses the configured public HTTPS Single Player when the switch is on', () => {
    expect(resolveDivePlayer('spokedu.kr', true, 'https://cdn.example.com/dive/index.html')).toEqual({
      contract: 'single-player',
      url: 'https://cdn.example.com/dive/index.html',
    });
  });

  it('uses the same-origin production Single Player path when the switch is on', () => {
    expect(resolveDivePlayer('spokedu.kr', true, '/spomove/dive/unity/player/index.html')).toEqual({
      contract: 'single-player',
      url: '/spomove/dive/unity/player/index.html',
    });
  });

  it.each([
    '',
    '//cdn.example.com/dive/index.html',
    'http://cdn.example.com/dive/index.html',
    'https://localhost:3000/dive/index.html',
    'https://127.0.0.1:3000/dive/index.html',
  ])('rejects unsafe production URL %s', (url) => {
    expect(isSafeProductionSinglePlayerUrl(url)).toBe(false);
    expect(resolveDivePlayer('spokedu.kr', true, url).contract).toBe('legacy-theme2');
  });
});