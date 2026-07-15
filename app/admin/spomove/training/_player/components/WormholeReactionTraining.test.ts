import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { quadrantLaneCountToResultLaneCount } from './WormholeReactionTraining';

describe('quadrantLaneCountToResultLaneCount', () => {
  test('maps Wormhole quadrants to the shared reactTrain result color order', () => {
    // Wormhole screen quadrants: red TL, yellow TR, green BL, blue BR.
    // Shared result order: red, blue, green, yellow.
    expect(quadrantLaneCountToResultLaneCount([1, 2, 3, 4])).toEqual([1, 4, 3, 2]);
  });

  test('triggers asteroid bursts near peak scale only once per asteroid', () => {
    const source = readFileSync(join(__dirname, 'WormholeReactionTraining.tsx'), 'utf8');

    expect(source).toContain('exploded: boolean');
    expect(source).toContain('exploded: false');
    expect(source).toContain('const ASTEROID_EXPLOSION_SCALE_PROGRESS = 0.62');
    expect(source).toContain('if (!data.exploded && scaleT >= ASTEROID_EXPLOSION_SCALE_PROGRESS)');
    expect(source).toContain('const burstPosition = new THREE.Vector3(obs.position.x, obs.position.y, obs.position.z)');
    expect(source).toContain('scene.remove(obs)');
    expect(source).toContain('continue;');
    expect(source).not.toContain('g.bursts.push(spawnBurst(obs.position, data.quadrantIndex))');
  });
});
