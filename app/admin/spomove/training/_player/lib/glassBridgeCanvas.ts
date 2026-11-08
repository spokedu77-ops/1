import { COLORS } from '../constants';
import { glassBridgeLitIndex, glassBridgePanels, type GlassBridgeState } from './glassBridgeMemory';

export function createGlassBridgeVisuals(random = Math.random) {
  return { dust: Array.from({ length: 100 }, () => ({ x: random(), y: random(), size: 1 + random() * 2, speed: 0.01 + random() * 0.025, alpha: 0.1 + random() * 0.4 })),
    shards: Array.from({ length: 32 }, () => ({ x: random(), y: random(), vx: (random() - 0.5) * 0.7,
      vy: -0.1 - random() * 0.25, rotation: random() * Math.PI * 2, spin: (random() - 0.5) * 5, size: 0.025 + random() * 0.04 })) };
}

export function drawGlassBridge(ctx: CanvasRenderingContext2D, width: number, height: number,
  state: GlassBridgeState, now: number, visuals: ReturnType<typeof createGlassBridgeVisuals>, reducedMotion: boolean) {
  ctx.fillStyle = '#05050a'; ctx.fillRect(0, 0, width, height);
  ctx.save();
  const shatterTime = (now - state.phaseStarted) / 1000;
  if (state.phase === 'SHATTER' && !reducedMotion) {
    const shake = 30 * Math.exp(-shatterTime * 5);
    ctx.translate(Math.sin(now * 0.1) * shake, Math.cos(now * 0.13) * shake);
  }
  const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height));
  gradient.addColorStop(0, '#00000000'); gradient.addColorStop(1, '#000000cc'); ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  for (const dust of visuals.dust) {
    const y = reducedMotion ? dust.y : (dust.y - now / 1000 * dust.speed % 1 + 1) % 1;
    ctx.fillStyle = `rgba(100,150,255,${dust.alpha})`; ctx.beginPath(); ctx.arc(dust.x * width, y * height, dust.size, 0, Math.PI * 2); ctx.fill();
  }
  const panels = glassBridgePanels(state.pattern.length, width, height);
  const lit = glassBridgeLitIndex(state, now);
  for (const [index, panel] of panels.entries()) {
    const color = COLORS.find(color => color.id === state.pattern[index])!.bg;
    if (state.phase === 'SHATTER') {
      for (const shard of visuals.shards) {
        const x = panel.x + panel.width * (shard.x + shard.vx * shatterTime);
        const y = panel.y + panel.height * shard.y + height * (shard.vy * shatterTime + 0.24 * shatterTime ** 2);
        const size = panel.width * shard.size;
        ctx.save(); ctx.translate(x, y); ctx.rotate(shard.rotation + (reducedMotion ? 0 : shard.spin * shatterTime));
        ctx.globalAlpha = Math.max(0, 0.8 - shatterTime * 0.25); ctx.fillStyle = color; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size, size); ctx.lineTo(-size, size); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      continue;
    }
    const active = lit === index || state.phase === 'REVEAL' || (state.phase === 'SUCCESS' && now - state.phaseStarted < 500);
    ctx.shadowBlur = active ? 40 : 8; ctx.shadowColor = active ? color : '#ffffff22';
    ctx.fillStyle = active ? color + 'cc' : '#ffffff0d';
    ctx.beginPath(); ctx.roundRect(panel.x, panel.y, panel.width, panel.height, Math.min(20, panel.height * 0.25)); ctx.fill();
    ctx.lineWidth = active ? 4 : 2; ctx.strokeStyle = active ? '#fff' : '#ffffff33'; ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff33'; ctx.beginPath();
    ctx.roundRect(panel.x + 5, panel.y + 3, panel.width - 10, panel.height * 0.3, Math.min(12, panel.height * 0.1)); ctx.fill();
  }
  ctx.restore();
}
