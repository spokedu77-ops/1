'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { TimelineEvent, TriggerType, ObjectType } from '../types/scenario';

interface TriggerRendererProps {
  event: TimelineEvent;
  scene: THREE.Scene;
  onComplete: () => void;
}

export function TriggerRenderer({ event, scene, onComplete }: TriggerRendererProps) {
  const meshRef = useRef<THREE.Group | null>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!scene) return;

    const group = new THREE.Group();
    meshRef.current = group;

    const { visual_effect, trigger } = event;
    const { object_type, position, scale = 1, color, rotation } = visual_effect;

    // 화면 좌표를 3D 좌표로 변환
    const x = ((position.x / 100) - 0.5) * 2000;
    const y = ((1 - position.y / 100) - 0.5) * 2000;
    const z = position.z || -1000;

    group.position.set(x, y, z);

    // 오브젝트 타입별 메시 생성
    let mesh: THREE.Mesh | THREE.Group | THREE.Points;

    switch (object_type) {
      case 'flame':
        mesh = createFlameMesh(color || '#ff6600', scale);
        break;
      case 'pan':
        mesh = createPanMesh(scale);
        break;
      case 'popcorn':
        mesh = createPopcornMesh(scale);
        break;
      case 'wall':
        mesh = createWallMesh(color || '#FF8C42', scale);
        break;
      case 'rope':
        mesh = createRopeMesh(color || '#8B5CF6', scale);
        break;
      case 'steam':
        mesh = createSteamMesh(scale);
        break;
      case 'knife':
        mesh = createKnifeMesh(scale);
        break;
      case 'spark':
        mesh = createSparkMesh(color || '#FFD700', scale);
        break;
      default:
        mesh = createDefaultMesh(scale);
    }

    if (rotation) {
      mesh.rotation.set(
        rotation.x ? THREE.MathUtils.degToRad(rotation.x) : 0,
        rotation.y ? THREE.MathUtils.degToRad(rotation.y) : 0,
        rotation.z ? THREE.MathUtils.degToRad(rotation.z) : 0
      );
    }

    group.add(mesh);
    scene.add(group);

    // 트리거 타입별 애니메이션
    const duration = event.end - event.start;
    const startTime = performance.now();

    const animate = () => {
      if (!meshRef.current) return;

      const elapsed = (performance.now() - startTime) / 1000;
      const progress = elapsed / duration;

      if (progress >= 1) {
        scene.remove(group);
        onComplete();
        return;
      }

      // 트리거 타입별 애니메이션
      switch (trigger.type) {
        case 'FLICKER':
          animateFlicker(group, elapsed, trigger.interval || 1.0);
          break;
        case 'SWEEP':
          animateSweep(group, elapsed, trigger.speed || 0.8);
          break;
        case 'BURST':
          animateBurst(group, elapsed);
          break;
        case 'APPROACH':
          animateApproach(group, progress);
          break;
        case 'EXPLODE':
          animateExplode(group, elapsed);
          break;
        case 'PULSE':
          animatePulse(group, elapsed);
          break;
        case 'ROTATE':
          animateRotate(group, elapsed, trigger.speed || 1.0);
          break;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (meshRef.current && scene) {
        scene.remove(meshRef.current);
      }
    };
  }, [event, scene, onComplete]);

  return null;
}

// 오브젝트 생성 함수들
function createFlameMesh(color: string, scale: number): THREE.Group {
  const group = new THREE.Group();
  
  // 불꽃 본체
  const flameGeo = new THREE.ConeGeometry(30 * scale, 80 * scale, 8);
  const flameMat = new THREE.MeshPhongMaterial({
    color: color,
    emissive: color,
    transparent: true,
    opacity: 0.9
  });
  const flame = new THREE.Mesh(flameGeo, flameMat);
  group.add(flame);

  // 불꽃 하이라이트
  const highlightGeo = new THREE.ConeGeometry(15 * scale, 40 * scale, 8);
  const highlightMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6
  });
  const highlight = new THREE.Mesh(highlightGeo, highlightMat);
  highlight.position.y = 20 * scale;
  group.add(highlight);

  return group;
}

function createPanMesh(scale: number): THREE.Mesh {
  const panGeo = new THREE.CylinderGeometry(40 * scale, 40 * scale, 8 * scale, 32);
  const panMat = new THREE.MeshPhongMaterial({
    color: 0x8B4513,
    emissive: 0x221100,
    shininess: 30
  });
  return new THREE.Mesh(panGeo, panMat);
}

function createPopcornMesh(scale: number): THREE.Group {
  const group = new THREE.Group();
  
  for (let i = 0; i < 5; i++) {
    const kernelGeo = new THREE.SphereGeometry(8 * scale, 8, 8);
    const kernelMat = new THREE.MeshPhongMaterial({
      color: 0xffd700,
      emissive: 0xffaa00
    });
    const kernel = new THREE.Mesh(kernelGeo, kernelMat);
    kernel.position.set(
      (Math.random() - 0.5) * 50 * scale,
      (Math.random() - 0.5) * 50 * scale,
      (Math.random() - 0.5) * 50 * scale
    );
    group.add(kernel);
  }
  
  return group;
}

function createWallMesh(color: string, scale: number): THREE.Mesh {
  const wallGeo = new THREE.BoxGeometry(2000 * scale, 2000 * scale, 100 * scale);
  const wallMat = new THREE.MeshPhongMaterial({
    color: color,
    emissive: color,
    transparent: true,
    opacity: 0.9
  });
  return new THREE.Mesh(wallGeo, wallMat);
}

function createRopeMesh(color: string, scale: number): THREE.Mesh {
  const ropeGeo = new THREE.CylinderGeometry(10 * scale, 10 * scale, 300 * scale, 16);
  const ropeMat = new THREE.MeshPhongMaterial({
    color: color,
    emissive: color,
    shininess: 20
  });
  return new THREE.Mesh(ropeGeo, ropeMat);
}

function createSteamMesh(scale: number): THREE.Group {
  const group = new THREE.Group();
  
  for (let i = 0; i < 3; i++) {
    const steamGeo = new THREE.SphereGeometry(20 * scale, 16, 16);
    const steamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4
    });
    const steam = new THREE.Mesh(steamGeo, steamMat);
    steam.position.set(0, i * 30 * scale, 0);
    steam.scale.set(1, 1.5, 1);
    group.add(steam);
  }
  
  return group;
}

function createKnifeMesh(scale: number): THREE.Group {
  const group = new THREE.Group();
  
  // 칼날
  const bladeGeo = new THREE.BoxGeometry(100 * scale, 10 * scale, 3 * scale);
  const bladeMat = new THREE.MeshPhongMaterial({
    color: 0xc0c0c0,
    emissive: 0x333333,
    shininess: 100
  });
  const blade = new THREE.Mesh(bladeGeo, bladeMat);
  group.add(blade);
  
  // 손잡이
  const handleGeo = new THREE.BoxGeometry(30 * scale, 15 * scale, 5 * scale);
  const handleMat = new THREE.MeshPhongMaterial({
    color: 0x8B4513,
    emissive: 0x221100
  });
  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.position.x = -65 * scale;
  group.add(handle);
  
  return group;
}

function createSparkMesh(color: string, scale: number): THREE.Points {
  const sparkGeo = new THREE.BufferGeometry();
  const sparkCount = 20;
  const positions = new Float32Array(sparkCount * 3);
  
  for (let i = 0; i < sparkCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 100 * scale;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 100 * scale;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 100 * scale;
  }
  
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  const sparkMat = new THREE.PointsMaterial({
    color: color,
    size: 5 * scale,
    transparent: true,
    opacity: 1
  });
  
  return new THREE.Points(sparkGeo, sparkMat);
}

function createDefaultMesh(scale: number): THREE.Mesh {
  const geo = new THREE.BoxGeometry(50 * scale, 50 * scale, 50 * scale);
  const mat = new THREE.MeshPhongMaterial({ color: 0x3b82f6 });
  return new THREE.Mesh(geo, mat);
}

// 애니메이션 함수들
function animateFlicker(group: THREE.Group, elapsed: number, interval: number) {
  const opacity = Math.sin(elapsed * Math.PI * 2 / interval) * 0.5 + 0.5;
  group.children.forEach(child => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.Material) {
      if (Array.isArray(child.material)) {
        child.material.forEach(mat => {
          if (mat instanceof THREE.MeshPhongMaterial || mat instanceof THREE.MeshBasicMaterial) {
            mat.opacity = opacity;
          }
        });
      } else if (child.material instanceof THREE.MeshPhongMaterial || child.material instanceof THREE.MeshBasicMaterial) {
        child.material.opacity = opacity;
      }
    }
  });
}

function animateSweep(group: THREE.Group, elapsed: number, speed: number) {
  group.position.x += speed * 10;
  group.rotation.z = Math.sin(elapsed * 2) * 0.2;
}

function animateBurst(group: THREE.Group, elapsed: number) {
  group.children.forEach((child, index) => {
    if (child instanceof THREE.Mesh) {
      const angle = (index / group.children.length) * Math.PI * 2;
      child.position.x = Math.cos(angle + elapsed * 2) * 30;
      child.position.y = Math.sin(angle + elapsed * 2) * 30;
      child.position.z = elapsed * 50;
    }
  });
}

function animateApproach(group: THREE.Group, progress: number) {
  const scale = 0.5 + progress * 1.5;
  group.scale.setScalar(scale);
  group.position.z = -1000 + progress * 500;
}

function animateExplode(group: THREE.Group, elapsed: number) {
  const scale = 1 + elapsed * 2;
  group.scale.setScalar(scale);
  
  group.children.forEach(child => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.Material) {
      if (Array.isArray(child.material)) {
        child.material.forEach(mat => {
          if (mat instanceof THREE.MeshPhongMaterial || mat instanceof THREE.MeshBasicMaterial) {
            mat.opacity = Math.max(0, 1 - elapsed * 0.5);
          }
        });
      } else if (child.material instanceof THREE.MeshPhongMaterial || child.material instanceof THREE.MeshBasicMaterial) {
        child.material.opacity = Math.max(0, 1 - elapsed * 0.5);
      }
    }
  });
}

function animatePulse(group: THREE.Group, elapsed: number) {
  const scale = 1 + Math.sin(elapsed * 4) * 0.2;
  group.scale.setScalar(scale);
}

function animateRotate(group: THREE.Group, elapsed: number, speed: number) {
  group.rotation.y += 0.02 * speed;
  group.rotation.x = Math.sin(elapsed) * 0.3;
}
