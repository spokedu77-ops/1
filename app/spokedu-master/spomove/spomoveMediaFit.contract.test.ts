import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';


function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

const layeredThumb = read('app/spokedu-master/spomove/SpomoveLayeredThumb.tsx');

describe('SPOMOVE media fit — clean discovery thumbs / video 16:9 (not rendered PASS)', () => {
  it('recovers when a failed thumbnail URL is replaced after an upload', () => {
    expect(layeredThumb).toContain('failedSrc !== src');
    expect(layeredThumb).toContain('setFailedSrc(src)');
    expect(layeredThumb).toContain('stretchSrc === src');
  });


});
