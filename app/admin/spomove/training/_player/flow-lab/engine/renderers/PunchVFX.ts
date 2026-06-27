import * as THREE from 'three';

const PARTICLE_COUNT  = 40;
const EFFECT_DURATION = 0.14; // 140ms

export class PunchVFX {
  private scene: THREE.Scene;

  // 파티클 풀 — 생성자에서 한 번만 생성, trigger마다 재사용
  private particles:   THREE.Points;
  private particleMat: THREE.PointsMaterial;

  // 링 충격파
  private ring:    THREE.Mesh;
  private ringMat: THREE.MeshBasicMaterial;

  // 플래시 평면 (80ms 안에 소멸)
  private flash:    THREE.Mesh;
  private flashMat: THREE.MeshBasicMaterial;

  private active  = false;
  private elapsed = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 파티클: 구면 랜덤 방향 * 반경 — scale로 확장하므로 geometry는 불변
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 35 + Math.random() * 25;
      pos[i * 3]     = Math.sin(phi) * Math.cos(theta) * r;
      pos[i * 3 + 1] = Math.cos(phi) * r;
      pos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.particleMat = new THREE.PointsMaterial({
      color: 0xfbbf24, size: 14, transparent: true, opacity: 0, depthWrite: false,
    });
    this.particles = new THREE.Points(pGeo, this.particleMat);
    this.particles.visible = false;
    scene.add(this.particles);

    // 링: XZ 평면에 놓고 카메라 방향으로 회전
    const ringGeo = new THREE.TorusGeometry(28, 3.5, 8, 24);
    ringGeo.rotateX(Math.PI / 2);
    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24, transparent: true, opacity: 0, depthWrite: false,
    });
    this.ring = new THREE.Mesh(ringGeo, this.ringMat);
    this.ring.visible = false;
    scene.add(this.ring);

    // 플래시 평면
    const flashGeo = new THREE.PlaneGeometry(110, 110);
    this.flashMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
    });
    this.flash = new THREE.Mesh(flashGeo, this.flashMat);
    this.flash.visible = false;
    scene.add(this.flash);
  }

  trigger(x: number, y: number, z: number, laneColor = 0xfbbf24): void {
    // 장애물 레인 색상에 맞춰 파티클·링·플래시 색상 변경
    this.particleMat.color.setHex(laneColor);
    this.ringMat.color.setHex(laneColor);
    this.flashMat.color.setHex(laneColor);

    this.active  = true;
    this.elapsed = 0;

    this.particles.position.set(x, y, z);
    this.particles.scale.setScalar(0.4);
    this.particles.visible = true;

    this.ring.position.set(x, y, z);
    this.ring.scale.set(1, 1, 1);
    this.ring.visible = true;

    this.flash.position.set(x, y, z + 30);
    this.flash.visible = true;
  }

  update(dt: number): void {
    if (!this.active) return;
    this.elapsed += dt;
    const t = Math.min(1, this.elapsed / EFFECT_DURATION);

    // 파티클: 바깥으로 확장하며 소멸
    this.particles.scale.setScalar(0.4 + t * 3.6);
    this.particleMat.opacity = Math.max(0, 1 - t * 1.4);

    // 링: 확장하며 소멸
    const rs = 1 + t * 5;
    this.ring.scale.set(rs, rs, 1);
    this.ringMat.opacity = Math.max(0, 1 - t);

    // 플래시: 빠르게 소멸 (~80ms)
    this.flashMat.opacity = Math.max(0, 0.85 - t * 6);

    if (t >= 1) {
      this.active = false;
      this.particles.visible  = false;
      this.ring.visible       = false;
      this.flash.visible      = false;
      this.particleMat.opacity = 0;
      this.ringMat.opacity     = 0;
      this.flashMat.opacity    = 0;
    }
  }

  dispose(): void {
    this.scene.remove(this.particles, this.ring, this.flash);
    this.particles.geometry.dispose();
    this.ring.geometry.dispose();
    this.flash.geometry.dispose();
    this.particleMat.dispose();
    this.ringMat.dispose();
    this.flashMat.dispose();
  }

  /** 테스트용 getter */
  isActive(): boolean { return this.active; }
  getParticleCount(): number { return PARTICLE_COUNT; }
}
