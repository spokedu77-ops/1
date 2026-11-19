import { NUMBER_READER_ZONES, numberReaderPosition, numberReaderOccluders,
  numberReaderPhaseSeconds, type NumberReaderPhase, type NumberReaderTrial } from './movingNumberReader';

/** Source renderer: background -> capsule/trail -> opaque pillars -> HUD.
 * Original colors are adapted ONLY to canonical SPOKEDU quadrant colors.
 * Center cards and labels fit narrow screens; source timings/geometry remain.
 */
export function drawNumberReaderFrame(ctx: CanvasRenderingContext2D, width: number, height: number,
  trial: NumberReaderTrial, round: number, phase: NumberReaderPhase, progress: number, now: number,
  flightSeconds: number, bodyFont = 'sans-serif', numberFont = bodyFont, progressive = true) {
  const state = phase;
  const timer = (1 - Math.min(1, progress)) * numberReaderPhaseSeconds(phase, flightSeconds, round, progressive);
  const panelWidth = Math.min(400, width - 32);
  const actionWidth = Math.min(700, width - 32);
  const readyBar = panelWidth * .75;
  const actionBar = actionWidth * (6 / 7);
  const ZONES = NUMBER_READER_ZONES;
  const p = numberReaderPosition(trial, progress, width, height);
  const start = numberReaderPosition(trial, 0, width, height);
  const end = numberReaderPosition(trial, 1, width, height);
  const capsule = { targetNumber: trial.number, flightDuration: flightSeconds,
    x: p.x * width, y: p.y * height, startX: start.x * width, startY: start.y * height,
    endX: end.x * width, endY: end.y * height, isHorizontal: trial.path < 2,
    trail: [] as Array<{ x: number; y: number }> };
  for (let i = 14; i >= 0; i--) {
    const earlier = progress - i / (60 * flightSeconds);
    if (earlier < 0) continue;
    const point = numberReaderPosition(trial, earlier, width, height);
    capsule.trail.push({ x: point.x * width, y: point.y * height });
  }
        function drawBackground() {
            ctx.fillStyle = '#020617';
            ctx.fillRect(0, 0, width, height);

            // 레이싱 트랙/터널 같은 속도감 있는 그리드 라인
            ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            ctx.lineWidth = 1;
            let timeOffset = (now / 20) % 100;
            for(let i = timeOffset; i < width; i += 100) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,height); ctx.stroke(); }
            for(let i = timeOffset; i < height; i += 100) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(width,i); ctx.stroke(); }

            // 4분할 십자선
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(width/2, 0); ctx.lineTo(width/2, height);
            ctx.moveTo(0, height/2); ctx.lineTo(width, height/2);
            ctx.stroke();

            // 바닥에 흐릿하게 깔린 구역 번호
            for(let i=0; i<4; i++) {
                let px = (i === 0 || i === 2) ? width * 0.25 : width * 0.75;
                let py = (i === 0 || i === 1) ? height * 0.25 : height * 0.75;

                ctx.fillStyle = 'rgba(255,255,255,0.03)';
                ctx.font = `900 ${width * 0.15}px ${numberFont}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(i + 1), px, py);
            }
        }

        function drawCapsule() {
            if (state !== 'FLY') return;

            // 라운드가 오를수록 캡슐 크기가 작아짐 (극도의 시력 집중 요구)
            let baseRadius = Math.min(width, height) * 0.08;
            let radius = Math.max(baseRadius - (round * 2), baseRadius * 0.5);

            // 1. 모션 블러 잔상 (Trail) 렌더링
            for (let i = 0; i < capsule.trail.length; i++) {
                let point = capsule.trail[i];
                let alpha = (i / capsule.trail.length) * 0.3; // 뒤로 갈수록 흐려짐
                ctx.fillStyle = `rgba(14, 165, 233, ${alpha})`;
                ctx.beginPath();
                ctx.arc(point.x, point.y, radius * (0.8 + alpha*0.5), 0, Math.PI * 2);
                ctx.fill();
            }

            // 2. 캡슐 본체 렌더링
            ctx.fillStyle = '#0284c7'; // 진한 파랑
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 30;
            ctx.beginPath();
            ctx.arc(capsule.x, capsule.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // 캡슐 내부 테두리
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(capsule.x, capsule.y, radius * 0.8, 0, Math.PI * 2);
            ctx.stroke();

            // 3. 캡슐 안의 핵심 타겟 숫자 (이걸 읽어내야 함!)
            ctx.fillStyle = '#fde047'; // 노란색
            ctx.font = `900 ${radius}px ${numberFont}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // 물체가 이동하는 방향에 맞춰 숫자가 살짝 기울어지는 속도감 연출
            ctx.save();
            ctx.translate(capsule.x, capsule.y);
            let angle = Math.atan2(capsule.endY - capsule.startY, capsule.endX - capsule.startX);

            // 미세한 떨림(Wobble)을 주어 동체시력을 극도로 자극
            let wobble = Math.sin(now / 30) * 0.15;
            ctx.rotate(angle + wobble);

            ctx.fillText(String(capsule.targetNumber), 0, 0);
            ctx.restore();
        }

        function drawForeground() {
            // 시야 가림막 (Occlusion Training) - 라운드 3부터 등장
            if (state !== 'FLY' || round < 3) return;

            let numPillars = round >= 5 ? 3 : 1; // 라운드 5부터 가림막 3개로 증가

            ctx.fillStyle = '#0f172a'; // 배경과 비슷한 색으로 캡슐을 완전히 가림
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 4;

            for(let i = 1; i <= numPillars; i++) {
                let pos = i / (numPillars + 1);
                ctx.fillStyle = '#0f172a';

                if (capsule.isHorizontal) {
                    // 캡슐이 가로로 날면 세로 기둥 설치
                    let pWidth = width * 0.12;
                    let px = (width * pos) - (pWidth / 2);

                    ctx.fillRect(px, 0, pWidth, height);
                    ctx.strokeRect(px, 0, pWidth, height);

                    // 기둥 중앙 장식
                    ctx.fillStyle = '#1e293b';
                    ctx.fillRect(px + pWidth*0.4, 0, pWidth*0.2, height);
                } else {
                    // 캡슐이 세로로 날면 가로 기둥 설치
                    let pHeight = height * 0.12;
                    let py = (height * pos) - (pHeight / 2);

                    ctx.fillRect(0, py, width, pHeight);
                    ctx.strokeRect(0, py, width, pHeight);

                    ctx.fillStyle = '#1e293b';
                    ctx.fillRect(0, py + pHeight*0.4, width, pHeight*0.2);
                }
            }
        }

        function drawHUD() {
            const cx = width / 2;
            const cy = height / 2;

            if (state === 'READY') {
                ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
                ctx.beginPath(); ctx.roundRect(cx - panelWidth / 2, cy - 60, panelWidth, 120, 20); ctx.fill();
                ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3; ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.font = `900 ${Math.max(18, width * 0.03)}px ${bodyFont}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText("물체 추적 준비", cx, cy - 15);

                // 게이지 바 애니메이션
                let progress = 1 - (timer / 1.5);
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(cx - readyBar / 2, cy + 20, readyBar * progress, 8);
            }
            else if (state === 'ACTION') {
                ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
                ctx.beginPath(); ctx.roundRect(cx - actionWidth / 2, cy - 80, actionWidth, 160, 20); ctx.fill();
                ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 4; ctx.stroke();

                ctx.fillStyle = '#22c55e';
                ctx.font = `900 ${Math.max(15, Math.min(40, width * 0.045))}px ${bodyFont}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 15;
                if (width < 640) {
                  ctx.fillText('방금 본 숫자의', cx, cy - 30, actionWidth - 24);
                  ctx.fillText('구역으로 이동하세요!', cx, cy, actionWidth - 24);
                } else ctx.fillText("방금 본 숫자의 구역으로 이동하라!", cx, cy - 20, actionWidth - 32);
                ctx.shadowBlur = 0;

                let actionTotalTime = numberReaderPhaseSeconds('ACTION', flightSeconds, round, progressive);
                let progress = timer / actionTotalTime;
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fillRect(cx - actionBar / 2, cy + 40, actionBar, 15);
                ctx.fillStyle = timer < 1.0 ? '#ef4444' : '#22c55e';
                ctx.fillRect(cx - actionBar / 2, cy + 40, actionBar * progress, 15);
            }
            else if (state === 'REVEAL') {
                let zId = capsule.targetNumber - 1; // 1~4를 0~3 인덱스로
                let px = (zId === 0 || zId === 2) ? 0 : cx;
                let py = (zId === 0 || zId === 1) ? 0 : cy;

                // 정답 구역 하이라이트
                ctx.fillStyle = `${ZONES[zId].color}33`;
                ctx.fillRect(px, py, cx, cy);

                ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
                ctx.beginPath(); ctx.roundRect(cx - panelWidth / 2, cy - 60, panelWidth, 120, 20); ctx.fill();

                ctx.strokeStyle = ZONES[zId].color; ctx.lineWidth = 4; ctx.stroke();
                ctx.fillStyle = ZONES[zId].color;
                ctx.font = `900 ${Math.max(18, width * 0.04)}px ${bodyFont}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`정답: ${capsule.targetNumber}구역!`, cx, cy);
            }

            // 상단 훈련 정보 표시
            ctx.fillStyle = '#94a3b8';
            ctx.font = `700 ${Math.max(12, width * 0.015)}px ${bodyFont}`;
            ctx.textAlign = 'left';
            ctx.fillText(`동체시력 · ${round} · ${progressive ? '어려움' : '쉬움'}`, 30, 40);

            ctx.textAlign = 'right';
            ctx.fillText(`비행 속도 : ${capsule.flightDuration.toFixed(2)}초`, width - 30, 40);
        }

        function draw() {
            drawBackground();
            drawCapsule();
            drawForeground(); // 캡슐 위를 덮어 시야를 가리는 장애물 렌더링
            drawHUD();
        }


  draw();
  if (phase !== 'FLY') return false;
  const radius = Math.max(Math.min(width, height) * .08 - round * 2, Math.min(width, height) * .04);
  return capsule.x >= radius && capsule.x <= width - radius && capsule.y >= radius && capsule.y <= height - radius
    && !numberReaderOccluders(round, trial).some(rect => capsule.x >= rect.x * width - radius * .5
      && capsule.x <= (rect.x + rect.width) * width + radius * .5 && capsule.y >= rect.y * height - radius * .5
      && capsule.y <= (rect.y + rect.height) * height + radius * .5);
}
