import * as THREE from 'three';
import { getDiveObstacleDefaults, OCEAN_DUCK_SHARK_FRAMES, type DiveActiveThemeId, type DiveObstacleKind, type DiveObstacleUrls } from '@/app/lib/spomove/diveThemes';

/** Distance ahead of the existing player anchor; no separate animation clock. */
export function oceanDuckFrameBlend(distance: number) {
  const thresholds = [1600, 1000, 450];
  if (!Number.isFinite(distance)) return { frame: 0, next: 0, mix: 0 };
  for (let frame = 0; frame < thresholds.length; frame++) {
    const threshold = thresholds[frame];
    if (distance >= threshold + 75) return { frame, next: frame, mix: 0 };
    if (distance > threshold - 75) return { frame, next: frame + 1, mix: (threshold + 75 - distance) / 150 };
  }
  return { frame: 3, next: 3, mix: 0 };
}

const OCEAN_BOUNDS: Record<DiveObstacleKind, { width: number; height: number; y: number }> = {
  duck: { width: 330, height: 250, y: 10 },
  // Entity anchors stay unchanged: these offsets separate the visible targets.
  // Punch center = 200; kick center = 85 (deck = 40).
  punch: { width: 110, height: 85, y: 100 },
  kick: { width: 95, height: 85, y: 41 },
  reach: { width: 160, height: 230, y: 155 },
};
const SPACE_BOUNDS: typeof OCEAN_BOUNDS = {
  duck: { width: 360, height: 290, y: 10 },
  punch: { width: 125, height: 110, y: 100 },
  kick: { width: 110, height: 90, y: 41 },
  reach: { width: 190, height: 245, y: 155 },
};

/** Shared per-run textures; the existing entities continue to own movement and triggers. */
export class DiveObstacleVisuals {
  private textures = new Map<DiveObstacleKind, THREE.Texture>();
  private duckFrames: THREE.Texture[] = [];
  private instances = new Map<THREE.Group, { kind: DiveObstacleKind; sprite: THREE.Sprite; blend?: THREE.Sprite; originals: THREE.Object3D[] }>();
  private generation = 0;
  private disposed = false;
  constructor(private theme: DiveActiveThemeId) {}

  async load(urls: DiveObstacleUrls): Promise<void> {
    const generation = ++this.generation;
    const loader = new THREE.TextureLoader();
    await Promise.all((Object.keys(OCEAN_BOUNDS) as DiveObstacleKind[]).map(async kind => {
      let texture: THREE.Texture;
      try { texture = await loader.loadAsync(urls[kind]); }
      catch {
        try { texture = await loader.loadAsync(getDiveObstacleDefaults(this.theme)[kind]); }
        catch { return; } // Existing procedural visual remains a safe final fallback.
      }
      if (this.disposed || generation !== this.generation) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      const previous = this.textures.get(kind);
      this.textures.set(kind, texture);
      for (const [group, instance] of this.instances) {
        if (!group.parent) { instance.sprite.material.dispose(); instance.blend?.material.dispose(); this.instances.delete(group); continue; }
        if (instance.kind === kind) this.applyTexture(instance.sprite, kind, kind === 'duck' && this.duckFrames.length === 4 ? this.duckFrames[0] : texture, instance.originals);
      }
      previous?.dispose();
    }));
    if (this.theme !== 'ocean') return;
    // The supplied four-frame sequence is the OCEAN DUCK visual. The existing
    // registered/default static texture remains the fallback if any frame fails.
    const loaded = await Promise.allSettled(OCEAN_DUCK_SHARK_FRAMES.map(url => loader.loadAsync(url)));
    const frames = loaded.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
    const first = frames[0]?.image as { width: number; height: number } | undefined;
    const aligned = first && frames.every(frame => frame.image.width === first.width && frame.image.height === first.height);
    if (this.disposed || generation !== this.generation || frames.length !== 4 || !aligned) {
      frames.forEach(frame => frame.dispose()); return;
    }
    frames.forEach(frame => { frame.colorSpace = THREE.SRGBColorSpace; });
    const previous = this.duckFrames;
    this.duckFrames = frames;
    for (const instance of this.instances.values()) {
      if (instance.kind !== 'duck') continue;
      this.applyTexture(instance.sprite, 'duck', frames[0], instance.originals);
      if (instance.blend) { instance.blend.scale.copy(instance.sprite.scale); instance.blend.visible = false; }
    }
    previous.forEach(frame => frame.dispose());
  }

  attach(group: THREE.Group, kind: DiveObstacleKind): void {
    const originals = [...group.children];
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, alphaTest: 0.01, toneMapped: false, fog: false }));
    sprite.name = `${this.theme}-${kind}`;
    sprite.visible = false;
    sprite.position.y = this.bounds[kind].y;
    group.add(sprite);
    let blend: THREE.Sprite | undefined;
    if (this.theme === 'ocean' && kind === 'duck') {
      blend = sprite.clone(); blend.material = sprite.material.clone();
      blend.name = 'ocean-duck-blend'; blend.visible = false; group.add(blend);
    }
    this.instances.set(group, { kind, sprite, blend, originals });
    const texture = kind === 'duck' && this.duckFrames.length === 4 ? this.duckFrames[0] : this.textures.get(kind);
    if (texture) this.applyTexture(sprite, kind, texture, originals);
    if (blend) blend.scale.copy(sprite.scale);
  }

  updateDuck(group: THREE.Group, distance: number): void {
    if (this.theme !== 'ocean' || this.duckFrames.length !== 4) return;
    const instance = this.instances.get(group);
    if (!instance?.blend || instance.kind !== 'duck') return;
    const { frame, next, mix } = oceanDuckFrameBlend(distance);
    const { sprite, blend } = instance;
    // All original frames have the same canvas. Switch maps only: never crop,
    // recenter, rescale or move either sprite during an approach.
    sprite.material.map = this.duckFrames[frame]; sprite.material.opacity = 1 - mix;
    sprite.userData.sharkFrame = frame + 1;
    blend.material.map = this.duckFrames[next]; blend.material.opacity = mix;
    blend.userData.sharkFrame = next + 1;
    blend.visible = mix > 0;
  }

  private get bounds(): typeof OCEAN_BOUNDS { return this.theme === 'ocean' ? OCEAN_BOUNDS : SPACE_BOUNDS; }

  private applyTexture(sprite: THREE.Sprite, kind: DiveObstacleKind, texture: THREE.Texture, originals: THREE.Object3D[]): void {
    const image = texture.image as { width: number; height: number };
    const bounds = this.bounds[kind];
    const scale = Math.min(bounds.width / image.width, bounds.height / image.height);
    sprite.scale.set(image.width * scale, image.height * scale, 1);
    sprite.material.map = texture;
    sprite.material.opacity = 1;
    sprite.material.needsUpdate = true;
    for (const child of originals) child.visible = false;
    sprite.visible = true;
  }

  dispose(): void {
    this.disposed = true;
    ++this.generation;
    for (const { sprite, blend } of this.instances.values()) { sprite.material.dispose(); blend?.material.dispose(); }
    for (const texture of this.textures.values()) texture.dispose();
    this.duckFrames.forEach(frame => frame.dispose()); this.duckFrames = [];
    this.instances.clear();
    this.textures.clear();
  }
}
