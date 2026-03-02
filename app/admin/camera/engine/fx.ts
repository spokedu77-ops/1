/**
 * SPOKEDU 카메라 앱 — 스무딩, 트레일, 파티클
 */

const PART_COLORS = ['#FCD34D', '#FB923C', '#F87171', '#34D399', '#60A5FA', '#A78BFA'];

const smoothMap: Record<string, { x: number; y: number }> = {};
const SMOOTH_ALPHA = 0.35;

export function smooth(id: string, x: number, y: number): { x: number; y: number } {
  if (!smoothMap[id]) smoothMap[id] = { x, y };
  else {
    smoothMap[id].x += SMOOTH_ALPHA * (x - smoothMap[id].x);
    smoothMap[id].y += SMOOTH_ALPHA * (y - smoothMap[id].y);
  }
  return smoothMap[id];
}

export function clearSmooth(): void {
  Object.keys(smoothMap).forEach((k) => delete smoothMap[k]);
}

const trailMap: Record<string, { x: number; y: number; t: number }[]> = {};
const TRAIL_LEN = 8;

export function pushTrail(id: string, x: number, y: number, now: number): void {
  if (!trailMap[id]) trailMap[id] = [];
  trailMap[id].push({ x, y, t: now });
  if (trailMap[id].length > TRAIL_LEN) trailMap[id].shift();
}

export function drawTrail(
  ctx: CanvasRenderingContext2D,
  id: string,
  colorRgba: string,
  now: number
): void {
  const pts = trailMap[id];
  if (!pts || pts.length < 2) return;
  for (let i = 1; i < pts.length; i++) {
    const age = (now - pts[i].t) / 300;
    const a = Math.max(0, 0.45 - age * 0.45);
    const r = 6 * (1 - age * 0.6);
    ctx.beginPath();
    ctx.arc(pts[i].x, pts[i].y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${colorRgba},${a})`;
    ctx.fill();
  }
}

export function clearTrails(): void {
  Object.keys(trailMap).forEach((k) => delete trailMap[k]);
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  r: number;
  color: string;
}

const particles: Particle[] = [];

export function spawnParticles(nx: number, ny: number, cW: number, cH: number, count = 12): void {
  const x = nx * cW;
  const y = ny * cH;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.6;
    const spd = 3 + Math.random() * 5;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - 1.5,
      alpha: 1,
      r: 4 + Math.random() * 4,
      color: PART_COLORS[Math.floor(Math.random() * PART_COLORS.length)]!,
    });
  }
}

export function tickParticles(ctx: CanvasRenderingContext2D): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]!;
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.28;
    p.alpha -= 0.04;
    if (p.alpha <= 0) {
      particles.splice(i, 1);
      continue;
    }
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.restore();
  }
}

export function clearParticles(): void {
  particles.length = 0;
}
