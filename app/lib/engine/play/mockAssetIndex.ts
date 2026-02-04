/**
 * mockAssetIndex - play-test용 실사 URL
 * AssetHub 교체 시 이 객체만 교체하면 됨
 */

import type { AssetIndex } from './types';

const W = 800;
const H = 600;

/** BINARY on/off, REVEAL_WIPE bg/fg, DROP obj 등 실사 이미지 URL */
export const mockAssetIndex: AssetIndex = {
  motions: {
    say_hi: {
      off: `https://picsum.photos/id/10/${W}/${H}`,
      on: `https://picsum.photos/id/11/${W}/${H}`,
      bgSrc: `https://picsum.photos/id/12/${W}/${H}`,
      fgSrc: `https://picsum.photos/id/13/${W}/${H}`,
    },
    walk: {
      off: `https://picsum.photos/id/20/${W}/${H}`,
      on: `https://picsum.photos/id/21/${W}/${H}`,
    },
    throw: {
      off: `https://picsum.photos/id/30/${W}/${H}`,
      on: `https://picsum.photos/id/31/${W}/${H}`,
      objects: [
        `https://picsum.photos/id/100/120/120`,
        `https://picsum.photos/id/101/120/120`,
        `https://picsum.photos/id/102/120/120`,
        `https://picsum.photos/id/103/120/120`,
        `https://picsum.photos/id/104/120/120`,
      ],
      bgSrc: `https://picsum.photos/id/32/${W}/${H}`,
    },
    clap: {
      off: `https://picsum.photos/id/40/${W}/${H}`,
      on: `https://picsum.photos/id/41/${W}/${H}`,
    },
    punch: {
      off: `https://picsum.photos/id/50/${W}/${H}`,
      on: `https://picsum.photos/id/51/${W}/${H}`,
    },
  },
};
