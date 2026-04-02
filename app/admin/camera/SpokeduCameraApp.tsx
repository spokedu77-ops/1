'use client';

/**
 * SPOKEDU 카메라 앱 — 화면 라우팅 + 카메라/MediaPipe/RAF 초기화만 담당
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { DIFF, MODE_META, DEFAULT_SETTINGS } from './constants';
import type { DiffKey } from './constants';
import * as Store from './store';
import type { HistoryRecord } from './types';
import { SFX } from './sfx';
import {
  clearSmooth,
  clearTrails,
  clearParticles,
  spawnSpeed,
  spawnMoving,
  spawnSequence,
  spawnShape,
  nextBalancePose,
  nextMirrorPose,
  renderFrame,
} from './engine';
import type { GameState } from './types';
import { HomeScreen } from './screens/HomeScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { GameHUD } from './screens/GameHUD';
import { ResultScreen } from './screens/ResultScreen';
import { ReportScreen } from './screens/ReportScreen';
import styles from './spokedu-camera.module.css';

/** WASM은 패키지와 동일 버전 CDN 경로 (JS는 번들에 포함되어 스크립트 태그 레이스 없음) */
const MEDIAPIPE_VISION_WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm';

const initialGameState: GameState = {
  mode: null,
  diff: DEFAULT_SETTINGS.diff,
  dur: DEFAULT_SETTINGS.dur,
  multiOn: DEFAULT_SETTINGS.multiOn,
  soundOn: DEFAULT_SETTINGS.soundOn,
  camReady: false,
  playing: false,
  paused: false,
  scores: [0, 0, 0],
  combo: [0, 0, 0],
  hitTimes: [],
  targets: [],
  expectedNum: 1,
  targetShape: '',
  timerStart: 0,
  timerOffset: 0,
  poseIdx: 0,
  poseHoldStart: 0,
  mirrorIdx: 0,
  mirrorHoldStart: 0,
};

export default function SpokeduCameraApp() {
  const [curScreen, setCurScreen] = useState<'home' | 'lobby' | 'game' | 'result' | 'report'>('home');
  const [scores, setScores] = useState([0, 0, 0]);
  const [hudTime, setHudTime] = useState('30<span style="font-size:1rem;font-weight:600">초</span>');
  const [hudWarn, setHudWarn] = useState(false);
  const [missionText, setMissionText] = useState('');
  const [pauseVisible, setPauseVisible] = useState(false);
  const [countdownVisible, setCountdownVisible] = useState(false);
  const [countdownNum, setCountdownNum] = useState(3);
  const [resultRecord, setResultRecord] = useState<HistoryRecord | null>(null);
  const [isNewPB, setIsNewPB] = useState(false);
  const [calibStatus, setCalibStatus] = useState({ text: '준비 중...', className: 'calib-wait' });
  const [loaderVisible, setLoaderVisible] = useState(true);
  const [startBtnVisible, setStartBtnVisible] = useState(false);
  const [lobbyTitle, setLobbyTitle] = useState('');
  const [lobbyDesc, setLobbyDesc] = useState('');
  const [diffDisplay, setDiffDisplay] = useState<DiffKey>(DEFAULT_SETTINGS.diff);
  const [durDisplay, setDurDisplay] = useState(DEFAULT_SETTINGS.dur);
  const [multiDisplay, setMultiDisplay] = useState(DEFAULT_SETTINGS.multiOn);
  const [soundDisplay, setSoundDisplay] = useState(DEFAULT_SETTINGS.soundOn);

  const stateRef = useRef<GameState>({ ...initialGameState });
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseLandmarkerRef = useRef<{ detectForVideo: (video: HTMLVideoElement, time: number, cb: (r: { landmarks?: unknown[] }) => void) => void } | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const rafIdRef = useRef<number | null>(null);
  const endLockRef = useRef(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadMediaPipeRunIdRef = useRef(0);

  const getEl = useCallback((id: string) => document.getElementById(id), []);

  const showScreen = useCallback((name: 'home' | 'lobby' | 'game' | 'result' | 'report') => {
    setCurScreen(name);
    ['home', 'lobby', 'game', 'result', 'report'].forEach((n) => {
      const screenEl = document.getElementById('screen-' + n);
      if (screenEl) screenEl.classList.remove(styles.active);
    });
    const el = document.getElementById('screen-' + name);
    if (el) el.classList.add(styles.active);
    const canvas = canvasRef.current;
    if (canvas) {
      if (name === 'lobby' || name === 'game') canvas.classList.add(styles.visible);
      else canvas.classList.remove(styles.visible);
    }
  }, []);

  const feedback = useCallback((msg: string, warn = false) => {
    const el = getEl('game-feedback');
    if (!el) return;
    el.textContent = msg;
    el.style.color = warn ? 'var(--spokedu-red)' : 'var(--spokedu-primary)';
    el.style.opacity = '1';
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => { el.style.opacity = '0'; }, 1100);
  }, [getEl]);

  const comboFlash = useCallback(() => {
    const el = getEl('combo-flash');
    if (el) {
      el.classList.add(styles.flash);
      setTimeout(() => el.classList.remove(styles.flash), 160);
    }
  }, [getEl]);

  const addScore = useCallback((pi: number, pts: number) => {
    const s = stateRef.current;
    s.scores[pi] = (s.scores[pi] ?? 0) + pts;
    s.combo[pi] = (s.combo[pi] ?? 0) + 1;
    setScores([...s.scores]);
    SFX.hit();
    if ((s.combo[pi] ?? 0) % 5 === 0) {
      SFX.combo();
      comboFlash();
      const msgs = ['🔥 콤보!', '⚡ 연속 히트!', '💥 대박!', '🌟 환상적!'];
      feedback(msgs[Math.floor(Math.random() * msgs.length)]!);
    }
  }, [comboFlash, feedback]);

  const endGame = useCallback(() => {
    if (endLockRef.current) return;
    endLockRef.current = true;
    setTimeout(() => { endLockRef.current = false; }, 600);

    const s = stateRef.current;
    s.playing = false;
    s.paused = false;
    clearSmooth();
    clearTrails();
    clearParticles();
    setPauseVisible(false);
    const missionEl = getEl('mission-banner');
    if (missionEl) missionEl.classList.remove(styles.show);
    const extraEl = getEl('hud-extra');
    if (extraEl) extraEl.innerHTML = '';
    SFX.end();

    const now = new Date();
    const label = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    const avgRt = s.hitTimes.length
      ? Math.round(s.hitTimes.reduce((a, b) => a + b, 0) / s.hitTimes.length)
      : null;
    const pb = Store.getBest(s.mode ?? '');
    const rec: HistoryRecord = {
      date: label,
      mode: s.mode ?? 'speed',
      diff: s.diff,
      dur: s.dur,
      scores: [...s.scores],
      avgRt,
      total: s.scores.reduce((a, b) => a + b, 0),
    };
    Store.addRecord(rec);
    setResultRecord(rec);
    setIsNewPB(s.scores[0]! > pb);
    showScreen('result');
  }, [getEl, showScreen]);

  const onStateUpdate = useCallback((patch: Partial<GameState>) => {
    Object.assign(stateRef.current, patch);
    if (patch.scores != null) setScores(stateRef.current.scores);
  }, []);

  const initMode = useCallback(() => {
    const s = stateRef.current;
    onStateUpdate({
      targets: [],
      scores: [0, 0, 0],
      combo: [0, 0, 0],
      hitTimes: [],
      expectedNum: 1,
      targetShape: '',
    });
    setScores([0, 0, 0]);
    clearSmooth();
    clearTrails();
    clearParticles();

    const cfg = DIFF[s.diff];
    if (s.mode === 'speed') {
      for (let i = 0; i < cfg.spawn; i++) spawnSpeed(s, onStateUpdate);
    } else if (s.mode === 'sequence') {
      spawnSequence(s, onStateUpdate);
    } else if (s.mode === 'shape') {
      getEl('mission-banner')?.classList.add(styles.show);
      spawnShape(s, setMissionText, onStateUpdate);
    } else if (s.mode === 'moving') {
      for (let i = 0; i < 3; i++) spawnMoving(s, onStateUpdate);
    } else if (s.mode === 'balance') {
      getEl('mission-banner')?.classList.add(styles.show);
      nextBalancePose(s, getEl, onStateUpdate);
      const tpl = document.getElementById('balance-tpl');
      const extra = getEl('hud-extra');
      if (tpl && extra) {
        const clone = (tpl as HTMLTemplateElement).content.cloneNode(true);
        extra.innerHTML = '';
        extra.appendChild(clone);
      }
    } else if (s.mode === 'mirror') {
      getEl('mission-banner')?.classList.add(styles.show);
      nextMirrorPose(s, setMissionText, onStateUpdate);
    }
  }, [getEl, onStateUpdate]);

  const loadMediaPipe = useCallback(() => {
    const runId = ++loadMediaPipeRunIdRef.current;
    setCalibStatus({ text: 'AI 포즈 인식 엔진 로딩 중...', className: 'calib-wait' });

    void (async () => {
      try {
        const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
        if (runId !== loadMediaPipeRunIdRef.current) return;

        const wasmFileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_VISION_WASM_BASE);
        if (runId !== loadMediaPipeRunIdRef.current) return;

        const lm = await PoseLandmarker.createFromOptions(wasmFileset, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 3,
          minPoseDetectionConfidence: 0.55,
          minPosePresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });
        if (runId !== loadMediaPipeRunIdRef.current) return;
        poseLandmarkerRef.current = lm;
        stateRef.current.camReady = true;
        setLoaderVisible(false);
        setStartBtnVisible(true);
        setCalibStatus({ text: '✅ 준비 완료! 카메라 앞에 서주세요.', className: 'calib-ok' });
      } catch {
        if (runId !== loadMediaPipeRunIdRef.current) return;
        setCalibStatus({ text: '❌ AI 엔진 로드 실패. 새로고침 후 다시 시도해 주세요.', className: 'calib-err' });
        setLoaderVisible(false);
      }
    })();
  }, []);

  useEffect(() => {
    Store.initStore();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // 카메라 초기화 (로비 진입 시)
  useEffect(() => {
    if (curScreen !== 'lobby') return;
    const video = videoRef.current;
    if (!video) return;

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      .then((stream) => {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play().catch(() => {});
          loadMediaPipe();
        };
      })
      .catch((err) => {
        setLoaderVisible(false);
        let msg = '❌ 카메라 접근 실패';
        if (err.name === 'NotAllowedError') msg = '❌ 카메라 권한이 거부되었습니다. 주소창 자물쇠 → 카메라 → 허용 후 새로고침';
        else if (err.name === 'NotFoundError') msg = '❌ 카메라를 찾을 수 없습니다.';
        else if (err.name === 'NotReadableError') msg = '❌ 카메라가 다른 앱에서 사용 중입니다.';
        else msg = `❌ ${err.name}: ${err.message}`;
        setCalibStatus({ text: msg, className: 'calib-err' });
      });

    return () => {
      loadMediaPipeRunIdRef.current += 1;
    };
  }, [curScreen, loadMediaPipe]);

  // RAF 루프 (로비/게임 화면에서만)
  useEffect(() => {
    if (curScreen !== 'lobby' && curScreen !== 'game') return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !canvas.getContext('2d')) return;

    let running = true;

    function loop() {
      if (!running) return;
      rafIdRef.current = requestAnimationFrame(loop);

      const c = canvasRef.current;
      const v = videoRef.current;
      if (!c || !v) return;

      const cW = c.width;
      const cH = c.height;
      const vW = v.videoWidth;
      const vH = v.videoHeight;
      if (!vW || !vH) return;

      const scale = Math.max(cW / vW, cH / vH);
      const dW = vW * scale;
      const dH = vH * scale;
      const oX = (cW - dW) / 2;
      const oY = (cH - dH) / 2;
      const now = performance.now();

      const lm = poseLandmarkerRef.current;
      if (lm && lastVideoTimeRef.current !== v.currentTime) {
        lastVideoTimeRef.current = v.currentTime;
        lm.detectForVideo(v, now, (result) => {
          const ctx2 = c.getContext('2d');
          if (!ctx2) return;
          const landmarks = (result.landmarks ?? []) as { x: number; y: number; visibility?: number }[][];
          const keep = renderFrame(
            ctx2,
            v,
            stateRef.current,
            landmarks,
            cW,
            cH,
            dW,
            dH,
            oX,
            oY,
            now,
            {
              addScore,
              feedback,
              comboFlash,
              nextBalancePose: () => nextBalancePose(stateRef.current, getEl, onStateUpdate),
              nextMirrorPose: () => nextMirrorPose(stateRef.current, setMissionText, onStateUpdate),
              endGame,
              setMissionText,
              getElement: getEl,
              setHudTime,
              setHudWarn,
              getCanvasSize: () => ({ cW, cH }),
              onStateUpdate,
              onSpawnMovingLater: () => {
                const st = stateRef.current;
                if (st.playing && st.targets.length < 3) spawnMoving(st, onStateUpdate);
              },
            }
          );
          if (!keep) endGame();
        });
      }
    }

    loop();
    return () => {
      running = false;
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    };
  }, [curScreen, addScore, feedback, comboFlash, endGame, getEl, onStateUpdate]);

  const runCountdown = useCallback(() => {
    setCountdownVisible(true);
    let n = 3;
    function tick() {
      setCountdownNum(n === 0 ? 0 : n);
      SFX.tick(n);
      if (n === 0) {
        setTimeout(() => {
          setCountdownVisible(false);
          stateRef.current.playing = true;
          stateRef.current.paused = false;
          stateRef.current.timerStart = performance.now();
          stateRef.current.timerOffset = 0;
          initMode();
          showScreen('game');
        }, 600);
      } else {
        n--;
        setTimeout(tick, 900);
      }
    }
    tick();
  }, [initMode, showScreen]);

  const selectMode = useCallback((mode: string) => {
    const meta = MODE_META[mode];
    stateRef.current.mode = mode;
    setLobbyTitle((meta?.emoji ?? '') + ' ' + (meta?.label ?? ''));
    const descs: Record<string, string> = {
      speed: '화면 곳곳 별을 빠르게 터치하세요. 순발력과 자발적 몰입을 극대화합니다.',
      sequence: '숫자를 1부터 순서대로 터치하세요. 팀 협동으로 진행하면 더욱 효과적입니다.',
      shape: '미션 모양만 정확히 터치하세요. 틀린 모양을 건드리면 감점됩니다!',
      moving: '통통 튀는 별을 끝까지 추적해 잡아내세요. 전신 협응력을 극대화합니다.',
      balance: '화면이 알려주는 포즈를 2초간 유지하면 점수를 얻습니다.',
      mirror: '화면 실루엣 동작을 따라하세요. 포즈를 유지하면 점수를 얻습니다.',
    };
    setLobbyDesc(descs[mode] ?? '');

    const sv = Store.getSettings();
    const def = DEFAULT_SETTINGS;
    stateRef.current.diff = (sv.diff as DiffKey) ?? def.diff;
    setDiffDisplay((sv.diff as DiffKey) ?? def.diff);
    stateRef.current.dur = sv.dur != null ? Number(sv.dur) : def.dur;
    setDurDisplay(sv.dur != null ? Number(sv.dur) : def.dur);
    stateRef.current.multiOn = sv.multiOn !== undefined ? Boolean(sv.multiOn) : def.multiOn;
    setMultiDisplay(sv.multiOn !== undefined ? Boolean(sv.multiOn) : def.multiOn);
    stateRef.current.soundOn = sv.soundOn !== undefined ? Boolean(sv.soundOn) : def.soundOn;
    setSoundDisplay(sv.soundOn !== undefined ? Boolean(sv.soundOn) : def.soundOn);
    SFX.setOn(stateRef.current.soundOn);

    showScreen('lobby');
    if (stateRef.current.camReady) {
      setLoaderVisible(false);
      setStartBtnVisible(true);
      setCalibStatus({ text: '✅ 준비 완료! 카메라 앞에 서주세요.', className: 'calib-ok' });
    }
  }, [showScreen]);

  const setDiff = useCallback((d: DiffKey) => {
    stateRef.current.diff = d;
    setDiffDisplay(d);
    if (!Store.saveSettings({ diff: d })) {
      toast.error('설정 저장에 실패했습니다. 브라우저 설정을 확인해 주세요.');
    }
  }, []);

  const setDur = useCallback((d: number) => {
    stateRef.current.dur = d;
    setDurDisplay(d);
    if (!Store.saveSettings({ dur: d })) {
      toast.error('설정 저장에 실패했습니다. 브라우저 설정을 확인해 주세요.');
    }
  }, []);

  const setMulti = useCallback((v: boolean) => {
    stateRef.current.multiOn = v;
    setMultiDisplay(v);
    if (!Store.saveSettings({ multiOn: v })) {
      toast.error('설정 저장에 실패했습니다. 브라우저 설정을 확인해 주세요.');
    }
  }, []);

  const setSound = useCallback((v: boolean) => {
    stateRef.current.soundOn = v;
    setSoundDisplay(v);
    SFX.setOn(v);
    if (!Store.saveSettings({ soundOn: v })) {
      toast.error('설정 저장에 실패했습니다. 브라우저 설정을 확인해 주세요.');
    }
  }, []);

  const goHome = useCallback(() => {
    stateRef.current.playing = false;
    stateRef.current.paused = false;
    stateRef.current.targets = [];
    clearSmooth();
    clearTrails();
    clearParticles();
    setPauseVisible(false);
    getEl('mission-banner')?.classList.remove(styles.show);
    const ex = getEl('hud-extra');
    if (ex) ex.innerHTML = '';
    showScreen('home');
  }, [getEl, showScreen]);

  const pause = useCallback(() => {
    if (!stateRef.current.playing || stateRef.current.paused) return;
    stateRef.current.paused = true;
    stateRef.current.timerOffset += performance.now() - stateRef.current.timerStart;
    setPauseVisible(true);
  }, []);

  const resume = useCallback(() => {
    if (!stateRef.current.paused) return;
    stateRef.current.paused = false;
    stateRef.current.timerStart = performance.now();
    setPauseVisible(false);
  }, []);

  const restartGame = useCallback(() => {
    stateRef.current.targets = [];
    clearSmooth();
    clearTrails();
    clearParticles();
    getEl('mission-banner')?.classList.remove(styles.show);
    const ex = getEl('hud-extra');
    if (ex) ex.innerHTML = '';
    runCountdown();
  }, [getEl, runCountdown]);

  const renderReport = useCallback(() => {
    const hist = Store.getHistory();
    const n = hist.length;
    const comments = [
      '아직 기록이 없습니다. 즐거운 신체활동을 시작해 보세요!',
      'SPOKEDU와의 첫 만남! 자발적인 움직임(Play)이 시작되었습니다.',
      '벌써 두 번째 참여! 반복을 통해 시각적 판단력이 발달하고 있습니다.',
      `벌써 ${n}번째 참여! 꾸준한 반복으로 순발력과 집중력이 눈에 띄게 발달하고 있습니다.`,
      `대단합니다! ${n}회 참여를 통해 전신 협응력과 인지 판단력이 완벽한 조화를 이루고 있습니다!`,
    ];
    const expertEl = getEl('expert-msg');
    if (expertEl) expertEl.textContent = comments[n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n < 8 ? 3 : 4]!;

    const playsEl = getEl('st-plays');
    if (playsEl) playsEl.textContent = String(n);
    const p1s = hist.map((h) => h.scores[0]);
    const bestEl = getEl('st-best');
    if (bestEl) bestEl.textContent = String(p1s.length ? Math.max(...p1s) : 0);
    const rts = hist.filter((h) => h.avgRt != null).map((h) => h.avgRt!);
    const rtEl = getEl('st-rt');
    if (rtEl) rtEl.textContent = rts.length ? String(Math.round(rts.reduce((a, b) => a + b, 0) / rts.length)) : '—';

    const listEl = getEl('history-list');
    if (!listEl) return;
    if (n === 0) {
      listEl.innerHTML = `<p class="${styles['text-center']} ${styles['text-muted']}" style="padding:2rem 0">기록이 없습니다.</p>`;
      return;
    }
    const mc: Record<string, string> = { speed: 'var(--spokedu-primary)', sequence: 'var(--spokedu-green)', shape: 'var(--spokedu-purple)', moving: 'var(--spokedu-orange)', balance: 'var(--spokedu-cyan)', mirror: 'var(--spokedu-pink)' };
    const pc = ['var(--spokedu-primary)', 'var(--spokedu-yellow)', 'var(--spokedu-green)'];
    const hi = styles['h-item'];
    const hd = styles['h-date'];
    const hm = styles['h-mode'];
    const hs = styles['h-scores'];
    const hc = styles['h-chip'];
    const hcl = styles['h-chip-lbl'];
    const hcv = styles['h-chip-val'];
    const tsm = styles['text-sm'];
    const tmu = styles['text-muted'];
    listEl.innerHTML = hist
      .map((h) => {
        const meta = MODE_META[h.mode];
        const chips = h.scores.map((s, si) => (s > 0 ? `<div class="${hc}"><span class="${hcl}" style="color:${pc[si]}">P${si + 1}</span><span class="${hcv}">${s}</span></div>` : '')).join('');
        const rtxt = h.avgRt ? `<span class="${tsm} ${tmu}" style="margin-left:.3rem">⚡${h.avgRt}ms</span>` : '';
        return `<div class="${hi}"><div><div class="${hd}">${h.date} · ${h.diff || '보통'} · ${h.dur || 30}초</div><div class="${hm}" style="color:${mc[h.mode] ?? ''}">${meta?.emoji ?? ''} ${meta?.label ?? ''}</div>${rtxt}</div><div class="${hs}">${chips}</div></div>`;
      })
      .join('');

    requestAnimationFrame(() => {
      const c = document.getElementById('chartCanvas') as HTMLCanvasElement | null;
      if (!c) return;
      const cx = c.getContext('2d');
      if (!cx) return;
      const histSlice = hist.slice(0, 12).reverse();
      const W = c.offsetWidth || 700;
      const H = 140;
      c.width = W;
      c.height = H;
      if (histSlice.length < 2) {
        cx.fillStyle = '#94A3B8';
        cx.font = '13px Noto Sans KR,sans-serif';
        cx.textAlign = 'center';
        cx.fillText('2회 이상 플레이하면 성장 그래프가 표시됩니다', W / 2, H / 2);
        return;
      }
      const scores = histSlice.map((h) => h.scores[0]);
      const maxS = Math.max(...scores) || 1;
      const pad = { t: 18, b: 28, l: 32, r: 16 };
      const gW = W - pad.l - pad.r;
      const gH = H - pad.t - pad.b;
      cx.strokeStyle = '#F1F5F9';
      cx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const gy = pad.t + (gH / 4) * i;
        cx.beginPath();
        cx.moveTo(pad.l, gy);
        cx.lineTo(W - pad.r, gy);
        cx.stroke();
      }
      const pts = scores.map((s, i) => ({
        x: pad.l + (gW / (scores.length - 1)) * i,
        y: pad.t + gH - (s / maxS) * gH,
      }));
      cx.beginPath();
      cx.moveTo(pts[0]!.x, H - pad.b);
      pts.forEach((p) => cx.lineTo(p.x, p.y));
      cx.lineTo(pts[pts.length - 1]!.x, H - pad.b);
      cx.closePath();
      const grad = cx.createLinearGradient(0, pad.t, 0, H - pad.b);
      grad.addColorStop(0, 'rgba(37,99,235,0.2)');
      grad.addColorStop(1, 'rgba(37,99,235,0)');
      cx.fillStyle = grad;
      cx.fill();
      cx.beginPath();
      cx.moveTo(pts[0]!.x, pts[0]!.y);
      pts.forEach((p, i) => { if (i > 0) cx.lineTo(p.x, p.y); });
      cx.strokeStyle = '#2563EB';
      cx.lineWidth = 2.5;
      cx.lineJoin = 'round';
      cx.stroke();
      pts.forEach((p, i) => {
        cx.beginPath();
        cx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        cx.fillStyle = '#fff';
        cx.fill();
        cx.strokeStyle = '#2563EB';
        cx.lineWidth = 2.5;
        cx.stroke();
        cx.fillStyle = '#475569';
        cx.font = '11px Nunito,sans-serif';
        cx.textAlign = 'center';
        cx.fillText(String(scores[i]), p.x, p.y - 8);
        cx.fillStyle = '#94A3B8';
        cx.font = '10px Noto Sans KR,sans-serif';
        cx.fillText(histSlice[i]!.date.split(' ')[0] ?? '', p.x, H - 6);
      });
    });
  }, [getEl]);

  const showReport = useCallback(() => {
    renderReport();
    showScreen('report');
  }, [renderReport, showScreen]);

  const clearHistory = useCallback(() => {
    if (typeof window === 'undefined' || !window.confirm('모든 기록을 삭제하시겠습니까?')) return;
    Store.clearHistory();
    renderReport();
  }, [renderReport]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (curScreen === 'game') {
        if (stateRef.current.paused) resume();
        else pause();
        return;
      }
      if (curScreen === 'lobby' || curScreen === 'result' || curScreen === 'report') {
        e.preventDefault();
        goHome();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [curScreen, pause, resume, goHome]);

  const handleClearHistory = useCallback(() => {
    if (typeof window === 'undefined' || !window.confirm('모든 기록을 삭제하시겠습니까?')) return;
    Store.clearHistory();
    renderReport();
  }, [renderReport]);

  return (
    <div className={styles.root}>
      <video id="videoEl" ref={videoRef} autoPlay playsInline muted />
      <canvas id="gameCanvas" ref={canvasRef} />
      <div id="combo-flash" />

      <HomeScreen active={curScreen === 'home'} onSelectMode={selectMode} onShowReport={showReport} />
      <LobbyScreen
        active={curScreen === 'lobby'}
        title={lobbyTitle}
        desc={lobbyDesc}
        calibStatus={calibStatus}
        loaderVisible={loaderVisible}
        startBtnVisible={startBtnVisible}
        diff={diffDisplay}
        dur={durDisplay}
        multiOn={multiDisplay}
        soundOn={soundDisplay}
        onSetDiff={setDiff}
        onSetDur={setDur}
        onSetMulti={setMulti}
        onSetSound={setSound}
        onGoHome={goHome}
        onStart={runCountdown}
      />
      <div id="countdown-overlay" className={countdownVisible ? styles.active : ''} style={{ display: countdownVisible ? 'flex' : 'none' }}>
        <div id="countdown-num">{countdownNum === 0 ? 'GO!' : countdownNum}</div>
      </div>
      <GameHUD
        active={curScreen === 'game'}
        hudTime={hudTime}
        hudWarn={hudWarn}
        missionText={missionText}
        showMissionBanner={stateRef.current.mode === 'shape' || stateRef.current.mode === 'balance' || stateRef.current.mode === 'mirror'}
        scores={scores}
        multiOn={multiDisplay}
        onPause={pause}
      />
      <div id="game-feedback" />
      <div id="pause-overlay" className={pauseVisible ? styles.active : ''} style={{ display: pauseVisible ? 'flex' : 'none' }}>
        <div className={`${styles.card} ${styles['pause-card']}`}>
          <div className={styles['pause-icon']}>⏸</div>
          <div className={styles['pause-title']}>일시정지</div>
          <div className={styles['pause-sub']}>잠깐 쉬어가세요. 언제든 재개할 수 있습니다.</div>
          <div className={styles['pause-acts']}>
            <button type="button" className={`${styles.btn} ${styles['btn-danger']}`} onClick={endGame}>종료</button>
            <button type="button" className={`${styles.btn} ${styles['btn-primary']} ${styles['btn-lg']}`} onClick={resume}>▶ 계속하기</button>
          </div>
        </div>
      </div>
      <ResultScreen
        active={curScreen === 'result'}
        record={resultRecord}
        multiOn={multiDisplay}
        isNewPB={isNewPB}
        onGoHome={goHome}
        onRestart={restartGame}
        onShowReport={showReport}
      />
      <ReportScreen active={curScreen === 'report'} onClearHistory={handleClearHistory} onGoHome={goHome} />
      <template id="balance-tpl">
        <div className={styles['hud-card']} style={{ width: '100%', maxWidth: 400, pointerEvents: 'none' }}>
          <div className={styles['hud-lbl']}>포즈 유지</div>
          <div style={{ height: '.625rem', background: '#E2E8F0', borderRadius: '2rem', overflow: 'hidden', marginTop: '.35rem' }}>
            <div id="pose-bar" style={{ height: '100%', background: 'linear-gradient(90deg,var(--spokedu-cyan),var(--spokedu-primary))', borderRadius: '2rem', width: '0%', transition: 'width .1s linear' }} />
          </div>
          <div id="pose-name" style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--spokedu-cyan)', marginTop: '.3rem', fontFamily: 'var(--spokedu-fko)', lineHeight: 1.4, whiteSpace: 'normal' }}>포즈 준비 중...</div>
        </div>
      </template>
    </div>
  );
}
