import * as THREE from 'three';
import { SpaceEnvironment } from '../flow-lab/engine/renderers/SpaceEnvironment';
import { ColoredSpeedLines } from '../flow-lab/engine/renderers/ColoredSpeedLines';
import { DecorativeAsteroids } from '../flow-lab/engine/renderers/DecorativeAsteroids';
import type { DivePanoramaUrls } from '@/app/lib/spomove/diveThemes';

/** The existing DIVE sky, panorama shader and forward-motion decorations.
 * Camera orientation stays steady; movement comes from the world passing it.
 */
export class BeatRushDiveScene {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(60, 1, .1, 12000);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly environment: SpaceEnvironment;
  private readonly speedLines: ColoredSpeedLines;
  private readonly asteroids: DecorativeAsteroids;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.scene.background = new THREE.Color('#02040d');
    // Match DIVE's initial eye height, focal length and forward viewing direction.
    this.camera.position.set(0, 160, 600);
    this.camera.lookAt(0, 75, -1500);
    this.scene.add(new THREE.AmbientLight(0xffffff, .65));
    const light = new THREE.PointLight(0xbad7ff, 15, 12000);
    light.position.set(0, 2000, 800);
    this.scene.add(light);
    this.environment = new SpaceEnvironment({ scene: this.scene, qualityTier: 'MED' });
    this.speedLines = new ColoredSpeedLines(this.scene, 'LOW');
    this.asteroids = new DecorativeAsteroids(this.scene, 'LOW');
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  setPanorama(panorama: DivePanoramaUrls) {
    if (this.disposed) return;
    this.environment.setYawDeg(panorama.yawDeg);
    void this.environment.loadPanorama(panorama.highUrl, panorama.lowUrl);
  }

  render(dt: number, reducedMotion: boolean) {
    // Bound decoration updates after a background-tab gap, independently of
    // the exercise clock. This does not alter block timing or session duration.
    const visualDt = Math.min(.05, dt) * (reducedMotion ? .35 : 1);
    if (visualDt > 0) {
      this.environment.update({ dt: visualDt, speed: .45, cameraX: 0, isIntroPhase: false });
      this.speedLines.update(.45, 0, visualDt * 60);
      this.asteroids.update(visualDt * 60, .45);
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    this.speedLines.dispose();
    this.asteroids.dispose();
    this.environment.dispose();
    this.scene.traverse(object => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      const materials = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
      for (const material of materials) material.dispose();
    });
    this.scene.clear();
    this.renderer.dispose();
  }
}
