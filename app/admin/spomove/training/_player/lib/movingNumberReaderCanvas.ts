import { NUMBER_READER_ZONES, numberReaderOccluders, numberReaderPosition, numberReaderRadius,
  type NumberReaderPhase, type NumberReaderTrial } from './movingNumberReader';

/** Draw order is part of the task: tunnel → capsule/number → opaque occluders → reveal. */
export function drawNumberReaderFrame(ctx: CanvasRenderingContext2D, width: number, height: number,
  trial: NumberReaderTrial, round: number, phase: NumberReaderPhase, progress: number, now: number, flightSeconds: number) {
  ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#ffffff09'; ctx.lineWidth = 1;
  const offset = (now / 20) % 100;
  for (let i = offset; i < width; i += 100) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke(); }
  for (let i = offset; i < height; i += 100) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke(); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const [i, zone] of NUMBER_READER_ZONES.entries()) {
    const x = (i % 2) * width / 2; const y = Math.floor(i / 2) * height / 2;
    ctx.strokeStyle = `${zone.color}55`; ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, width / 2 - 2, height / 2 - 2);
    ctx.fillStyle = '#ffffff09'; ctx.font = `800 ${Math.min(width, height) * 0.2}px sans-serif`;
    ctx.fillText(String(zone.number), x + width / 4, y + height / 4);
    ctx.fillStyle = zone.color; ctx.font = '700 14px sans-serif';
    ctx.fillText(`${zone.number} · ${zone.name}`, x + width / 4, y + 22);
  }
  let visible = false;
  if (phase === 'FLY') {
    const radius = numberReaderRadius(round, width, height);
    const p = numberReaderPosition(trial, progress); const x = p.x * width; const y = p.y * height;
    // Fifteen time-sampled afterimages keep trail length independent of frame rate.
    for (let i = 15; i > 0; i--) {
      const earlier = progress - i / (60 * flightSeconds);
      if (earlier < 0) continue;
      const point = numberReaderPosition(trial, earlier);
      ctx.fillStyle = `rgba(14,165,233,${(1 - i / 16) * 0.3})`;
      ctx.beginPath(); ctx.arc(point.x * width, point.y * height, radius * 0.85, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#0284c7'; ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, radius * 0.09);
    ctx.beginPath(); ctx.arc(x, y, radius * 0.8, 0, Math.PI * 2); ctx.stroke();
    ctx.save(); ctx.translate(x, y);
    const angle = Math.atan2((trial.end.y - trial.start.y) * height, (trial.end.x - trial.start.x) * width);
    ctx.rotate(angle + Math.sin(now / 30) * 0.15);
    ctx.fillStyle = '#fde047'; ctx.font = `900 ${radius}px sans-serif`;
    ctx.fillText(String(trial.number), 0, 0); ctx.restore();
    const occluders = numberReaderOccluders(round, trial);
    for (const rect of occluders) {
      ctx.fillStyle = '#0f172a'; ctx.strokeStyle = '#334155'; ctx.lineWidth = 4;
      ctx.fillRect(rect.x * width, rect.y * height, rect.width * width, rect.height * height);
      ctx.strokeRect(rect.x * width, rect.y * height, rect.width * width, rect.height * height);
    }
    visible = x >= radius && x <= width - radius && y >= radius && y <= height - radius
      && !occluders.some(rect => x >= rect.x * width - radius * 0.5 && x <= (rect.x + rect.width) * width + radius * 0.5
        && y >= rect.y * height - radius * 0.5 && y <= (rect.y + rect.height) * height + radius * 0.5);
  }
  if (phase === 'REVEAL') {
    const i = trial.number - 1; const zone = NUMBER_READER_ZONES[i]!;
    const x = (i % 2) * width / 2; const y = Math.floor(i / 2) * height / 2;
    ctx.fillStyle = `${zone.color}44`; ctx.fillRect(x, y, width / 2, height / 2);
    ctx.fillStyle = zone.color; ctx.font = `800 ${Math.min(width, height) * 0.08}px sans-serif`;
    ctx.fillText(`정답 ${trial.number}`, x + width / 4, y + height / 4);
  }
  return visible;
}
