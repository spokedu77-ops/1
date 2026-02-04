/**
 * Mock Think Pack - 에셋 없이 미리보기용
 * 색상 placeholder (실제 URL 없음)
 */

import type { ThinkPackSets } from './types';

const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="%231a1a1a"/>
  <circle cx="32" cy="32" r="20" fill="%23666"/>
</svg>
`);

export const MOCK_THINK_PACK: ThinkPackSets = {
  setA: {
    red: PLACEHOLDER,
    green: PLACEHOLDER,
    yellow: PLACEHOLDER,
    blue: PLACEHOLDER,
  },
  setB: {
    red: PLACEHOLDER,
    green: PLACEHOLDER,
    yellow: PLACEHOLDER,
    blue: PLACEHOLDER,
  },
};
