'use client';

import { useEffect, useRef } from 'react';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';
import {
  buildVisualSearchRound,
  normalizeVisualSearchRounds,
  normalizeVisualSearchSpeed,
  VISUAL_SEARCH_REVEAL_MS,
  VISUAL_SEARCH_ZONE_COLORS,
  visualSearchStage,
  zonesToReactTrainLanes,
  type VisualSearchRound,
  type VisualSearchShape,
} from '../lib/visualSearchModel';

/** The original Canvas 2D search task, fitted into the existing SPOMOVE runtime.
 * No automatic success or measured reaction time: a round is a presented stimulus only.
 */
export function VisualSearchReactionTraining({
  speedSec,
  targetRounds,
  onExit,
  onComplete,
  onRoundPresented,
}: {
  speedSec: number;
  targetRounds: number;
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
  onRoundPresented?: (laneCounts: [number, number, number, number]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCompleteRef = useRef(onComplete);
  const onRoundPresentedRef = useRef(onRoundPresented);

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onRoundPresentedRef.current = onRoundPresented; }, [onRoundPresented]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const seconds = normalizeVisualSearchSpeed(speedSec);
    const totalRounds = normalizeVisualSearchRounds(targetRounds);
    const colorCountsByZone = [0, 0, 0, 0];
    let width = 0;
    let height = 0;
    let current: VisualSearchRound | null = null;
    let round = 1;
    let phase: 'SEARCH' | 'REVEAL' = 'SEARCH';
    let phaseDeadline = 0;
    let raf = 0;
    let closed = false;

    function resize() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      const nextWidth = Math.max(320, rect.width);
      const nextHeight = Math.max(240, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.ceil(nextWidth * dpr);
      canvas.height = Math.ceil(nextHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (current && width > 0 && height > 0) {
        const scaleX = nextWidth / width;
        const scaleY = nextHeight / height;
        for (const shape of current.shapes) {
          shape.x *= scaleX;
          shape.y *= scaleY;
        }
      }
      width = nextWidth;
      height = nextHeight;
    }

    function presentRound(now: number) {
      current = buildVisualSearchRound(round, width, height);
      phase = 'SEARCH';
      phaseDeadline = now + seconds * 1000;
      colorCountsByZone[current.targetZone] += 1;
      onRoundPresentedRef.current?.(zonesToReactTrainLanes(colorCountsByZone));
    }

    function drawShape(shape: VisualSearchShape, now: number, radius: number, dim: boolean) {
      if (!ctx) return;
      const moving = visualSearchStage(round) === 'moving' && phase === 'SEARCH';
      const moveX = moving ? Math.sin(now / 900 + shape.animOffset) * 7 : 0;
      const moveY = moving ? Math.cos(now / 900 + shape.animOffset) * 7 : 0;
      const x = shape.x + moveX;
      const y = shape.y + moveY;
      ctx.save();
      ctx.globalAlpha = dim ? 0.14 : 1;
      ctx.fillStyle = shape.color;
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = Math.max(1, radius * 0.09);
      ctx.shadowBlur = 9;
      ctx.shadowColor = shape.color;
      ctx.beginPath();
      if (shape.type === 'CIRCLE') {
        ctx.arc(x, y, radius, 0, Math.PI * 2);
      } else {
        ctx.roundRect(x - radius, y - radius, radius * 2, radius * 2, radius * 0.25);
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();
      ctx.restore();
    }

    function draw(now: number) {
      if (!ctx || !current) return;
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, width, height);

      const halfW = width / 2;
      const halfH = height / 2;
      if (phase === 'REVEAL') {
        const zone = current.targetZone;
        ctx.fillStyle = VISUAL_SEARCH_ZONE_COLORS[zone] + '33';
        ctx.fillRect(zone % 2 ? halfW : 0, zone >= 2 ? halfH : 0, halfW, halfH);
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(halfW, 0);
      ctx.lineTo(halfW, height);
      ctx.moveTo(0, halfH);
      ctx.lineTo(width, halfH);
      ctx.stroke();

      for (let zone = 0; zone < 4; zone++) {
        const x = (zone % 2 ? 0.75 : 0.25) * width;
        const y = (zone >= 2 ? 0.75 : 0.25) * height;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.font = '900 ' + Math.max(60, Math.min(width, height) * 0.16) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(zone + 1), x, y);
      }

      const radius = Math.max(7, Math.min(width, height) * 0.027);
      for (const shape of current.shapes) {
        drawShape(shape, now, radius, phase === 'REVEAL' && !shape.isTarget);
      }
      if (phase === 'REVEAL') {
        const target = current.shapes[current.targetIndex]!;
        ctx.strokeStyle = '#FDE047';
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.arc(target.x, target.y, radius * 2.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const topY = Math.max(55, Math.min(height * 0.10, 86));
      const bannerWidth = Math.min(width - 32, 610);
      const left = (width - bannerWidth) / 2;
      ctx.fillStyle = 'rgba(15,23,42,0.9)';
      ctx.strokeStyle = '#EAB308';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(left, topY - 30, bannerWidth, 72, 13);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = phase === 'REVEAL'
        ? VISUAL_SEARCH_ZONE_COLORS[current.targetZone]
        : '#FDE047';
      ctx.font = '900 ' + Math.max(17, Math.min(29, width * 0.032)) + 'px sans-serif';
      ctx.fillText(
        phase === 'SEARCH' ? '다른 도형 1개를 찾아 이동하세요' : '목표 위치: ' + (current.targetZone + 1) + '구역',
        width / 2,
        topY - 3,
      );
      if (phase === 'SEARCH') {
        const ratio = Math.max(0, (phaseDeadline - now) / (seconds * 1000));
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(left + 25, topY + 22, bannerWidth - 50, 7);
        ctx.fillStyle = ratio < 0.3 ? '#EF4444' : '#EAB308';
        ctx.fillRect(left + 25, topY + 22, (bannerWidth - 50) * ratio, 7);
      }

      ctx.textBaseline = 'top';
      ctx.fillStyle = '#CBD5E1';
      ctx.font = '700 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('복합 시각탐색', 16, 16);
      ctx.textAlign = 'right';
      ctx.fillText(round + ' / ' + totalRounds + '회', width - 16, 16);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(226,232,240,0.8)';
      ctx.font = '600 14px sans-serif';
      ctx.fillText('화면 제시 횟수이며 수행 정확도는 측정하지 않습니다.', width / 2, height - 27);
    }

    function frame(now: number) {
      if (closed) return;
      if (phase === 'SEARCH' && now >= phaseDeadline) {
        phase = 'REVEAL';
        phaseDeadline = now + VISUAL_SEARCH_REVEAL_MS;
      } else if (phase === 'REVEAL' && now >= phaseDeadline) {
        if (round >= totalRounds) {
          closed = true;
          onCompleteRef.current({
            stims: totalRounds,
            maxCombo: 0,
            laneCount: zonesToReactTrainLanes(colorCountsByZone),
            completionReason: 'natural_complete',
          });
          return;
        }
        round += 1;
        presentRound(now);
      }
      draw(now);
      raf = window.requestAnimationFrame(frame);
    }

    resize();
    presentRound(window.performance.now());
    raf = window.requestAnimationFrame(frame);
    window.addEventListener('resize', resize);
    return () => {
      closed = true;
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [speedSec, targetRounds]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#0F172A', fontFamily: 'sans-serif' }}>
      <canvas ref={canvasRef} aria-label="복합 시각탐색 훈련 화면" style={{ display: 'block', width: '100%', height: '100%' }} />
      <button
        type="button"
        onClick={onExit}
        style={{
          position: 'absolute', bottom: 15, right: 16, zIndex: 3,
          padding: '8px 16px', border: '1px solid rgba(255,255,255,0.4)',
          borderRadius: 12, color: '#fff', background: 'rgba(15,23,42,0.75)',
          fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}
      >
        훈련 종료
      </button>
    </div>
  );
}
