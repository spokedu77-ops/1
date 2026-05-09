'use client';

/**
 * SPOKEDU 카메라 앱 — 화면 라우팅 + 카메라/MediaPipe/RAF 초기화만 담당
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { DIFF, MODE_META, DEFAULT_SETTINGS, MAX_CAMERA_PARTICIPANTS } from './constants';
import type { CameraModeId, DiffKey } from './constants';
import * as Store from './store';
import type {
  CameraControlEnvelope,
  CameraControlPhase,
  CameraParticipantSlot,
  CameraControlSessionDraft,
  CameraParticipantMode,
  CameraPlayerStateSnapshot,
  CameraSettings,
  HistoryRecord,
} from './types';
import { SFX } from './sfx';
import { buildActivitySavePayloadFromRecord } from './resultModel';
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

/** iOS Safari / 모바일 여부 감지 (GPU 델리게이트 미지원) */
function isIOSorSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Safari/.test(ua) && !/Chrome/.test(ua));
}

/** GPU 델리게이트 시도에 타임아웃을 건다 — iOS에서 WebGL이 hung 상태로 빠지는 경우 대비 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)
    ),
  ]);
}

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
  const [controlSession, setControlSession] = useState<CameraControlSessionDraft | null>(null);
  const [controlStatus, setControlStatus] = useState('모바일 컨트롤러 연결 준비');
  const [controlBusy, setControlBusy] = useState(false);
  const [resultSaveStatus, setResultSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');

  const stateRef = useRef<GameState>({ ...initialGameState });
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const poseLandmarkerRef = useRef<{ detectForVideo: (video: HTMLVideoElement, time: number, cb: (r: { landmarks?: unknown[] }) => void) => void } | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const rafIdRef = useRef<number | null>(null);
  const endLockRef = useRef(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadMediaPipeRunIdRef = useRef(0);
  const lastAppliedCommandIdRef = useRef<string | null>(null);
  const participantSlotsRef = useRef<CameraParticipantSlot[]>([]);

  const getEl = useCallback((id: string) => document.getElementById(id), []);

  const getCurrentSettings = useCallback((): CameraSettings => {
    const s = stateRef.current;
    return {
      diff: s.diff,
      dur: s.dur,
      multiOn: s.multiOn,
      soundOn: s.soundOn,
      participantSlots: participantSlotsRef.current,
    };
  }, []);

  const getControlPhase = useCallback((): CameraControlPhase => {
    const s = stateRef.current;
    if (curScreen === 'result') return 'ended';
    if (s.playing && s.paused) return 'paused';
    if (s.playing) return 'running';
    if (curScreen === 'lobby') return 'ready';
    return 'idle';
  }, [curScreen]);

  const getParticipantMode = useCallback((): CameraParticipantMode => {
    return stateRef.current.multiOn ? 'multi' : 'solo';
  }, []);

  const getPlayerSnapshot = useCallback((): CameraPlayerStateSnapshot => ({
    phase: getControlPhase(),
    mode: stateRef.current.mode,
    settings: getCurrentSettings(),
    participantMode: getParticipantMode(),
    lastResultId: resultRecord ? `${resultRecord.date}-${resultRecord.mode}-${resultRecord.total}` : null,
    updatedAt: new Date().toISOString(),
  }), [getControlPhase, getCurrentSettings, getParticipantMode, resultRecord]);

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

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const syncPlayerViewport = () => {
      const vv = window.visualViewport;
      const width = Math.round(vv?.width ?? window.innerWidth);
      const height = Math.round(vv?.height ?? window.innerHeight);
      root.style.width = `${Math.max(1, width)}px`;
      root.style.height = `${Math.max(1, height)}px`;
      root.style.maxWidth = `${Math.max(1, width)}px`;
      root.style.maxHeight = `${Math.max(1, height)}px`;
      document.documentElement.style.setProperty('--viewport-height-px', `${Math.max(1, height)}px`);
    };

    syncPlayerViewport();
    window.addEventListener('resize', syncPlayerViewport);
    window.addEventListener('orientationchange', syncPlayerViewport);
    window.visualViewport?.addEventListener('resize', syncPlayerViewport);
    window.visualViewport?.addEventListener('scroll', syncPlayerViewport);
    return () => {
      window.removeEventListener('resize', syncPlayerViewport);
      window.removeEventListener('orientationchange', syncPlayerViewport);
      window.visualViewport?.removeEventListener('resize', syncPlayerViewport);
      window.visualViewport?.removeEventListener('scroll', syncPlayerViewport);
    };
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

  const saveActivityResult = useCallback(async (record: HistoryRecord) => {
    setResultSaveStatus('saving');
    const video = videoRef.current;
    const root = rootRef.current;
    const payload = buildActivitySavePayloadFromRecord(record, getCurrentSettings(), {
      teacherId: null,
      device: {
        role: 'player',
        viewport: root ? { width: Math.round(root.clientWidth), height: Math.round(root.clientHeight) } : undefined,
        screen: typeof window !== 'undefined' ? { width: window.screen.width, height: window.screen.height } : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        camera: video ? { videoWidth: video.videoWidth, videoHeight: video.videoHeight } : undefined,
        pose: { model: 'pose_landmarker_lite', delegate: isIOSorSafari() ? 'CPU' : 'GPU' },
      },
      endedAt: new Date().toISOString(),
    });

    try {
      const res = await fetch('/api/admin/camera/activity-results', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setResultSaveStatus('failed');
        return;
      }
      setResultSaveStatus('saved');
    } catch {
      setResultSaveStatus('failed');
    }
  }, [getCurrentSettings]);

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
    const mode = s.mode ?? 'speed';
    const pb = Store.getBest(mode);
    const rec: HistoryRecord = {
      date: label,
      mode,
      diff: s.diff,
      dur: s.dur,
      scores: [...s.scores],
      participantSlots: participantSlotsRef.current,
      avgRt,
      total: s.scores.reduce((a, b) => a + b, 0),
    };
    Store.addRecord(rec);
    setResultRecord(rec);
    void saveActivityResult(rec);
    setIsNewPB(s.scores[0]! > pb);
    showScreen('result');
  }, [getEl, saveActivityResult, showScreen]);

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

        const mobile = isIOSorSafari();

        // 모바일/iOS는 lite 모델 + CPU, 데스크톱은 full 모델 + GPU 우선
        const modelPath = mobile
          ? 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
          : 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';

        const buildOptions = (delegate: 'GPU' | 'CPU') =>
          PoseLandmarker.createFromOptions(wasmFileset, {
            baseOptions: { modelAssetPath: modelPath, delegate },
            runningMode: 'VIDEO',
            numPoses: MAX_CAMERA_PARTICIPANTS,
            minPoseDetectionConfidence: 0.55,
            minPosePresenceConfidence: 0.55,
            minTrackingConfidence: 0.55,
          });

        let lm: Awaited<ReturnType<typeof buildOptions>>;

        if (mobile) {
          // iOS Safari는 GPU 델리게이트가 hung 상태가 되므로 CPU로 바로 시작
          lm = await buildOptions('CPU');
        } else {
          // 데스크톱: GPU 우선, 30초 내 실패 시 CPU로 재시도
          try {
            lm = await withTimeout(buildOptions('GPU'), 30_000);
          } catch {
            if (runId !== loadMediaPipeRunIdRef.current) return;
            setCalibStatus({ text: 'GPU 초기화 실패, CPU 모드로 재시도 중...', className: 'calib-wait' });
            lm = await buildOptions('CPU');
          }
        }

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
    const root = rootRef.current;
    if (!canvas || !root) return;

    /**
     * 캔버스 비트맵을 실제로 보이는 루트 박스와 1:1로 맞춘다.
     * iPad Safari/PWA에서는 offsetHeight가 주소창/viewport 전환 중 낡은 값을 줄 수 있어
     * getBoundingClientRect와 visualViewport를 같이 본다.
     */
    const syncCanvasBitmap = () => {
      const rect = root.getBoundingClientRect();
      const vv = window.visualViewport;
      const visibleWidth = Math.round(vv?.width ?? window.innerWidth);
      const visibleHeight = Math.round(vv?.height ?? window.innerHeight);
      const w = Math.max(1, Math.min(Math.round(rect.width || visibleWidth), visibleWidth));
      const h = Math.max(1, Math.min(Math.round(rect.height || visibleHeight), visibleHeight));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    syncCanvasBitmap();
    const ro = new ResizeObserver(() => syncCanvasBitmap());
    ro.observe(root);
    window.addEventListener('resize', syncCanvasBitmap);
    window.addEventListener('orientationchange', syncCanvasBitmap);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', syncCanvasBitmap);
    vv?.addEventListener('scroll', syncCanvasBitmap);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', syncCanvasBitmap);
      window.removeEventListener('orientationchange', syncCanvasBitmap);
      vv?.removeEventListener('resize', syncCanvasBitmap);
      vv?.removeEventListener('scroll', syncCanvasBitmap);
    };
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

  const selectMode = useCallback((mode: CameraModeId) => {
    const meta = MODE_META[mode];
    stateRef.current.mode = mode;
    setLobbyTitle((meta?.emoji ?? '') + ' ' + (meta?.label ?? ''));
    const descs: Record<CameraModeId, string> = {
      speed: '화면 곳곳 별을 빠르게 터치하세요. 순발력과 자발적 몰입을 극대화합니다.',
      sequence: '숫자를 1부터 순서대로 터치하세요. 팀 협동으로 진행하면 더욱 효과적입니다.',
      shape: '미션 모양만 정확히 터치하세요. 틀린 모양을 건드리면 감점됩니다!',
      moving: '통통 튀는 별을 끝까지 추적해 잡아내세요. 전신 협응력을 극대화합니다.',
      balance: '화면이 알려주는 포즈를 2초간 유지하면 점수를 얻습니다.',
      mirror: '화면 실루엣 동작을 따라하세요. 포즈를 유지하면 점수를 얻습니다.',
    };
    setLobbyDesc(descs[mode] ?? '');

    const sv = Store.getSettings();
    stateRef.current.diff = sv.diff;
    setDiffDisplay(sv.diff);
    stateRef.current.dur = sv.dur;
    setDurDisplay(sv.dur);
    stateRef.current.multiOn = sv.multiOn;
    setMultiDisplay(sv.multiOn);
    stateRef.current.soundOn = sv.soundOn;
    setSoundDisplay(sv.soundOn);
    participantSlotsRef.current = sv.participantSlots ?? [];
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

  const setParticipantSlots = useCallback((slots: CameraParticipantSlot[]) => {
    participantSlotsRef.current = slots;
    if (!Store.saveSettings({ participantSlots: slots })) {
      toast.error('설정 저장에 실패했습니다.');
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

  void clearHistory;

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

  const createControlSession = useCallback(async () => {
    setControlBusy(true);
    setControlStatus('연결 코드를 만드는 중...');
    try {
      const res = await fetch('/api/admin/camera/control-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          playerState: getPlayerSnapshot(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setControlStatus(typeof json?.error === 'string' ? json.error : '코드 생성 실패');
        return;
      }
      setControlSession(json.session as CameraControlSessionDraft);
      setControlStatus('모바일에서 이 코드를 입력하세요.');
    } catch {
      setControlStatus('네트워크 오류로 코드를 만들지 못했습니다.');
    } finally {
      setControlBusy(false);
    }
  }, [getPlayerSnapshot]);

  const applyRemoteCommand = useCallback((envelope: CameraControlEnvelope) => {
    const command = envelope.command;
    if (command.type === 'selectMode') {
      selectMode(command.mode);
      return;
    }
    if (command.type === 'applyContentPack') {
      selectMode(command.mode);
      if (command.settings.diff) setDiff(command.settings.diff);
      if (typeof command.settings.dur === 'number') setDur(command.settings.dur);
      if (typeof command.settings.multiOn === 'boolean') setMulti(command.settings.multiOn);
      if (typeof command.settings.soundOn === 'boolean') setSound(command.settings.soundOn);
      if (Array.isArray(command.settings.participantSlots)) setParticipantSlots(command.settings.participantSlots);
      return;
    }
    if (command.type === 'updateSettings') {
      if (command.settings.diff) setDiff(command.settings.diff);
      if (typeof command.settings.dur === 'number') setDur(command.settings.dur);
      if (typeof command.settings.multiOn === 'boolean') setMulti(command.settings.multiOn);
      if (typeof command.settings.soundOn === 'boolean') setSound(command.settings.soundOn);
      if (Array.isArray(command.settings.participantSlots)) setParticipantSlots(command.settings.participantSlots);
      return;
    }
    if (command.type === 'start') {
      if (curScreen !== 'game') runCountdown();
      return;
    }
    if (command.type === 'pause') {
      pause();
      return;
    }
    if (command.type === 'resume') {
      resume();
      return;
    }
    if (command.type === 'end') {
      endGame();
      return;
    }
    if (command.type === 'reset') {
      goHome();
    }
  }, [curScreen, endGame, goHome, pause, resume, runCountdown, selectMode, setDiff, setDur, setMulti, setParticipantSlots, setSound]);

  useEffect(() => {
    if (!controlSession?.id) return;

    let cancelled = false;
    let polling = false;

    const poll = async () => {
      if (polling || cancelled) return;
      polling = true;
      try {
        const res = await fetch(`/api/admin/camera/control-session?id=${encodeURIComponent(controlSession.id)}`, {
          cache: 'no-store',
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setControlStatus(typeof json?.error === 'string' ? json.error : '컨트롤 세션 확인 실패');
          return;
        }

        const session = json.session as CameraControlSessionDraft;
        if (cancelled || !session) return;
        setControlSession(session);

        const command = session.lastCommand;
        const commandId = command?.commandId ?? session.lastCommandId;
        if (command && commandId && commandId !== lastAppliedCommandIdRef.current && commandId !== session.lastAckCommandId) {
          lastAppliedCommandIdRef.current = commandId;
          applyRemoteCommand(command);

          const ack = await fetch('/api/admin/camera/control-session', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              action: 'ack',
              id: session.id,
              commandId,
              playerState: getPlayerSnapshot(),
            }),
          });
          if (ack.ok && !cancelled) {
            const ackJson = await ack.json().catch(() => ({}));
            if (ackJson.session) setControlSession(ackJson.session as CameraControlSessionDraft);
          }
        }

        if (!cancelled) {
          setControlStatus(session.status === 'paired' || session.status === 'active' ? '모바일 컨트롤러 연결됨' : '모바일에서 코드를 입력하세요.');
        }
      } catch {
        if (!cancelled) setControlStatus('컨트롤 세션 네트워크 확인 실패');
      } finally {
        polling = false;
      }
    };

    void poll();
    const id = window.setInterval(() => void poll(), 900);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [applyRemoteCommand, controlSession?.id, getPlayerSnapshot]);

  return (
    <div ref={rootRef} className={styles.root} data-screen={curScreen}>
      <video
        id="videoEl"
        ref={videoRef}
        autoPlay
        playsInline
        muted
        hidden
        aria-hidden="true"
        tabIndex={-1}
        style={{
          display: 'none',
          position: 'fixed',
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
          transform: 'translate(-100vw, -100vh)',
        }}
      />
      <canvas
        id="gameCanvas"
        ref={canvasRef}
        aria-hidden={curScreen !== 'lobby' && curScreen !== 'game'}
        style={{ display: curScreen === 'lobby' || curScreen === 'game' ? 'block' : 'none' }}
      />
      <div id="combo-flash" />
      <div className={styles['control-pairing']}>
        <div>
          <span>Mobile Controller</span>
          <strong>{controlSession?.code ?? '-----'}</strong>
          <p>{controlStatus}</p>
          <small>/admin/camera/control</small>
        </div>
        <button type="button" onClick={createControlSession} disabled={controlBusy}>
          {controlBusy ? '생성 중' : controlSession ? '새 코드' : '코드 생성'}
        </button>
      </div>

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
        saveStatus={resultSaveStatus}
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
