function makePath2D(): Path2D {
  if (typeof Path2D !== 'undefined') return new Path2D();
  return {
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    arc: () => {},
    rect: () => {},
    bezierCurveTo: () => {},
  } as unknown as Path2D;
}

function createStarPath(cx: number, cy: number, spikes: number, outerR: number, innerR: number): Path2D {
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  const path = makePath2D();
  path.moveTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
  for (let i = 0; i < spikes; i++) {
    rot += step;
    path.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
    path.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
  }
  path.closePath();
  return path;
}

function createRegularPolygonPath(
  cx: number,
  cy: number,
  sides: number,
  radius: number,
  rotation = -Math.PI / 2,
): Path2D {
  const path = makePath2D();
  const step = (Math.PI * 2) / sides;
  for (let i = 0; i < sides; i++) {
    const angle = rotation + step * i;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.closePath();
  return path;
}

function createDiamondPath(cx: number, cy: number, radius: number): Path2D {
  const path = makePath2D();
  path.moveTo(cx, cy - radius);
  path.lineTo(cx + radius * 0.72, cy);
  path.lineTo(cx, cy + radius);
  path.lineTo(cx - radius * 0.72, cy);
  path.closePath();
  return path;
}

function createHeartPath(cx: number, cy: number, size: number): Path2D {
  const r = size * 0.42;
  const path = makePath2D();
  path.moveTo(cx, cy + r * 1.15);
  path.bezierCurveTo(cx - r * 1.35, cy + r * 0.15, cx - r * 0.95, cy - r * 0.95, cx, cy - r * 0.35);
  path.bezierCurveTo(cx + r * 0.95, cy - r * 0.95, cx + r * 1.35, cy + r * 0.15, cx, cy + r * 1.15);
  path.closePath();
  return path;
}

/** 매직 아이(5번): 노이즈에서 식별 가능한 도형 실루엣만 사용 (원·사각·화살·플러스 등 제외) */
export const CAMO_SHAPE_BUILDERS: Array<(cx: number, cy: number, size: number) => Path2D> = [
  (cx, cy, size) => createStarPath(cx, cy, 5, size, size * 0.4),
  (cx, cy, size) => createRegularPolygonPath(cx, cy, 3, size * 0.95),
  (cx, cy, size) => createRegularPolygonPath(cx, cy, 5, size * 0.92),
  (cx, cy, size) => createRegularPolygonPath(cx, cy, 6, size * 0.92),
  (cx, cy, size) => createDiamondPath(cx, cy, size),
  (cx, cy, size) => createHeartPath(cx, cy, size),
];

export function pickCamoShapePath(cx: number, cy: number, size: number): Path2D {
  const builder = CAMO_SHAPE_BUILDERS[Math.floor(Math.random() * CAMO_SHAPE_BUILDERS.length)]!;
  return builder(cx, cy, size);
}
