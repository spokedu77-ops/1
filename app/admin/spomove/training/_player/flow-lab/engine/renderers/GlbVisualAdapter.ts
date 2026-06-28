import * as THREE from 'three';

export interface GlbFitOptions {
  targetWidth:  number;
  targetHeight: number;
  targetDepth:  number;
  bottomY:      number;
}

export interface GlbFitResult {
  clone:        THREE.Object3D;
  sourceBounds: { width: number; height: number; depth: number };
  scale:        { x: number; y: number; z: number };
  finalBounds:  { bottomY: number; topY: number; width: number; height: number; depth: number };
}

export function fitGlbToBox(template: THREE.Object3D, opts: GlbFitOptions): GlbFitResult {
  const clone = template.clone(true);
  clone.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(clone);
  const size   = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const sx = opts.targetWidth  / size.x;
  const sy = opts.targetHeight / size.y;
  const sz = opts.targetDepth  / size.z;
  clone.scale.set(sx, sy, sz);

  clone.position.set(
    -center.x * sx,
    opts.bottomY - box.min.y * sy,
    -center.z * sz,
  );

  clone.frustumCulled = false;
  clone.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (m.isMesh) m.frustumCulled = false;
  });

  return {
    clone,
    sourceBounds: { width: size.x, height: size.y, depth: size.z },
    scale:        { x: sx, y: sy, z: sz },
    finalBounds:  {
      bottomY: opts.bottomY,
      topY:    opts.bottomY + opts.targetHeight,
      width:   opts.targetWidth,
      height:  opts.targetHeight,
      depth:   opts.targetDepth,
    },
  };
}
