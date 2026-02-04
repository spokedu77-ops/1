/**
 * Flow Engine (Spatial Distortion Engine)
 * Flow Phase의 완전한 Three.js 게임 로직을 엔진으로 추상화
 * 브릿지, 점프, 레벨 진행, 박스 파괴 등 전체 게임 로직 포함
 */

import * as THREE from 'three';

export interface FlowConfig {
  baseSpeed: number;           // 기본 속도 (0.6 기본값)
  distortion: number;           // 공간 왜곡률 (0-1)
  boxRate: {
    lv3: number;                // LV3 박스 등장률 (0.40)
    lv4: number;                // LV4 박스 등장률 (0.45)
  };
  durations?: number[];          // 레벨별 지속 시간 [30, 30, 15, 40, 40, 10]
  displayLevels?: number[];       // 표시 레벨 [1, 2, 0, 3, 4, -1]
}

interface Bridge {
  mesh: THREE.Group;
  lane: number;
  bridgeId: number;
  x: number;
  padDepth: number;
  hasBox: boolean;
}

interface Box {
  mesh: THREE.Group;
  reward: boolean;
}

interface Shard {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotation: THREE.Vector3;
  lifetime: number;
}

interface SpaceObject {
  mesh: THREE.Object3D;
  speed: number;
  rotationSpeed: number;
}

export class SpatialDistortionEngine {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private config!: FlowConfig;
  private boxes: Box[] = [];
  private bridges: Bridge[] = [];
  private shards: Shard[] = [];
  private spaceObjects: SpaceObject[] = [];
  private stars: THREE.Points | null = null;
  private speedLines: THREE.Group | null = null;
  private rafId: number | null = null;
  private isRunning: boolean = false;
  private canvasElement!: HTMLCanvasElement;
  
  // 게임 상태
  private gameState: 'waiting' | 'playing' | 'finished' = 'waiting';
  private isResting: boolean = false;
  private movementActive: boolean = false;
  private gameTime: number = 0;
  private levelTime: number = 0;
  private currentLevelIndex: number = 0;
  
  // 레벨 설정
  private durations: number[] = [30, 30, 15, 40, 40, 10];
  private displayLevels: number[] = [1, 2, 0, 3, 4, -1];
  
  // 플레이어 상태
  private visualX: number = 0;
  private targetX: number = 0;
  private playerJumpY: number = 0;
  private groundY: number = 30;
  private isJumping: boolean = false;
  private isOnBridge: boolean = false;
  private isOnPad: boolean = false;
  private activeBridge: Bridge | null = null;
  private playerZ: number = 400;
  private jumpProgress: number = 0;
  private isChangingLane: boolean = false;
  
  // 카메라 상태
  private cameraTiltZ: number = 0;
  private landingShake: number = 0;
  private landingImpactY: number = 0;
  private landingImpactZ: number = 0;
  private impactYTimer: number = 0;
  private impactZTimer: number = 0;
  private landingStabilityTimer: number = 0;
  private currentFov: number = 60;
  private targetFov: number = 60;
  
  // 브릿지 상수
  private bridgeLength: number = 2900;
  private bridgeGap: number = 450;
  private laneWidth: number = 80;
  private bridgeIdCounter: number = 0;
  
  // 박스/보상 시스템
  private goldBudget: number = 0;
  private goldSpawned: number = 0;
  private lv3FirstRewardGiven: boolean = false;
  
  constructor(canvas: HTMLCanvasElement, config: FlowConfig) {
    this.config = {
      ...config,
      durations: config.durations || [30, 30, 15, 40, 40, 10],
      displayLevels: config.displayLevels || [1, 2, 0, 3, 4, -1],
    };
    this.canvasElement = canvas;
    this.durations = this.config.durations!;
    this.displayLevels = this.config.displayLevels!;
    this.init3D(canvas);
  }
  
  /**
   * 현재 레벨 번호 반환
   */
  private getCurrentLevelNum(): number {
    return this.displayLevels[this.currentLevelIndex];
  }
  
  /**
   * 렌더러의 Canvas 요소 반환 (ref 업데이트용)
   */
  getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }
  
  /**
   * 3D 초기화
   */
  private init3D(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.Fog(0x000000, 500, 3800);
    
    this.camera = new THREE.PerspectiveCamera(60, canvas.width / canvas.height, 0.1, 30000);
    this.camera.position.set(0, 2000, 1000);
    
    try {
      // 기존 Canvas에 컨텍스트가 있는지 확인 (WebGL 또는 2D)
      const existingWebGLContext = canvas.getContext('webgl') || canvas.getContext('webgl2');
      const existing2DContext = canvas.getContext('2d');
      
      // WebGL 컨텍스트가 이미 있으면 재사용, 2D 컨텍스트가 있으면 Canvas 교체 필요
      if (existingWebGLContext) {
        // WebGL 컨텍스트가 이미 있으면 Canvas를 전달하지 않고 새로 생성된 Canvas 사용
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        // 기존 Canvas를 새 Canvas로 교체
        const parent = canvas.parentNode;
        const className = canvas.className;
        const width = canvas.width;
        const height = canvas.height;
        
        if (parent) {
          parent.removeChild(canvas);
          this.renderer.domElement.className = className;
          this.renderer.domElement.width = width;
          this.renderer.domElement.height = height;
          parent.appendChild(this.renderer.domElement);
        }
      } else if (existing2DContext) {
        // 2D 컨텍스트가 있으면 Canvas를 교체해야 함 (Canvas는 한 번 컨텍스트를 생성하면 다른 타입을 생성할 수 없음)
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        const parent = canvas.parentNode;
        const className = canvas.className;
        const width = canvas.width;
        const height = canvas.height;
        
        if (parent) {
          parent.removeChild(canvas);
          this.renderer.domElement.className = className;
          this.renderer.domElement.width = width;
          this.renderer.domElement.height = height;
          parent.appendChild(this.renderer.domElement);
        }
      } else {
        // 기존 컨텍스트가 없으면 기존 Canvas 사용
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      }
    } catch (error: any) {
      throw error;
    }
    
    this.renderer.setSize(canvas.width || this.renderer.domElement.width, canvas.height || this.renderer.domElement.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    
    // 조명 설정
    const amb = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(amb);
    
    const spot = new THREE.PointLight(0x3b82f6, 15, 10000);
    spot.position.set(0, 2000, 1000);
    this.scene.add(spot);
    
    this.createSpaceBackground();
    this.createSpeedLines();
    this.createTrackLanes();
    this.createSpacePlanets();
  }
  
  /**
   * 우주 배경 생성
   */
  private createSpaceBackground() {
    const starGeo = new THREE.BufferGeometry();
    const starCount = 45000;
    const starPos = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 25000;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 25000;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 25000;
    }
    
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, transparent: true, opacity: 0.8 })
    );
    this.scene.add(this.stars);
  }
  
  /**
   * 속도 라인 생성
   */
  private createSpeedLines() {
    this.speedLines = new THREE.Group();
    for (let i = 0; i < 250; i++) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.2, 800),
        new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0 })
      );
      line.position.set(
        (Math.random() - 0.5) * 12000,
        (Math.random() - 0.5) * 12000,
        (Math.random() - 1) * 15000
      );
      this.speedLines.add(line);
    }
    this.scene.add(this.speedLines);
  }
  
  /**
   * 트랙 레인 생성
   */
  private createTrackLanes() {
    for (let i = -1; i <= 1; i++) {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(this.laneWidth, 60000),
        new THREE.MeshPhongMaterial({ color: 0x050818, transparent: true, opacity: 0.9 })
      );
      strip.rotation.x = -Math.PI / 2;
      strip.position.set(i * this.laneWidth, -30, -20000);
      this.scene.add(strip);
    }
    
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.4 });
    [-this.laneWidth * 1.5, -this.laneWidth * 0.5, this.laneWidth * 0.5, this.laneWidth * 1.5].forEach(x => {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(3, 60000), lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, -29, -20000);
      this.scene.add(line);
    });
  }
  
  /**
   * 우주 행성 생성
   */
  private createSpacePlanets() {
    const earthGeo = new THREE.SphereGeometry(1200, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({ color: 0x2233ff, emissive: 0x112244, shininess: 25 });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earth.position.set(3500, 1500, -12000);
    this.scene.add(earth);
    this.spaceObjects.push({ mesh: earth, speed: 0.15, rotationSpeed: 0.001 });
    
    const bhGroup = new THREE.Group();
    const bhCore = new THREE.Mesh(
      new THREE.SphereGeometry(300, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    const diskGeo = new THREE.TorusGeometry(550, 150, 2, 128);
    const diskMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    const disk = new THREE.Mesh(diskGeo, diskMat);
    disk.rotation.x = Math.PI / 2;
    bhGroup.add(bhCore);
    bhGroup.add(disk);
    bhGroup.position.set(1500, 3000, -25000);
    this.scene.add(bhGroup);
    this.spaceObjects.push({ mesh: bhGroup, speed: 0.08, rotationSpeed: 0.008 });
  }
  
  /**
   * 브릿지 생성
   */
  private spawnBridge(isFirst: boolean = false, levelNumForSpawn: number = 1) {
    let spawnZ = -8000;
    const padDepth = 200;
    
    if (isFirst) {
      spawnZ = this.playerZ;
    } else if (this.bridges.length > 0) {
      const lastBridge = this.bridges[this.bridges.length - 1];
      spawnZ = lastBridge.mesh.position.z - (this.bridgeLength + padDepth) - this.bridgeGap;
    }
    
    const group = new THREE.Group();
    const laneColors = [0xe53935, 0x43a047, 0xfdd835];
    const randLane = isFirst ? 1 : Math.floor(Math.random() * 3);
    const bridgeColor = laneColors[randLane];
    
    // 상판
    const topGeo = new THREE.BoxGeometry(this.laneWidth - 5, 8, this.bridgeLength);
    const topMat = new THREE.MeshBasicMaterial({ color: bridgeColor, fog: false });
    const topPlate = new THREE.Mesh(topGeo, topMat);
    topPlate.position.y = 40;
    group.add(topPlate);
    
    // 발판
    const padGeo = new THREE.BoxGeometry(this.laneWidth - 10, 6, padDepth);
    const padMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
    const exitPad = new THREE.Mesh(padGeo, padMat);
    exitPad.position.set(0, 44, -(this.bridgeLength / 2 + padDepth / 2));
    group.add(exitPad);
    
    // 측면 빔
    const sideGeo = new THREE.BoxGeometry(6, 25, this.bridgeLength + padDepth);
    const sideMat = new THREE.MeshPhongMaterial({ color: 0x222222, emissive: 0x111111 });
    
    const leftBeam = new THREE.Mesh(sideGeo, sideMat);
    leftBeam.position.set(-(this.laneWidth / 2 - 4), 30, -padDepth / 2);
    group.add(leftBeam);
    
    const rightBeam = new THREE.Mesh(sideGeo, sideMat);
    rightBeam.position.set((this.laneWidth / 2 - 4), 30, -padDepth / 2);
    group.add(rightBeam);
    
    // 교차 빔
    const crossGeo = new THREE.BoxGeometry(this.laneWidth - 10, 6, 40);
    for (let j = -1; j <= 1; j++) {
      const crossMesh = new THREE.Mesh(crossGeo, sideMat);
      crossMesh.position.set(0, 20, j * (this.bridgeLength / 3));
      group.add(crossMesh);
    }
    
    group.position.set((randLane - 1) * this.laneWidth, 0, spawnZ);
    this.scene.add(group);
    
    const bridgeObj: Bridge = {
      mesh: group,
      lane: randLane,
      bridgeId: this.bridgeIdCounter++,
      x: (randLane - 1) * this.laneWidth,
      padDepth: padDepth,
      hasBox: false
    };
    this.bridges.push(bridgeObj);
    
    // 박스 스폰 (레벨 3 이상)
    if (levelNumForSpawn >= 3 && this.shouldSpawnBox(levelNumForSpawn)) {
      this.attachBoxToBridge(bridgeObj, levelNumForSpawn);
    }
  }
  
  /**
   * 박스 생성
   */
  private createBoxGroup(reward: boolean = false): THREE.Group {
    const boxGroup = new THREE.Group();
    
    const bodyGeo = new THREE.BoxGeometry(65, 45, 55);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x5d4037, emissive: 0x221100, shininess: 5 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 22.5;
    boxGroup.add(body);
    
    const lidGeo = new THREE.BoxGeometry(68, 18, 58);
    const lidMat = new THREE.MeshPhongMaterial({ color: 0x4e342e, emissive: 0x1a0a00, shininess: 8 });
    const lid = new THREE.Mesh(lidGeo, lidMat);
    lid.position.y = 50;
    boxGroup.add(lid);
    
    const bandGeo = new THREE.BoxGeometry(18, 70, 60);
    const bandMat = new THREE.MeshPhongMaterial({ color: 0x3e2723, emissive: 0x000000, shininess: 20 });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.y = 35;
    boxGroup.add(band);
    
    const glowGeo = new THREE.SphereGeometry(75, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: reward ? 0xffd700 : 0xef4444,
      transparent: true,
      opacity: 0.09
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 35;
    boxGroup.add(glow);
    
    return boxGroup;
  }
  
  /**
   * 브릿지에 박스 부착
   */
  private attachBoxToBridge(bridgeObj: Bridge, levelNum: number) {
    if (bridgeObj.hasBox) return;
    bridgeObj.hasBox = true;
    
    let reward = false;
    if (levelNum === 3) {
      reward = this.decideRewardForLv3();
    } else if (levelNum === 4) {
      reward = Math.random() < 0.30;
    }
    
    const boxGroup = this.createBoxGroup(reward);
    const localZ = -(this.bridgeLength * 0.10);
    boxGroup.position.set(0, 40, localZ);
    
    bridgeObj.mesh.add(boxGroup);
    this.boxes.push({ mesh: boxGroup, reward });
  }
  
  /**
   * LV3 보상 결정
   */
  private decideRewardForLv3(): boolean {
    if (!this.lv3FirstRewardGiven) {
      this.lv3FirstRewardGiven = true;
      this.goldSpawned++;
      return true;
    }
    if (this.goldSpawned < this.goldBudget) {
      if (Math.random() < 0.55) {
        this.goldSpawned++;
        return true;
      }
    }
    return false;
  }
  
  /**
   * baseSpeed 실시간 업데이트
   */
  updateSpeed(baseSpeed: number) {
    this.config.baseSpeed = baseSpeed;
    // 게임 로직에 즉시 반영
  }
  
  /**
   * 공간 왜곡 실시간 적용
   */
  updateDistortion(distortion: number) {
    this.config.distortion = distortion;
    
    // 카메라 FOV 조정
    const baseFov = 60;
    const targetFov = baseFov + (distortion * 10); // 60-70 범위
    this.camera.fov = targetFov;
    this.camera.updateProjectionMatrix();
  }
  
  /**
   * 박스 등장률 실시간 업데이트
   */
  updateBoxRate(lv3: number, lv4: number) {
    this.config.boxRate.lv3 = lv3;
    this.config.boxRate.lv4 = lv4;
  }
  
  /**
   * 파라미터 일괄 업데이트 (싱글턴 패턴용)
   * 엔진 재시작 없이 실시간 수정
   */
  updateParams(params: Partial<FlowConfig>) {
    if (params.baseSpeed !== undefined) {
      this.updateSpeed(params.baseSpeed);
    }
    if (params.distortion !== undefined) {
      this.updateDistortion(params.distortion);
    }
    if (params.boxRate !== undefined) {
      this.updateBoxRate(params.boxRate.lv3, params.boxRate.lv4);
    }
  }
  
  /**
   * JSON 설정값 주입
   */
  loadFromJSON(json: FlowConfig) {
    this.config = json;
    this.updateSpeed(json.baseSpeed);
    this.updateDistortion(json.distortion);
    this.updateBoxRate(json.boxRate.lv3, json.boxRate.lv4);
  }
  
  /**
   * 박스 스폰 결정 (실시간 boxRate 적용)
   */
  shouldSpawnBox(levelNum: number): boolean {
    if (levelNum === 3) return Math.random() < this.config.boxRate.lv3;
    if (levelNum === 4) return Math.random() < this.config.boxRate.lv4;
    return false;
  }
  
  /**
   * 렌더링 루프
   */
  private animate = () => {
    if (!this.isRunning) return;
    
    this.rafId = requestAnimationFrame(this.animate);
    
    if (this.gameState !== 'playing') {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    
    const currentLevelNum = this.getCurrentLevelNum();
    
    // 게임 시간 업데이트
    if (this.movementActive) {
      this.gameTime += 1 / 60;
      this.levelTime += 1 / 60;
      
      // 타이머 업데이트
      if (this.landingStabilityTimer > 0) {
        this.landingStabilityTimer -= 1 / 60;
      }
      
      if (this.impactYTimer > 0) {
        this.impactYTimer = Math.max(0, this.impactYTimer - 1 / 60);
        const t = (0.05 - this.impactYTimer) / 0.05;
        this.landingImpactY = -2.4 * (1 - Math.pow(1 - t, 2));
      } else {
        this.landingImpactY = 0;
      }
      
      if (this.impactZTimer > 0) {
        this.impactZTimer = Math.max(0, this.impactZTimer - 1 / 60);
        this.landingImpactZ = -7.5 * (this.impactZTimer / 0.04);
      } else {
        this.landingImpactZ = 0;
      }
    }
    
    // 레벨 전환 체크
    const currentDuration = this.durations[this.currentLevelIndex];
    if (this.movementActive && this.levelTime > currentDuration) {
      if (this.displayLevels[this.currentLevelIndex + 1] === 0) {
        this.currentLevelIndex++;
        this.levelTime = 0;
        this.triggerRest();
      } else if (this.displayLevels[this.currentLevelIndex + 1] === -1) {
        this.currentLevelIndex++;
        this.triggerEnding();
      } else if (this.currentLevelIndex < this.durations.length - 1) {
        this.currentLevelIndex++;
        this.levelTime = 0;
      }
    }
    
    // 브릿지 스폰
    if (this.bridges.length < 3) {
      this.spawnBridge(this.bridges.length === 0, currentLevelNum);
    }
    
    // 브릿지 이동
    const levelSpeedFactor = currentLevelNum === 1 ? 0.8 : 
                             currentLevelNum === 2 ? 1.0 : 
                             currentLevelNum === 4 ? 1.25 : 1.0;
    const currentSpeed = this.movementActive 
      ? (this.config.baseSpeed * levelSpeedFactor) + (this.gameTime * 0.0001)
      : 0;
    
    for (let i = this.bridges.length - 1; i >= 0; i--) {
      this.bridges[i].mesh.position.z += currentSpeed * 50.0;
      if (this.bridges[i].mesh.position.z > 6000) {
        if (this.activeBridge === this.bridges[i]) {
          this.activeBridge = null;
        }
        this.scene.remove(this.bridges[i].mesh);
        this.bridges.splice(i, 1);
      }
    }
    
    // 활성 브릿지 판정
    this.updateActiveBridge();
    
    // 박스 업데이트
    this.updateBoxes();
    
    // 파편 업데이트
    this.updateShards();
    
    // 우주 객체 업데이트
    this.updateSpaceObjects();
    
    // 카메라 업데이트
    this.updateCamera();
    
    this.renderer.render(this.scene, this.camera);
  };
  
  /**
   * 활성 브릿지 업데이트
   */
  private updateActiveBridge() {
    let foundActive = false;
    this.isOnPad = false;
    
    if (this.activeBridge) {
      const padDepth = this.activeBridge.padDepth || 200;
      const frontZ = this.activeBridge.mesh.position.z + (this.bridgeLength / 2);
      const backZWithPad = this.activeBridge.mesh.position.z - (this.bridgeLength / 2) - padDepth;
      
      if (frontZ > this.playerZ && backZWithPad < this.playerZ) {
        foundActive = true;
        const relZ = this.playerZ - this.activeBridge.mesh.position.z;
        const padStartZ = -(this.bridgeLength / 2) - padDepth;
        const padEndZ = -(this.bridgeLength / 2);
        
        if (relZ >= padStartZ && relZ <= padEndZ) {
          this.isOnPad = true;
        }
        this.isOnBridge = true;
      }
    }
    
    if (!foundActive) {
      for (const bridge of this.bridges) {
        const frontZ = bridge.mesh.position.z + (this.bridgeLength / 2);
        const backZ = bridge.mesh.position.z - (this.bridgeLength / 2);
        
        if (frontZ > this.playerZ && backZ < this.playerZ) {
          this.activeBridge = bridge;
          foundActive = true;
          this.isOnBridge = true;
          break;
        }
      }
    }
    
    if (!foundActive) {
      this.isOnBridge = false;
      this.activeBridge = null;
    }
  }
  
  /**
   * 박스 업데이트
   */
  private updateBoxes() {
    const worldPos = new THREE.Vector3();
    for (let i = this.boxes.length - 1; i >= 0; i--) {
      const box = this.boxes[i];
      if (!box.mesh) {
        this.boxes.splice(i, 1);
        continue;
      }
      
      box.mesh.rotation.y += 0.015;
      box.mesh.getWorldPosition(worldPos);
      
      if (worldPos.z >= 380) {
        this.destroyBox(box, i);
      } else if (worldPos.z > 2000) {
        if (box.mesh.parent) {
          box.mesh.parent.remove(box.mesh);
        }
        this.boxes.splice(i, 1);
      }
    }
  }
  
  /**
   * 박스 파괴
   */
  private destroyBox(box: Box, index: number) {
    const pos = new THREE.Vector3();
    box.mesh.getWorldPosition(pos);
    
    this.cameraTiltZ = (Math.random() > 0.5 ? 1 : -1) * 0.2;
    
    // 파편 생성
    const shardCount = 18 + Math.floor(Math.random() * 15);
    for (let i = 0; i < shardCount; i++) {
      const sSize = 12 + Math.random() * 18;
      const sGeo = new THREE.BoxGeometry(sSize, sSize * 0.5, sSize * 0.3);
      const sMat = new THREE.MeshPhongMaterial({
        color: 0x5d4037,
        emissive: 0x2a1500,
        transparent: true,
        shininess: 10
      });
      const sMesh = new THREE.Mesh(sGeo, sMat);
      
      const angle = Math.random() * Math.PI * 2;
      const force = 18 + Math.random() * 22;
      const vel = new THREE.Vector3(
        Math.cos(angle) * force,
        (Math.random() * 20) + 12,
        Math.sin(angle) * force
      );
      
      sMesh.position.copy(pos);
      this.scene.add(sMesh);
      
      this.shards.push({
        mesh: sMesh,
        velocity: vel,
        rotation: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        ),
        lifetime: 2000 + Math.random() * 1000
      });
    }
    
    if (box.mesh.parent) {
      box.mesh.parent.remove(box.mesh);
    }
    this.boxes.splice(index, 1);
  }
  
  /**
   * 파편 업데이트
   */
  private updateShards() {
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const shard = this.shards[i];
      shard.mesh.position.add(shard.velocity);
      shard.velocity.y -= 0.8; // 중력
      shard.mesh.rotation.x += shard.rotation.x;
      shard.mesh.rotation.y += shard.rotation.y;
      shard.mesh.rotation.z += shard.rotation.z;
      
      shard.lifetime -= 16;
      if (shard.lifetime <= 0 || shard.mesh.position.y < -100) {
        this.scene.remove(shard.mesh);
        this.shards.splice(i, 1);
      }
    }
  }
  
  /**
   * 우주 객체 업데이트
   */
  private updateSpaceObjects() {
    for (const obj of this.spaceObjects) {
      obj.mesh.rotation.y += obj.rotationSpeed;
      obj.mesh.position.z += obj.speed;
    }
  }
  
  /**
   * 카메라 업데이트
   */
  private updateCamera() {
    if (!this.camera) return;
    
    if (this.isJumping) {
      this.visualX += (this.targetX - this.visualX) * 0.1;
    } else {
      const laneX = this.activeBridge ? this.activeBridge.x : this.visualX;
      this.visualX = laneX;
    }
    
    let yOffset = 0;
    let zOffset = 0;
    const currentLevelNum = this.getCurrentLevelNum();
    const isRestrictingMotion = this.isJumping || this.isOnPad || this.landingStabilityTimer > 0;
    
    if (this.movementActive && !isRestrictingMotion && this.isOnBridge) {
      const freq = 15.7 + (currentLevelNum >= 2 ? currentLevelNum * 5.5 : 0);
      const amp = 0.55 + (currentLevelNum >= 2 ? (currentLevelNum - 1) * 0.12 : 0);
      yOffset = Math.sin(this.gameTime * freq) * amp;
    }
    
    if (this.isJumping) {
      if (this.jumpProgress < 0.1) {
        zOffset = (this.jumpProgress / 0.1) * -15;
      } else if (this.jumpProgress < 0.2) {
        zOffset = (1.0 - (this.jumpProgress - 0.1) / 0.1) * -15;
      }
    }
    
    const baseCamH = 130;
    const targetCamY = baseCamH + this.groundY + this.playerJumpY + yOffset + this.landingImpactY;
    this.camera.position.y += (targetCamY - this.camera.position.y) * 0.15;
    this.camera.position.z = 600 + zOffset + this.landingImpactZ;
    this.camera.position.x = this.visualX;
    
    // FOV 업데이트
    if (currentLevelNum === 1) {
      this.targetFov = 58;
    } else if (currentLevelNum === 2) {
      this.targetFov = 63;
    } else if (currentLevelNum === 3) {
      this.targetFov = 63;
    } else if (currentLevelNum === 4) {
      this.targetFov = 66;
    } else {
      this.targetFov = 60;
    }
    
    if (Math.abs(this.currentFov - this.targetFov) > 0.02) {
      this.currentFov += (this.targetFov - this.currentFov) * 0.06;
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }
    
    // 틸트 업데이트
    let targetTilt = 0;
    if (!this.isOnPad && this.isChangingLane && this.isJumping) {
      if (this.jumpProgress < 0.15) {
        targetTilt = (this.targetX > this.visualX) ? -0.05 : 0.05;
      } else {
        targetTilt = 0;
      }
    }
    
    if (this.landingShake !== 0) {
      targetTilt += this.landingShake;
      this.landingShake *= 0.85;
      if (Math.abs(this.landingShake) < 0.001) {
        this.landingShake = 0;
      }
    }
    
    this.cameraTiltZ += (targetTilt - this.cameraTiltZ) * 0.1;
    this.camera.rotation.z = this.cameraTiltZ;
    this.camera.lookAt(this.visualX, this.groundY + 45, -1500);
  }
  
  /**
   * 점프 트리거
   */
  triggerJump() {
    if (this.isJumping) return;
    
    this.isJumping = true;
    this.jumpProgress = 0;
    
    const currentLevelNum = this.getCurrentLevelNum();
    const jumpDuration = currentLevelNum === 1 ? 0.72 : 
                         currentLevelNum === 2 ? 0.70 : 
                         currentLevelNum === 3 ? 0.64 : 0.62;
    const jumpHeight = 98;
    
    const jumpInterval = setInterval(() => {
      this.jumpProgress += 1 / 60 / jumpDuration;
      
      let jumpCurve = 0;
      if (this.jumpProgress < 0.6) {
        const t = this.jumpProgress / 0.6;
        jumpCurve = 1 - Math.pow(1 - t, 2);
      } else {
        const t = (this.jumpProgress - 0.6) / 0.4;
        jumpCurve = 1 - Math.pow(t, 3);
      }
      this.playerJumpY = Math.max(0, jumpCurve * jumpHeight);
      
      if (this.jumpProgress >= 1) {
        this.playerJumpY = 0;
        this.isJumping = false;
        this.landingStabilityTimer = 0.12;
        this.impactYTimer = 0.05;
        this.impactZTimer = 0.04;
        this.isChangingLane = false;
        clearInterval(jumpInterval);
      }
    }, 16);
  }
  
  /**
   * 레인 변경
   */
  changeLane(direction: 'left' | 'right') {
    if (this.isJumping || !this.activeBridge) return;
    
    const currentLane = this.activeBridge.lane;
    const newLane = direction === 'left' 
      ? Math.max(0, currentLane - 1)
      : Math.min(2, currentLane + 1);
    
    if (newLane !== currentLane) {
      this.targetX = (newLane - 1) * this.laneWidth;
      this.isChangingLane = true;
      this.triggerJump();
    }
  }
  
  /**
   * 휴식 트리거
   */
  private triggerRest() {
    this.isResting = true;
    this.movementActive = false;
    
    setTimeout(() => {
      this.currentLevelIndex++;
      const nextLevel = this.getCurrentLevelNum();
      
      if (nextLevel === 3) {
        this.goldBudget = 3 + Math.floor(Math.random() * 2);
        this.goldSpawned = 0;
        this.lv3FirstRewardGiven = false;
      }
      
      setTimeout(() => {
        this.isResting = false;
        this.movementActive = true;
        this.levelTime = 0;
      }, 2000);
    }, 15000);
  }
  
  /**
   * 엔딩 트리거
   */
  private triggerEnding() {
    this.gameState = 'finished';
    this.isResting = true;
    this.movementActive = false;
  }
  
  /**
   * 엔진 시작
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.gameState = 'playing';
    this.movementActive = false;
    this.isResting = true;
    this.gameTime = 0;
    this.levelTime = 0;
    this.currentLevelIndex = 0;
    this.bridges = [];
    this.boxes = [];
    this.shards = [];
    this.activeBridge = null;
    this.bridgeIdCounter = 0;
    
    // 첫 브릿지 스폰
    this.spawnBridge(true, 1);
    
    // 시작 시퀀스
    setTimeout(() => {
      this.isResting = false;
      this.movementActive = true;
    }, 5000);
    
    this.animate();
  }
  
  /**
   * 엔진 중지
   */
  stop() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
  
  /**
   * 정리
   */
  cleanup() {
    this.stop();
    
    // 모든 메쉬 제거
    this.boxes.forEach(box => {
      if (box.mesh.parent) {
        box.mesh.parent.remove(box.mesh);
      }
      box.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    
    this.shards.forEach(shard => {
      this.scene.remove(shard.mesh);
      shard.mesh.geometry.dispose();
      if (Array.isArray(shard.mesh.material)) {
        shard.mesh.material.forEach(mat => mat.dispose());
      } else {
        shard.mesh.material.dispose();
      }
    });
    
    this.bridges.forEach(bridge => {
      this.scene.remove(bridge.mesh);
      bridge.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    // 씬 정리
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
  }
  
  /**
   * Canvas 리사이즈
   */
  resize(width?: number, height?: number) {
    if (width && height) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    } else {
      // 자동 크기 감지
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.camera.aspect = rect.width / rect.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(rect.width, rect.height);
    }
  }
  
  /**
   * 리사이즈 이벤트 리스너 등록
   */
  setupResizeListener() {
    const handleResize = () => {
      this.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }
}
