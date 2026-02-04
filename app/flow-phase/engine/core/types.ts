/**
 * Flow Phase Engine - Core Types
 * FlowEngineState: Renderer/시스템이 공유하는 최소 상태
 */

import type * as THREE from 'three';

export interface FlowEngineState {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
}
