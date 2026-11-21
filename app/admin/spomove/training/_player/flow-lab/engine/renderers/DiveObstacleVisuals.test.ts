import { afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import * as THREE from 'three';
import { DiveObstacleVisuals, oceanDuckFrameBlend } from './DiveObstacleVisuals';
import { getDiveObstacleDefaults, resolveDiveObstacleUrls, OCEAN_DUCK_SHARK_FRAMES } from '@/app/lib/spomove/diveThemes';
import { ObstacleManager, type FlowBridge } from '../entities/ObstacleManager';

function texture(width = 200, height = 100) {
  return new THREE.Texture({ width, height } as HTMLImageElement);
}
afterEach(() => vi.restoreAllMocks());

describe('shared DIVE image obstacles', () => {
  it('uses all four supplied local shark frames, advancing by distance rather than time', async () => {
    expect(OCEAN_DUCK_SHARK_FRAMES.every(url => existsSync(`public${url}`))).toBe(true);
    vi.spyOn(THREE.TextureLoader.prototype, 'loadAsync').mockImplementation(async url => {
      const tex = texture(768, 768); tex.userData.url = url; return tex;
    });
    const visuals = new DiveObstacleVisuals('ocean');
    await visuals.load(getDiveObstacleDefaults('ocean'));
    const group = new THREE.Group(); group.position.set(23, 180, -4000);
    visuals.attach(group, 'duck');
    const sprite = group.getObjectByName('ocean-duck') as THREE.Sprite;
    const blend = group.getObjectByName('ocean-duck-blend') as THREE.Sprite;
    const position = sprite.position.clone(), scale = sprite.scale.clone();
    for (const [index, distance] of [2000, 1300, 700, 100].entries()) {
      visuals.updateDuck(group, distance);
      expect(sprite.material.map?.userData.url).toBe(OCEAN_DUCK_SHARK_FRAMES[index]);
      expect(sprite.position).toEqual(position); expect(sprite.scale).toEqual(scale);
      expect(blend.position).toEqual(position); expect(blend.scale).toEqual(scale);
      expect(group.position).toEqual(new THREE.Vector3(23, 180, -4000));
    }
    visuals.updateDuck(group, 1600);
    expect(sprite.material.opacity).toBe(.5); expect(blend.material.opacity).toBe(.5);
    expect(blend.visible).toBe(true);
    expect(oceanDuckFrameBlend(0).frame).toBe(3);
    visuals.dispose();
  });

  it('preserves the registered static image if one animation frame fails', async () => {
    vi.spyOn(THREE.TextureLoader.prototype, 'loadAsync').mockImplementation(async url => {
      if (url === OCEAN_DUCK_SHARK_FRAMES[1]) throw Error('missing frame');
      const tex = texture(768, 768); tex.userData.url = url; return tex;
    });
    const visuals = new DiveObstacleVisuals('ocean');
    await visuals.load({ ...getDiveObstacleDefaults('ocean'), duck: 'registered-shark.png' });
    const group = new THREE.Group(); visuals.attach(group, 'duck'); visuals.updateDuck(group, 0);
    const sprite = group.getObjectByName('ocean-duck') as THREE.Sprite;
    expect(sprite.material.map?.userData.url).toBe('registered-shark.png');
    expect(sprite.visible).toBe(true); expect(group.getObjectByName('ocean-duck-blend')?.visible).toBe(false);
    visuals.dispose();
  });

  it('keeps the original warning, duck and passed world-coordinate thresholds', async () => {
    vi.spyOn(THREE.TextureLoader.prototype, 'loadAsync').mockImplementation(async () => texture(768, 768));
    for (const theme of ['space', 'ocean'] as const) {
      const visuals = new DiveObstacleVisuals(theme); await visuals.load(getDiveObstacleDefaults(theme));
      const scene = new THREE.Scene(), bridgeMesh = new THREE.Group(); scene.add(bridgeMesh);
      const bridge: FlowBridge = { mesh: bridgeMesh, lane: 1, bridgeId: 1, x: 0, hasBox: false, padMesh: new THREE.Mesh() };
      const onUfoWarn = vi.fn(), onUfoDuckStart = vi.fn(), onUfoPassed = vi.fn();
      const manager = new ObstacleManager(scene, 4200, { onUfoWarn, onUfoDuckStart, onUfoPassed }, undefined, visuals);
      manager.attachUfo(bridge);
      for (const [z, counts] of [[-201, [0, 0, 0]], [-199, [1, 0, 0]], [199, [1, 0, 0]], [201, [1, 1, 0]], [499, [1, 1, 0]], [501, [1, 1, 1]]] as const) {
        bridgeMesh.position.z = z + 840; manager.update(0, 400);
        expect([onUfoWarn.mock.calls.length, onUfoDuckStart.mock.calls.length, onUfoPassed.mock.calls.length]).toEqual(counts);
      }
      if (theme === 'space') expect(bridgeMesh.getObjectByName('ocean-duck-blend')).toBeUndefined();
      visuals.dispose();
    }
  });

  it('resolves an independent override per theme and uses existing local default files', () => {
    for (const theme of ['space', 'ocean'] as const) {
      const defaults = getDiveObstacleDefaults(theme);
      expect(Object.values(defaults).every(url => existsSync(`public${url}`))).toBe(true);
      expect(resolveDiveObstacleUrls(theme, undefined, () => null)).toEqual(defaults);
    }
    const entry = { panoramaPath: 'p', panoramaLowPath: 'l', hasHighRes: false, width: 1, height: 1, fileSize: 1, updatedAt: 1, obstacles: { punch: 'registered.png' } };
    expect(resolveDiveObstacleUrls('space', entry, path => path ? `https://cdn.example/${path}` : null))
      .toEqual({ ...getDiveObstacleDefaults('space'), punch: 'https://cdn.example/registered.png' });
  });

  it('preserves source ratio and original referenced meshes; only the sprite is shown', async () => {
    vi.spyOn(THREE.TextureLoader.prototype, 'loadAsync').mockImplementation(async () => texture());
    const visuals = new DiveObstacleVisuals('space');
    await visuals.load(getDiveObstacleDefaults('space'));
    const original = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    const group = new THREE.Group(); group.add(original);
    visuals.attach(group, 'duck');
    const sprite = group.getObjectByName('space-duck') as THREE.Sprite;
    expect(group.children).toContain(original);
    expect(original.visible).toBe(false);
    expect(sprite.visible).toBe(true);
    expect(sprite.scale.x / sprite.scale.y).toBe(2);
    expect(sprite.material.rotation).toBe(0);
    expect(sprite.material.color.getHex()).toBe(0xffffff);
    expect(sprite.material.map?.colorSpace).toBe(THREE.SRGBColorSpace);
    visuals.dispose();
  });

  it('falls back to the same theme PNG, then preserves original geometry if both URLs fail', async () => {
    const defaults = getDiveObstacleDefaults('space');
    const loader = vi.spyOn(THREE.TextureLoader.prototype, 'loadAsync').mockImplementation(async url => {
      if (url === 'bad.png') throw Error('missing');
      return texture();
    });
    const visuals = new DiveObstacleVisuals('space');
    await visuals.load({ ...defaults, duck: 'bad.png' });
    expect(loader).toHaveBeenCalledWith(defaults.duck);
    visuals.dispose();
    loader.mockRejectedValue(Error('offline'));
    const offline = new DiveObstacleVisuals('space');
    await offline.load(defaults);
    const group = new THREE.Group(); const original = new THREE.Group(); group.add(original);
    offline.attach(group, 'duck');
    expect(original.visible).toBe(true);
    expect(group.getObjectByName('space-duck')?.visible).toBe(false);
    offline.dispose();
  });

  it('keeps the REACH image through all five original hits and removes it on final break', async () => {
    vi.spyOn(THREE.TextureLoader.prototype, 'loadAsync').mockImplementation(async () => texture());
    const visuals = new DiveObstacleVisuals('space'); await visuals.load(getDiveObstacleDefaults('space'));
    const scene = new THREE.Scene(); const bridgeMesh = new THREE.Group(); scene.add(bridgeMesh);
    const bridge: FlowBridge = { mesh: bridgeMesh, lane: 1, bridgeId: 1, x: 0, hasBox: false, padMesh: new THREE.Mesh() };
    const manager = new ObstacleManager(scene, 4200, {}, undefined, visuals);
    manager.attachBox(bridge, new Set(['reach']), true);
    bridgeMesh.position.z = 1380; // wall at z=330, existing approach trigger, before prune
    manager.update(1 / 60, 400);
    const sprite = bridgeMesh.getObjectByName('space-reach');
    for (let hit = 1; hit <= 5; hit++) {
      expect(manager.hitPunchWall()).toBe(hit === 5);
      expect(sprite?.visible).toBe(true);
      expect(bridgeMesh.getObjectByName('space-reach')).toBe(sprite);
    }
    manager.breakPunchWall();
    expect(bridgeMesh.getObjectByName('space-reach')).toBeUndefined();
    visuals.dispose();
  });
});
