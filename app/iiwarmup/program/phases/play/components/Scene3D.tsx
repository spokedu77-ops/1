'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { BackgroundConfig } from '../types/scenario';

interface Scene3DProps {
  background: BackgroundConfig;
  theme: string;
  onSceneReady?: (scene: THREE.Scene) => void;
}

export function Scene3D({ background, theme, onSceneReady }: Scene3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene 초기화
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Scene 준비 완료 콜백
    if (onSceneReady) {
      onSceneReady(scene);
    }

    // 배경 설정
    if (background.type === '3d' && background.scene_config) {
      const { fog_color, fog_near, fog_far } = background.scene_config;
      scene.background = new THREE.Color(fog_color || 0x000000);
      scene.fog = new THREE.Fog(
        fog_color || 0x000000,
        fog_near || 500,
        fog_far || 3800
      );
    } else if (background.type === 'gradient' && background.colors) {
      scene.background = new THREE.Color(background.colors[0] || 0x000000);
    } else {
      scene.background = new THREE.Color(0x000000);
    }

    // Camera 초기화
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      30000
    );
    camera.position.set(0, 130, 600);
    camera.lookAt(0, 30, -1500);
    cameraRef.current = camera;

    // Renderer 초기화
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 조명 설정
    const ambientLight = new THREE.AmbientLight(0xffffff, background.scene_config?.ambient_light || 0.7);
    scene.add(ambientLight);

    // 포인트 라이트 (테마별)
    if (background.scene_config?.point_lights) {
      background.scene_config.point_lights.forEach(lightConfig => {
        const light = new THREE.PointLight(
          lightConfig.color,
          lightConfig.intensity,
          10000
        );
        light.position.set(lightConfig.position.x, lightConfig.position.y, lightConfig.position.z);
        scene.add(light);
      });
    } else {
      // 기본 조명
      const pointLight = new THREE.PointLight(0x3b82f6, 15, 10000);
      pointLight.position.set(0, 2000, 1000);
      scene.add(pointLight);
    }

    // 별 파티클 배경 생성
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 45000;
    const starPositions = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 25000;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 25000;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 25000;
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2.2,
      transparent: true,
      opacity: 0.8
    });
    
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
    starsRef.current = stars;

    // 테마별 3D 오브젝트 추가
    if (theme === 'kitchen') {
      // 주방 테마: 행성/블랙홀 대신 주방 요소들
      // 예: 거대한 가스레인지, 팬 등 (나중에 트리거와 연동)
    }

    // 애니메이션 루프
    const animate = () => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

      // 별 회전
      if (starsRef.current) {
        starsRef.current.rotation.y += 0.0002;
      }

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // 리사이즈 핸들러
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }

      // Three.js 리소스 정리
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });

      if (starsRef.current) {
        starsRef.current.geometry.dispose();
        if (starsRef.current.material instanceof THREE.Material) {
          starsRef.current.material.dispose();
        }
      }
    };
  }, [background, theme]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}
