/**
 * [LAB] Legacy IIWarmup Flow — 파노라마 셰이더 참고 코드
 *
 * 출처: app/program/iiwarmup/flow/engine/FlowEngine.ts (백업 태그: backup-pre-dive-flow-consolidation-20260625-1200)
 * 상태: 미연결 — flow-lab 런타임에 아직 적용되지 않음. 참고용 보존.
 * 적용 방법: THREE.SphereGeometry + THREE.ShaderMaterial(uniforms 아래 참고)로 파노라마 구 생성
 */

/** equirectangular 파노라마를 구면에 투영. 전방 180°만 선명히 표시, 후방은 우주 검정 페이드 */
export const LEGACY_PANO_VERTEX = `
  varying vec3 vViewDirection;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewDirection = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

export const LEGACY_PANO_FRAGMENT = `
  uniform sampler2D map;
  uniform float uTime;
  uniform float uVignetteScale;
  uniform float uGrainScale;
  uniform float uPanoRotation;
  varying vec3 vViewDirection;
  void main() {
    vec3 d = normalize(vViewDirection);
    float u = (atan(d.x, -d.z) + 3.14159265) / 6.2831853 + (uPanoRotation / 6.2831853);
    u = fract(u);
    float v = 0.5 + asin(clamp(d.y, -1.0, 1.0)) / 3.14159265;
    vec4 c1 = texture2D(map, vec2(u, v));
    vec4 c2 = texture2D(map, vec2(u, 1.0 - v));
    float l1 = dot(c1.rgb, vec3(0.299, 0.587, 0.114));
    float l2 = dot(c2.rgb, vec3(0.299, 0.587, 0.114));
    vec4 c = (l2 > l1) ? c2 : c1;
    float breath = 1.0 + 0.025 * sin(uTime * 0.4);
    c.rgb *= breath;
    float edge = 1.0 - smoothstep(-0.12, 0.08, d.z);
    c.rgb = mix(vec3(0.0, 0.0, 0.0), c.rgb, edge);
    float vignette = 1.0 - 0.32 * uVignetteScale * (1.0 + d.z);
    c.rgb *= clamp(vignette, 0.0, 1.0);
    c.rgb = (c.rgb - 0.5) * 1.10 + 0.5;
    float n = fract(sin(dot(gl_FragCoord.xy + uTime * 60.0, vec2(12.9898, 78.233))) * 43758.5453);
    c.rgb += (n - 0.5) * 0.01 * uGrainScale;
    gl_FragColor = vec4(clamp(c.rgb, 0.0, 1.0), c.a);
  }
`;

import type * as THREE from 'three';

/** ShaderMaterial uniforms 초기값 참고 */
export interface LegacyPanoUniforms {
  map: { value: THREE.Texture | null };
  uTime: { value: number };
  uVignetteScale: { value: number };
  uGrainScale: { value: number };
  uPanoRotation: { value: number };
}

/** 파노라마 구 반경. 클수록 파노가 덜 확대되어 보임 */
export const LEGACY_PANO_SPHERE_RADIUS = 6200;

/**
 * dt60 기준 파노 시계 방향 회전 계수
 * (2 * Math.PI) / (90 * 60) — 한 바퀴 90초 기준
 */
export const LEGACY_PANO_ROTATION_DT60_CW = (2 * Math.PI) / (90 * 60);
