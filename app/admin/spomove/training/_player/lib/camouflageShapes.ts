function createStarPath(cx: number, cy: number, spikes: number, outerR: number, innerR: number): Path2D {
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  const path = new Path2D();
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

function createCirclePath(cx: number, cy: number, r: number): Path2D {
  const path = new Path2D();
  path.arc(cx, cy, r, 0, Math.PI * 2);
  return path;
}

function createSquarePath(cx: number, cy: number, size: number): Path2D {
  const path = new Path2D();
  path.rect(cx - size / 2, cy - size / 2, size, size);
  return path;
}

function createRegularPolygonPath(
  cx: number,
  cy: number,
  sides: number,
  radius: number,
  rotation = -Math.PI / 2,
): Path2D {
  const path = new Path2D();
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
  const path = new Path2D();
  path.moveTo(cx, cy - radius);
  path.lineTo(cx + radius * 0.72, cy);
  path.lineTo(cx, cy + radius);
  path.lineTo(cx - radius * 0.72, cy);
  path.closePath();
  return path;
}

function createHeartPath(cx: number, cy: number, size: number): Path2D {
  const r = size * 0.42;
  const path = new Path2D();
  path.moveTo(cx, cy + r * 1.15);
  path.bezierCurveTo(cx - r * 1.35, cy + r * 0.15, cx - r * 0.95, cy - r * 0.95, cx, cy - r * 0.35);
  path.bezierCurveTo(cx + r * 0.95, cy - r * 0.95, cx + r * 1.35, cy + r * 0.15, cx, cy + r * 1.15);
  path.closePath();
  return path;
}

function createPlusPath(cx: number, cy: number, size: number): Path2D {
  const arm = size * 0.82;
  const thick = size * 0.3;
  const path = new Path2D();
  path.rect(cx - thick / 2, cy - arm, thick, arm * 2);
  path.rect(cx - arm, cy - thick / 2, arm * 2, thick);
  return path;
}

function createArrowPath(cx: number, cy: number, size: number): Path2D {
  const h = size * 0.95;
  const w = size * 0.55;
  const shaft = size * 0.22;
  const path = new Path2D();
  path.moveTo(cx, cy - h);
  path.lineTo(cx + w, cy - h * 0.15);
  path.lineTo(cx + shaft / 2, cy - h * 0.15);
  path.lineTo(cx + shaft / 2, cy + h * 0.75);
  path.lineTo(cx - shaft / 2, cy + h * 0.75);
  path.lineTo(cx - shaft / 2, cy - h * 0.15);
  path.lineTo(cx - w, cy - h * 0.15);
  path.closePath();
  return path;
}

function createCrescentPath(cx: number, cy: number, size: number): Path2D {
  const r = size * 0.78;
  const path = new Path2D();
  path.arc(cx, cy, r, -Math.PI * 0.35, Math.PI * 1.35);
  path.arc(cx + r * 0.42, cy, r * 0.72, Math.PI * 1.1, -Math.PI * 0.25, true);
  path.closePath();
  return path;
}

export const CAMO_SHAPE_BUILDERS: Array<(cx: number, cy: number, size: number) => Path2D> = [
  (cx, cy, size) => createStarPath(cx, cy, 5, size, size * 0.4),
  (cx, cy, size) => createCirclePath(cx, cy, size * 0.82),
  (cx, cy, size) => createSquarePath(cx, cy, size * 1.25),
  (cx, cy, size) => createRegularPolygonPath(cx, cy, 3, size * 0.95),
  (cx, cy, size) => createRegularPolygonPath(cx, cy, 5, size * 0.92),
  (cx, cy, size) => createRegularPolygonPath(cx, cy, 6, size * 0.92),
  (cx, cy, size) => createRegularPolygonPath(cx, cy, 8, size * 0.9),
  (cx, cy, size) => createDiamondPath(cx, cy, size),
  (cx, cy, size) => createHeartPath(cx, cy, size),
  (cx, cy, size) => createPlusPath(cx, cy, size),
  (cx, cy, size) => createArrowPath(cx, cy, size),
  (cx, cy, size) => createCrescentPath(cx, cy, size),
];

export function pickCamoShapePath(cx: number, cy: number, size: number): Path2D {
  const builder = CAMO_SHAPE_BUILDERS[Math.floor(Math.random() * CAMO_SHAPE_BUILDERS.length)]!;
  return builder(cx, cy, size);
}
