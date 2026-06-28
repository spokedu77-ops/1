import * as THREE from 'three';

// 가장자리(edge) 선: 화면 가장자리 125개 / 중앙(center) 선: 125개
const EDGE_COUNT   = 125;
const CENTER_COUNT = 125;
// 가장자리 기준: |x| >= EDGE_X_MIN
const EDGE_X_MIN = 3000;
// 속도 상수 (FlowEngine 원본 동일)
const BASE_SPEED_FLOW = 0.6;
const MOVE_BASE       = 260;

export class SpeedVFX {
  private scene:      THREE.Scene;
  private edgeMesh:   THREE.InstancedMesh;
  private centerMesh: THREE.InstancedMesh;
  private edgeMat:    THREE.MeshBasicMaterial;
  private centerMat:  THREE.MeshBasicMaterial;

  // 인스턴스별 위치 캐시 (매 프레임 getMatrixAt 불필요)
  private edgeX:   Float32Array;
  private edgeY:   Float32Array;
  private edgeZ:   Float32Array;
  private centerX: Float32Array;
  private centerY: Float32Array;
  private centerZ: Float32Array;

  private dummy     = new THREE.Object3D();
  private prevSpeed = 0;
  private pulseOp   = 0; // 가속 펄스 (급가속 시 일시 증가)

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.edgeMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa, transparent: true, opacity: 0, depthWrite: false,
    });
    this.centerMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa, transparent: true, opacity: 0, depthWrite: false,
    });

    const edgeGeo   = new THREE.BoxGeometry(1.2, 1.2, 800);
    const centerGeo = new THREE.BoxGeometry(1.2, 1.2, 800);
    this.edgeMesh   = new THREE.InstancedMesh(edgeGeo, this.edgeMat, EDGE_COUNT);
    this.centerMesh = new THREE.InstancedMesh(centerGeo, this.centerMat, CENTER_COUNT);
    this.edgeMesh.frustumCulled   = false;
    this.centerMesh.frustumCulled = false;

    this.edgeX = new Float32Array(EDGE_COUNT);
    this.edgeY = new Float32Array(EDGE_COUNT);
    this.edgeZ = new Float32Array(EDGE_COUNT);
    this.centerX = new Float32Array(CENTER_COUNT);
    this.centerY = new Float32Array(CENTER_COUNT);
    this.centerZ = new Float32Array(CENTER_COUNT);

    // 가장자리 인스턴스: 좌우 대칭, |x| >= EDGE_X_MIN
    for (let i = 0; i < EDGE_COUNT; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      this.edgeX[i] = side * (EDGE_X_MIN + Math.random() * 3000);
      this.edgeY[i] = (Math.random() - 0.5) * 12000;
      this.edgeZ[i] = (Math.random() - 1) * 15000;
      this.setEdgeMatrix(i);
    }
    this.edgeMesh.instanceMatrix.needsUpdate = true;

    // 중앙 인스턴스: |x| < EDGE_X_MIN
    for (let i = 0; i < CENTER_COUNT; i++) {
      this.centerX[i] = (Math.random() - 0.5) * EDGE_X_MIN * 2;
      this.centerY[i] = (Math.random() - 0.5) * 12000;
      this.centerZ[i] = (Math.random() - 1) * 15000;
      this.setCenterMatrix(i);
    }
    this.centerMesh.instanceMatrix.needsUpdate = true;

    scene.add(this.edgeMesh, this.centerMesh);
  }

  private setEdgeMatrix(i: number): void {
    this.dummy.position.set(this.edgeX[i]!, this.edgeY[i]!, this.edgeZ[i]!);
    this.dummy.updateMatrix();
    this.edgeMesh.setMatrixAt(i, this.dummy.matrix);
  }

  private setCenterMatrix(i: number): void {
    this.dummy.position.set(this.centerX[i]!, this.centerY[i]!, this.centerZ[i]!);
    this.dummy.updateMatrix();
    this.centerMesh.setMatrixAt(i, this.dummy.matrix);
  }

  update(speed: number, dt60M: number): void {
    const maxSpeed   = BASE_SPEED_FLOW * 1.25;
    const speedRatio = Math.min(1, Math.max(0, (speed - 0.05) / maxSpeed));
    const baseTarget = speedRatio * 0.65;

    // 급가속 펄스 (이전 프레임 대비 속도 증가 시 일시 boost)
    const accel = Math.max(0, speed - this.prevSpeed);
    if (accel > 0.005) this.pulseOp = Math.min(0.25, this.pulseOp + accel * 15);
    this.pulseOp = Math.max(0, this.pulseOp - 0.025 * dt60M); // 감쇠
    this.prevSpeed = speed;

    const targetOp    = Math.min(0.65, baseTarget + this.pulseOp);
    // 중앙 선: BASE_SPEED 이상일 때만 등장
    const centerTarget = speed > BASE_SPEED_FLOW * 0.95 ? targetOp : 0;
    const moveSpeed   = (MOVE_BASE + speed * 250) * dt60M;

    for (let i = 0; i < EDGE_COUNT; i++) {
      this.edgeZ[i]! += moveSpeed;
      if (this.edgeZ[i]! > 2500) this.edgeZ[i] = -12000;
      this.setEdgeMatrix(i);
    }
    this.edgeMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < CENTER_COUNT; i++) {
      this.centerZ[i]! += moveSpeed;
      if (this.centerZ[i]! > 2500) this.centerZ[i] = -12000;
      this.setCenterMatrix(i);
    }
    this.centerMesh.instanceMatrix.needsUpdate = true;

    this.edgeMat.opacity   = Math.max(0, this.edgeMat.opacity   + (targetOp     - this.edgeMat.opacity)   * 0.15 * dt60M);
    this.centerMat.opacity = Math.max(0, this.centerMat.opacity + (centerTarget - this.centerMat.opacity) * 0.15 * dt60M);
  }

  dispose(): void {
    this.scene.remove(this.edgeMesh, this.centerMesh);
    this.edgeMesh.geometry.dispose();
    this.centerMesh.geometry.dispose();
    this.edgeMat.dispose();
    this.centerMat.dispose();
  }

  /** 테스트용 getter */
  getEdgeOpacity():   number { return this.edgeMat.opacity; }
  getCenterOpacity(): number { return this.centerMat.opacity; }
}
