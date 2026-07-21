import { describe, expect, it } from 'vitest';

import { OFFICIAL_SPOMOVE_LIBRARY } from './officialSpomovePresets';
import { officialPresetSessionHref, publicOfficialPresetSessionHref } from './officialSpomovePresets';

describe('public SPOMOVE session links', () => {
  const preset = OFFICIAL_SPOMOVE_LIBRARY.find((p) => p.isReady) ?? OFFICIAL_SPOMOVE_LIBRARY[0]!;

  it('공개 실행 링크는 autostart를 생성하지 않는다', () => {
    const href = publicOfficialPresetSessionHref(preset, {
      entry: 'start',
      movement: 'footTap',
      limb: 'free',
      cueSeconds: 3,
    });
    expect(href).toContain('entry=start');
    expect(href).not.toContain('autostart=');
  });

  it('settings entry도 autostart 없음', () => {
    const href = publicOfficialPresetSessionHref(preset, { entry: 'settings' });
    expect(href).toContain('entry=settings');
    expect(href).not.toContain('autostart=');
  });

  it('legacy officialPresetSessionHref는 autostart를 붙일 수 있다', () => {
    const href = officialPresetSessionHref(preset, { autostart: true });
    expect(href).toContain('autostart=1');
  });
});
