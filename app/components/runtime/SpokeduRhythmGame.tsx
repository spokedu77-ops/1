'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RefreshCw,
  Settings,
  Edit3,
  Check,
  Music,
  Image as ImageIcon,
  X,
  Zap,
  Megaphone,
  Lightbulb,
  AlertCircle,
  ArrowRight,
  Ear,
  Mic,
} from 'lucide-react';
import { preloadChallengeBGM, startChallengeBGM, stopChallengeBGM } from '@/app/lib/admin/audio/challengeBGM';

export interface SpokeduRhythmGameProps {
  soundOn?: boolean;
  allowEdit?: boolean;
  bgmPath?: string;
  /** BGM 원곡 BPM. 있으면 재생 속도 = 화면 BPM / 이 값 (한 곡을 여러 BPM에 맞춰 재생) */
  bgmSourceBpm?: number | null;
  initialBpm?: number;
  initialLevel?: number;
  initialGrid?: string[];
  /** 1~4단계 그리드 전체 (있으면 initialLevel/initialGrid 대신 사용) */
  initialLevelData?: Record<number, string[]>;
  onEnd?: () => void;
  onPresetChange?: (data: { bpm: number; level: number; grid: string[]; gridsByLevel?: Record<number, string[]> }) => void;
  /** true면 BPM 조절 불가(주차 픽스·BGM 비트 맞출 때 사용) */
  lockBpm?: boolean;
  /** true면 마운트 후 재생 버튼 없이 바로 카운트다운·플레이 시작 (구독자 전체 재생 등) */
  autoStart?: boolean;
}

const MAX_LEVELS = 4;
const ROUNDS_PER_LEVEL = 4;
const BEATS_PER_PHASE = 8;
const BEATS_PER_ROUND = 16;
/** 허용 BPM (4종). 미지원 값(80/160 등)은 초기화 시 100으로 정규화됨. */
const bpmOptions = [100, 120, 150, 180];
/** 180 선택 시 1단계 21.05초 동기화용 미세조정. 플레이 화면에는 180만 노출. */
const BPM_180_SYNC = 182.4;
/** 150 선택 시 정박 미세조정. 3~4단계 살짝 밀림 보정용으로 소폭 상향. */
const BPM_150_SYNC = 150.5;
function getEffectiveBpm(displayBpm: number): number {
  if (displayBpm === 180) return BPM_180_SYNC;
  if (displayBpm === 150) return BPM_150_SYNC;
  return displayBpm;
}
const SCHEDULE_AHEAD_TIME = 0.1;
/** BGM play() 후 실제 스피커 출력까지 지연 보정(초). 환경에 따라 0.03~0.08 정도. */
const BGM_OUTPUT_LATENCY = 0.04;

/** 1단계 시작 전 고정 카운트다운(ms). 끝나면 노래·영상 동시 시작. */
const INITIAL_COUNTDOWN_MS = 3000;
/** 레벨 사이: rest 3초만 표시 후 바로 다음 단계. 2단계부터 카운트다운 없음. */
const BETWEEN_LEVEL_MS = 3000;
/** 3초 카운트다운에서 4,3,2,1 표시 간격(ms). */
const COUNTDOWN_TICK_MS = 750;

/** 레벨 완료 → 다음 beat 0까지 rest 3초 고정. */
function getTransitionDurationMs(_bpm: number, _bgmSourceBpm?: number | null): number {
  return BETWEEN_LEVEL_MS;
}

/** 초반 3초 + 4단계 플레이(256비트) + 3회 전환(6초) + 아웃트로(0.6s) 총 재생 시간(초). 오프셋 없음. */
function getTotalChallengeDurationSec(bpm: number, _bgmSourceBpm?: number | null): number {
  const beatSec = 60 / bpm;
  const levelBeats = MAX_LEVELS * ROUNDS_PER_LEVEL * BEATS_PER_ROUND;
  return (
    INITIAL_COUNTDOWN_MS / 1000 +
    levelBeats * beatSec +
    3 * (BETWEEN_LEVEL_MS / 1000) +
    0.6
  );
}

/** 각 단계 첫 페이지 = 룰(8칸 구성). 2~5라운드는 이 배열을 셔플만 함. */
const defaultLevels: Record<number, string[]> = {
  1: ['앞', '뒤', '앞', '뒤', '앞', '뒤', '앞', '뒤'], // 1단계: 앞/뒤만
  2: ['앞', '뒤', '앞', '뒤', '앞', '뒤', '오른쪽', '왼쪽'], // 2단계: 앞/뒤 6, 오른쪽/왼쪽 2
  3: ['앞', '뒤', '앞', '뒤', '오른쪽', '왼쪽', '오른쪽', '왼쪽'], // 3단계: 앞/뒤 4, 오른쪽/왼쪽 4
  4: ['앞', '뒤', '오른쪽', '왼쪽', '오른쪽', '왼쪽', '좌우', '앞뒤'], // 4단계: 앞/뒤 2, 오른쪽/왼쪽 4, 좌우 1, 앞뒤 1
};

export function SpokeduRhythmGame({
  soundOn = false,
  allowEdit = true,
  bgmPath,
  bgmSourceBpm,
  initialBpm,
  initialLevel,
  initialGrid,
  initialLevelData,
  onEnd,
  onPresetChange,
  lockBpm = false,
  autoStart = false,
}: SpokeduRhythmGameProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  /** 4단계 종료 후 rest 구간(큰 숫자 1 숨김 + 아웃트로 직전). finishGame()에서만 isFinishingRef 설정. */
  const [isFinishingRest, setIsFinishingRest] = useState(false);
  const isFinishingRestRef = useRef(false);
  /** 레벨 사이 rest 3초 동안 표시할 카운트다운 (3 → 2 → 1). null이면 표시 안 함. */
  const [restCountdown, setRestCountdown] = useState<number | null>(null);

  const [currentBeat, setCurrentBeat] = useState(-1);
  const [roundInLevel, setRoundInLevel] = useState(1);
  const [currentLevel, setCurrentLevel] = useState(() =>
    Math.min(MAX_LEVELS, Math.max(1, initialLevel ?? 1))
  );
  const [totalBeatsPlayed, setTotalBeatsPlayed] = useState(0);

  const [bpm, setBpm] = useState(() => {
    const v = initialBpm ?? 100;
    if (typeof v === 'number' && Math.abs(v - BPM_180_SYNC) < 0.5) return 180;
    if (typeof v === 'number' && Math.abs(v - BPM_150_SYNC) < 0.5) return 150;
    return bpmOptions.includes(v) ? v : 100;
  });
  const [isEditing, setIsEditing] = useState(false);

  const nextNoteTimeRef = useRef(0.0);
  /** 스케줄러 시작 시각(AudioContext). 매 비트를 startTime + beatIndex*beatSec 로 계산해 누적 오차 제거. */
  const schedulerStartTimeRef = useRef(0.0);
  const currentBeatIndexRef = useRef(0);
  const levelRoundCountRef = useRef(1);
  const timerIDRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const bpmRef = useRef(bpm);
  const bgmSourceBpmRef = useRef(bgmSourceBpm);
  const runIdRef = useRef(0);
  const isFinishingRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const isPlayingRef = useRef(false);
  const startCountdownRef = useRef<() => void>(() => {});
  const schedulerRef = useRef<() => void>(() => {});
  const hasAutoStartedRef = useRef(false);
  /** 초반 3초 카운트다운 끝에 호출(스케줄러 시작 직전). BGM 재생을 여기서 하면 노래·영상 동시 시작 보장. */
  const onCountdownEndRef = useRef<(() => void) | null>(null);

  const [levelData, setLevelData] = useState<Record<number, string[]>>(() => {
    const base = { ...defaultLevels };
    if (initialLevelData && typeof initialLevelData === 'object') {
      for (let lv = 1; lv <= MAX_LEVELS; lv++) {
        if (Array.isArray(initialLevelData[lv]) && initialLevelData[lv].length > 0) {
          base[lv] = initialLevelData[lv].slice(0, 8);
        }
      }
    } else if (initialGrid != null && initialLevel != null) {
      base[initialLevel] = [...initialGrid];
    }
    return base;
  });
  const [shuffledGrid, setShuffledGrid] = useState<string[]>(() => {
    const firstGrid =
      initialLevelData && Array.isArray(initialLevelData[1]) && initialLevelData[1].length > 0
        ? initialLevelData[1]
        : initialGrid ?? defaultLevels[initialLevel ?? 1] ?? defaultLevels[1];
    return [...firstGrid];
  });

  const currentLevelRef = useRef(currentLevel);
  const levelDataRef = useRef(levelData);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetIndex, setUploadTargetIndex] = useState<number | null>(null);
  const [composingCell, setComposingCell] = useState<{ index: number; value: string } | null>(null);

  const shuffleArray = useCallback((array: string[]) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  }, []);

  const isImage = (content: string) =>
    typeof content === 'string' && content.startsWith('data:image');

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (isPlayingRef.current) return;
    if (initialBpm != null) {
      const v = initialBpm;
      if (Math.abs(v - BPM_180_SYNC) < 0.5) setBpm(180);
      else if (Math.abs(v - BPM_150_SYNC) < 0.5) setBpm(150);
      else setBpm(bpmOptions.includes(v) ? v : 100);
    }
    if (initialLevel != null)
      setCurrentLevel(Math.min(MAX_LEVELS, Math.max(1, initialLevel)));
    if (initialLevelData && typeof initialLevelData === 'object') {
      setLevelData((prev) => {
        const next = { ...prev };
        for (let lv = 1; lv <= MAX_LEVELS; lv++) {
          if (Array.isArray(initialLevelData[lv]) && initialLevelData[lv].length > 0) {
            next[lv] = initialLevelData[lv].slice(0, 8);
          }
        }
        return next;
      });
      const first = initialLevelData[1];
      if (Array.isArray(first) && first.length > 0) setShuffledGrid([...first]);
    } else if (initialGrid != null && initialLevel != null) {
      setLevelData((prev) => ({ ...prev, [initialLevel]: initialGrid }));
      setShuffledGrid([...initialGrid]);
    }
    runIdRef.current++;
    if (timerIDRef.current) cancelAnimationFrame(timerIDRef.current);
    timerIDRef.current = null;
    setIsPlaying(false);
    setIsCountingDown(false);
    isTransitioningRef.current = false;
    setIsTransitioning(false);
    setIsFinished(false);
    setCurrentBeat(-1);
    setRoundInLevel(1);
    setTotalBeatsPlayed(0);
    currentBeatIndexRef.current = 0;
    levelRoundCountRef.current = 1;
    isFinishingRef.current = false;
  }, [initialBpm, initialLevel, initialGrid, initialLevelData]);

  useEffect(() => {
    currentLevelRef.current = currentLevel;
    levelDataRef.current = levelData;
  }, [currentLevel, levelData]);

  useEffect(() => {
    if (initialGrid != null && initialLevel != null && !isPlaying) {
      setShuffledGrid([...initialGrid]);
    }
  }, [initialGrid, initialLevel, isPlaying]);

  useEffect(() => {
    bpmRef.current = getEffectiveBpm(bpm);
  }, [bpm]);

  useEffect(() => {
    bgmSourceBpmRef.current = bgmSourceBpm;
  }, [bgmSourceBpm]);

  useEffect(() => {
    currentLevelRef.current = currentLevel;
    levelDataRef.current = levelData;
  }, [currentLevel, levelData]);

  const playClick = useCallback(
    (time: number) => {
      if (!soundOn || !audioContextRef.current) return;
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(1000, time);
      osc.type = 'square';
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.3, time + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.1);
    },
    [soundOn]
  );

  const playGuideTone = useCallback(
    (time: number) => {
      if (!soundOn || !audioContextRef.current) return;
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(523.25, time);
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.4, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.15);
    },
    [soundOn]
  );

  const playWhistle = useCallback(
    (time: number, isStrong: boolean) => {
      if (!soundOn || !audioContextRef.current) return;
      const ctx = audioContextRef.current;
      const t = Math.max(time, ctx.currentTime + 0.01);
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc1.type = 'triangle';
      osc2.type = 'triangle';
      const baseFreq = isStrong ? 2800 : 2200;
      const duration = isStrong ? 0.15 : 0.08;
      osc1.frequency.setValueAtTime(baseFreq, t);
      osc2.frequency.setValueAtTime(baseFreq + (isStrong ? 200 : 150), t);
      gainNode.gain.setValueAtTime(0, t);
      gainNode.gain.linearRampToValueAtTime(isStrong ? 0.5 : 0.35, t + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc1.start(t);
      osc2.start(t + duration);
      osc1.stop(t + duration + 0.1);
      osc2.stop(t + duration + 0.1);
    },
    [soundOn]
  );

  const nextNote = useCallback(() => {
    currentBeatIndexRef.current++;
    if (currentBeatIndexRef.current === BEATS_PER_ROUND) {
      currentBeatIndexRef.current = 0;
      levelRoundCountRef.current++;
      if (levelRoundCountRef.current > ROUNDS_PER_LEVEL) return 'LEVEL_COMPLETE';
      return 'NEXT_ROUND';
    }
    return 'CONTINUE';
  }, []);

  const finishGame = useCallback(() => {
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;
    isFinishingRestRef.current = false;
    runIdRef.current++;
    if (timerIDRef.current) cancelAnimationFrame(timerIDRef.current);
    stopChallengeBGM();
    setIsPlaying(false);
    setIsCountingDown(false);
    setIsFinishingRest(false);
    isTransitioningRef.current = false;
    setIsTransitioning(false);
    setIsFinished(true);
    setCurrentBeat(-1);
    onEnd?.();
  }, [onEnd]);

  const handleLevelComplete = useCallback((lastBeatScheduledTime?: number) => {
    if (isTransitioningRef.current) return;
    if (timerIDRef.current) cancelAnimationFrame(timerIDRef.current);
    const levelWhenComplete = currentLevelRef.current;

    if (levelWhenComplete >= MAX_LEVELS) {
      // 마지막 비트(15) 호각 후 rest: lastBeatScheduledTime 기준으로 최소 220ms 대기
      const ctx = audioContextRef.current;
      const now = ctx?.currentTime ?? 0;
      const afterLastBeatMs = lastBeatScheduledTime != null ? Math.max(0, (lastBeatScheduledTime - now) * 1000) + 220 : 220;
      const finishDelayMs = afterLastBeatMs;
      setTimeout(() => {
        runIdRef.current++;
        const myRunId = runIdRef.current;
        isFinishingRestRef.current = true;
        setIsFinishingRest(true);
        setCurrentBeat(-1);
        setRoundInLevel(ROUNDS_PER_LEVEL);
        setTimeout(() => {
          if (myRunId !== runIdRef.current) return;
          finishGame();
        }, 600);
      }, finishDelayMs);
      return;
    }

    // 마지막 호각(비트 15) 이후에 rest 표시 — lastBeatScheduledTime이 있으면 그 시각 이후로 대기 후 3초 rest
    const oneBeatMs = Math.round((60 / bpmRef.current) * 1000);
    const transitionMs = getTransitionDurationMs(bpmRef.current, bgmSourceBpmRef.current);
    const ctx = audioContextRef.current;
    const now = ctx?.currentTime ?? 0;
    const waitAfterLastBeatMs = lastBeatScheduledTime != null ? Math.max(0, (lastBeatScheduledTime - now) * 1000) + 80 : 0;
    const delayMs = Math.max(oneBeatMs, waitAfterLastBeatMs);
    setTimeout(() => {
      runIdRef.current++;
      const myRunId = runIdRef.current;
      setCurrentBeat(-1);
      isTransitioningRef.current = true;
      setIsTransitioning(true);
      setRestCountdown(3);
      stopChallengeBGM();

      setTimeout(() => {
        if (myRunId !== runIdRef.current) return;
        setRestCountdown(2);
      }, 1000);
      setTimeout(() => {
        if (myRunId !== runIdRef.current) return;
        setRestCountdown(1);
      }, 2000);

      // 3초 후 다음 레벨 설정, BGM 해당 구간부터 재시작 후 스케줄러 시작 (BGM 실제 재생 시작 후 그리드 시작으로 박자 일치)
      setTimeout(() => {
        if (myRunId !== runIdRef.current) return;
        const nextLvl = levelWhenComplete + 1;
        currentLevelRef.current = nextLvl;
        levelDataRef.current = levelData;
        levelRoundCountRef.current = 1;
        setCurrentLevel(nextLvl);
        setRoundInLevel(1);
        setShuffledGrid(shuffleArray(levelData[nextLvl] ?? defaultLevels[nextLvl]));
        isTransitioningRef.current = false;
        setIsTransitioning(false);
        setRestCountdown(null);

        const startSchedulerNow = () => {
          if (myRunId !== runIdRef.current) return;
          if (audioContextRef.current) {
            const t0 = audioContextRef.current.currentTime + 0.1 + BGM_OUTPUT_LATENCY;
            schedulerStartTimeRef.current = t0;
            nextNoteTimeRef.current = t0;
            currentBeatIndexRef.current = 0;
            schedulerRef.current();
          }
        };

        if (bgmPath) {
          const bpm = bpmRef.current;
          const beatSec = 60 / bpm;
          const beatsPerLevel = ROUNDS_PER_LEVEL * BEATS_PER_ROUND;
          const offsetSec = INITIAL_COUNTDOWN_MS / 1000 + levelWhenComplete * (BETWEEN_LEVEL_MS / 1000 + beatsPerLevel * beatSec);
          const offsetMs = Math.round(offsetSec * 1000);
          const totalSec = getTotalChallengeDurationSec(bpm, bgmSourceBpmRef.current);
          const durationMs = Math.max(0, Math.round((totalSec - offsetSec) * 1000));
          const playbackRate =
            typeof bgmSourceBpmRef.current === 'number' && bgmSourceBpmRef.current > 0
              ? bpm / bgmSourceBpmRef.current
              : 1;
          startChallengeBGM(bgmPath, offsetMs, durationMs, playbackRate)
            .then(startSchedulerNow)
            .catch(() => startSchedulerNow());
        } else {
          startSchedulerNow();
        }
      }, transitionMs);
    }, delayMs);
  }, [levelData, finishGame, shuffleArray, bpm, bgmPath]);

  const scheduleNote = useCallback(
    (beatNumber: number, time: number, currentLevelRound: number) => {
      const myRunId = runIdRef.current;

      if (audioContextRef.current && audioContextRef.current.state === 'running') {
        if (beatNumber < 0) {
          playClick(time);
        } else if (beatNumber < 8) {
          playGuideTone(time);
        } else {
          const actionBeatIndex = beatNumber - 8;
          playWhistle(time, actionBeatIndex === 0);
        }
      }

      const drawTime = time - (audioContextRef.current?.currentTime ?? 0);
      const level = currentLevelRef.current;
      // 4단계 4라운드: 누적 드리프트 보정 — 초록을 호루라기 소리보다 약간 앞당겨서 맞춤
      const pullMs =
        level === MAX_LEVELS && currentLevelRound >= ROUNDS_PER_LEVEL ? 80 : 0;
      const delayMs = Math.max(0, drawTime * 1000 - pullMs);

      setTimeout(() => {
        if (myRunId !== runIdRef.current) return;
        if (isFinishingRef.current) return;
        if (isFinishingRestRef.current) return;
        if (isTransitioningRef.current) return;

        if (beatNumber === 0 && currentLevelRound > 1) {
          const lv = currentLevelRef.current;
          const data = levelDataRef.current;
          setShuffledGrid(shuffleArray(data[lv] ?? defaultLevels[lv]));
        }

        setCurrentBeat(beatNumber);
        if (beatNumber >= 0) {
          setRoundInLevel(currentLevelRound);
          if (beatNumber >= 8) {
            setTotalBeatsPlayed((prev) => prev + 1);
          }
        }
      }, delayMs);
    },
    [playClick, playGuideTone, playWhistle, shuffleArray, levelData, currentLevel]
  );

  const scheduler = useCallback(() => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    const secondsPerBeat = 60.0 / bpmRef.current;

    while (
      nextNoteTimeRef.current <
      now + SCHEDULE_AHEAD_TIME
    ) {
      const lr = levelRoundCountRef.current;
      const b = currentBeatIndexRef.current;

      if (lr > ROUNDS_PER_LEVEL) {
        handleLevelComplete();
        break;
      }

      const scheduledTime = nextNoteTimeRef.current;
      scheduleNote(b, scheduledTime, lr);
      const status = nextNote();
      const levelBeatIndex = (levelRoundCountRef.current - 1) * BEATS_PER_ROUND + currentBeatIndexRef.current;
      nextNoteTimeRef.current = schedulerStartTimeRef.current + levelBeatIndex * secondsPerBeat;

      if (status === 'LEVEL_COMPLETE') {
        handleLevelComplete(scheduledTime);
        return;
      }
    }

    timerIDRef.current = requestAnimationFrame(() => schedulerRef.current());
  }, [scheduleNote, nextNote, handleLevelComplete]);

  useEffect(() => {
    schedulerRef.current = scheduler;
  }, [scheduler]);

  /** 초반 3초 카운트다운(4,3,2,1) 후 beat 0부터 스케줄러 시작. 레벨 사이 전환에서는 사용하지 않음. */
  const startCountdown = useCallback(() => {
    const myRunId = runIdRef.current;
    setIsCountingDown(true);
    setCurrentBeat(-4);
    currentBeatIndexRef.current = -4;

    const t1 = setTimeout(() => {
      if (myRunId !== runIdRef.current) return;
      setCurrentBeat(-3);
    }, COUNTDOWN_TICK_MS);
    const t2 = setTimeout(() => {
      if (myRunId !== runIdRef.current) return;
      setCurrentBeat(-2);
    }, COUNTDOWN_TICK_MS * 2);
    const t3 = setTimeout(() => {
      if (myRunId !== runIdRef.current) return;
      setCurrentBeat(-1);
    }, COUNTDOWN_TICK_MS * 3);
    const t4 = setTimeout(() => {
      if (myRunId !== runIdRef.current) return;
      if (isFinishingRef.current) return;
      const fn = onCountdownEndRef.current;
      onCountdownEndRef.current = null;
      const startScheduler = () => {
        if (myRunId !== runIdRef.current) return;
        if (isFinishingRef.current) return;
        setIsCountingDown(false);
        if (audioContextRef.current) {
          const t0 = audioContextRef.current.currentTime + 0.1 + BGM_OUTPUT_LATENCY;
          schedulerStartTimeRef.current = t0;
          nextNoteTimeRef.current = t0;
          currentBeatIndexRef.current = 0;
          scheduler();
        }
      };
      if (fn) {
        Promise.resolve(fn()).then(startScheduler).catch(() => startScheduler());
      } else {
        startScheduler();
      }
    }, INITIAL_COUNTDOWN_MS);
  }, [scheduler]);

  useEffect(() => {
    startCountdownRef.current = startCountdown;
  }, [startCountdown]);

  useEffect(() => {
    if (bgmPath) preloadChallengeBGM(bgmPath);
  }, [bgmPath]);

  useEffect(() => {
    return () => {
      onCountdownEndRef.current = null;
      if (timerIDRef.current) cancelAnimationFrame(timerIDRef.current);
      runIdRef.current++;
      stopChallengeBGM();
    };
  }, []);

  useEffect(() => {
    if (!isPlaying && !isTransitioning) {
      const grid = levelData[currentLevel] ?? defaultLevels[currentLevel];
      setShuffledGrid([...grid]);
    }
  }, [currentLevel, levelData, isPlaying, isTransitioning]);

  useEffect(() => {
    if (isCountingDown && roundInLevel === 1) {
      setShuffledGrid(shuffleArray(levelData[currentLevel] ?? defaultLevels[currentLevel]));
    }
  }, [isCountingDown, roundInLevel, levelData, currentLevel, shuffleArray]);

  const resetGame = useCallback(() => {
    runIdRef.current++;
    onCountdownEndRef.current = null;
    isFinishingRestRef.current = false;
    if (timerIDRef.current) cancelAnimationFrame(timerIDRef.current);
    stopChallengeBGM();
    setIsPlaying(false);
    setIsCountingDown(false);
    setIsFinishingRest(false);
    setRestCountdown(null);
    isTransitioningRef.current = false;
    setIsTransitioning(false);
    setIsFinished(false);
    isFinishingRef.current = false;
    setCurrentBeat(-1);
    setCurrentLevel(Math.min(MAX_LEVELS, Math.max(1, initialLevel ?? 1)));
    setRoundInLevel(1);
    setTotalBeatsPlayed(0);
    currentBeatIndexRef.current = 0;
    levelRoundCountRef.current = 1;
    const lv = Math.min(MAX_LEVELS, Math.max(1, initialLevel ?? currentLevel ?? 1));
    const grid = levelData[lv] ?? defaultLevels[lv];
    setShuffledGrid([...grid]);
  }, [currentLevel, levelData, initialLevel]);

  const togglePlay = useCallback(async () => {
    if (isFinished) {
      resetGame();
      return;
    }

    if (!isPlaying) {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      setIsPlaying(true);

      if (
        currentLevel === 1 &&
        roundInLevel === 1 &&
        currentBeat === -1 &&
        !isTransitioning
      ) {
        runIdRef.current++;
        levelRoundCountRef.current = 1;
        setRoundInLevel(1);
        setTotalBeatsPlayed(0);
        isFinishingRef.current = false;
        setShuffledGrid(shuffleArray(levelData[1] ?? defaultLevels[1]));
        if (bgmPath) {
          const currentBpm = bpmRef.current;
          const currentSourceBpm = bgmSourceBpmRef.current;
          const totalSec = getTotalChallengeDurationSec(currentBpm, currentSourceBpm);
          const playbackRate =
            typeof currentSourceBpm === 'number' && currentSourceBpm > 0
              ? currentBpm / currentSourceBpm
              : 1;
          onCountdownEndRef.current = () =>
            startChallengeBGM(bgmPath, 0, totalSec * 1000, playbackRate);
        }
        startCountdown();
      } else {
        runIdRef.current++;
        const ctx = audioContextRef.current;
        if (ctx) {
          const now = ctx.currentTime + 0.1;
          const secPerBeat = 60 / bpmRef.current;
          schedulerStartTimeRef.current = now - currentBeatIndexRef.current * secPerBeat;
          nextNoteTimeRef.current = now;
        }
        scheduler();
      }
    } else {
      runIdRef.current++;
      onCountdownEndRef.current = null;
      stopChallengeBGM();
      setIsPlaying(false);
      if (timerIDRef.current) cancelAnimationFrame(timerIDRef.current);
    }
  }, [
    isFinished,
    isPlaying,
    currentLevel,
    roundInLevel,
    currentBeat,
    isTransitioning,
    resetGame,
    startCountdown,
    scheduler,
    bgmPath,
    bgmSourceBpm,
    bpm,
    levelData,
    shuffleArray,
  ]);

  const togglePlayRef = useRef<() => void | Promise<void>>(() => {});
  useEffect(() => {
    togglePlayRef.current = togglePlay;
  }, [togglePlay]);
  useEffect(() => {
    if (!autoStart || isPlaying || isFinished) return;
    const id = setTimeout(() => {
      togglePlayRef.current?.();
    }, 200);
    return () => clearTimeout(id);
  }, [autoStart, isPlaying, isFinished]);

  const handleLevelChange = useCallback(
    (direction: number) => {
      const targetLevel = Math.min(MAX_LEVELS, Math.max(1, currentLevel + direction));
      resetGame();
      setCurrentLevel(targetLevel);
      setShuffledGrid([...(levelData[targetLevel] ?? defaultLevels[targetLevel])]);
    },
    [resetGame, currentLevel, levelData]
  );

  const handleWordEdit = useCallback((index: number, value: string) => {
    setLevelData((prev) => {
      const newWords = [...(prev[currentLevel] ?? defaultLevels[currentLevel])];
      newWords[index] = value;
      return { ...prev, [currentLevel]: newWords };
    });
  }, [currentLevel]);

  const handleBpmChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value, 10);
    const nextBpm = bpmOptions[index] ?? 100;
    bpmRef.current = getEffectiveBpm(nextBpm);
    setBpm(nextBpm);
  }, []);

  const triggerImageUpload = useCallback((index: number) => {
    setUploadTargetIndex(index);
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && uploadTargetIndex !== null) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          setLevelData((prev) => {
            const newWords = [...(prev[currentLevel] ?? defaultLevels[currentLevel])];
            newWords[uploadTargetIndex] = result;
            return { ...prev, [currentLevel]: newWords };
          });
          setUploadTargetIndex(null);
          event.target.value = '';
        };
        reader.readAsDataURL(file);
      }
    },
    [uploadTargetIndex, currentLevel]
  );

  const clearCell = useCallback((index: number) => {
    setLevelData((prev) => {
      const newWords = [...(prev[currentLevel] ?? defaultLevels[currentLevel])];
      newWords[index] = '';
      return { ...prev, [currentLevel]: newWords };
    });
  }, [currentLevel]);

  const effectiveEditing = allowEdit && isEditing;
  const totalActionBeats = MAX_LEVELS * ROUNDS_PER_LEVEL * BEATS_PER_PHASE;
  const progressPercent = Math.min(100, (totalBeatsPlayed / totalActionBeats) * 100);
  const estimatedDuration = Math.round(
    getTotalChallengeDurationSec(bpm, bgmSourceBpm)
  ).toString();

  const isListenPhase = currentBeat >= 0 && currentBeat < 8;
  const isActionPhase = currentBeat >= 8;
  const displayBeat = isActionPhase ? currentBeat - 8 : currentBeat;

  const grid =
    shuffledGrid.length > 0
      ? shuffledGrid
      : (levelData[currentLevel] ?? defaultLevels[currentLevel]);

  return (
    <div
      className="min-h-screen font-sans flex flex-col items-center py-6 sm:py-10 px-3 sm:px-4 selection:bg-green-200 relative overflow-x-hidden overflow-y-auto"
      style={{
        backgroundColor: '#f4f1ea',
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
      }}
    >
      {!isFinished && (
        <>
          <div
            className={`fixed top-4 left-4 md:top-8 md:left-8 z-0 transition-transform duration-100 ${
              isPlaying && !isCountingDown && !isTransitioning && isActionPhase && displayBeat % 2 === 0
                ? 'scale-110 -rotate-6'
                : 'scale-100'
            }`}
          >
            <div className="p-3 bg-white rounded-2xl shadow-md border-2 border-gray-900 text-green-600">
              <Megaphone size={28} strokeWidth={2.5} />
            </div>
          </div>
          <div
            className={`fixed top-4 right-4 md:top-8 md:right-8 z-0 transition-transform duration-100 ${
              isPlaying && !isCountingDown && !isTransitioning && isActionPhase && displayBeat % 2 !== 0
                ? 'scale-110 rotate-6'
                : 'scale-100'
            }`}
          >
            <div className="p-3 bg-white rounded-2xl shadow-md border-2 border-gray-900 text-yellow-500">
              <Lightbulb size={28} strokeWidth={2.5} />
            </div>
          </div>
          <div
            className={`fixed bottom-4 left-4 md:bottom-8 md:left-8 z-0 transition-transform duration-100 ${
              isPlaying && !isCountingDown && !isTransitioning && isActionPhase && displayBeat === 0
                ? 'scale-125 rotate-12 text-rose-500'
                : 'scale-100 text-rose-400'
            }`}
          >
            <div className="p-3 bg-white rounded-2xl shadow-md border-2 border-gray-900">
              <Zap
                size={28}
                strokeWidth={2.5}
                fill={
                  isPlaying && isActionPhase && displayBeat === 0 ? 'currentColor' : 'none'
                }
              />
            </div>
          </div>
          <div
            className={`fixed bottom-4 right-4 md:bottom-8 md:right-8 z-0 transition-transform duration-100 ${
              isPlaying && !isCountingDown && !isTransitioning && isActionPhase && displayBeat === 4
                ? 'scale-125 -rotate-12 text-indigo-500'
                : 'scale-100 text-indigo-400'
            }`}
          >
            <div className="p-3 bg-white rounded-2xl shadow-md border-2 border-gray-900">
              <AlertCircle size={28} strokeWidth={2.5} />
            </div>
          </div>
        </>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@400;700&family=Outfit:wght@300;600;800&display=swap');
          .font-outfit { font-family: 'Outfit', sans-serif; }
          .font-display { font-family: 'Black Han Sans', sans-serif; }
          .font-body { font-family: 'Noto Sans KR', sans-serif; }
        `}
      </style>

      {!isFinished && (
        <>
          <header className="w-full max-w-4xl flex flex-col items-center mb-8 z-10">
        <div className="flex items-center gap-3 mb-2 bg-white px-6 py-3 rounded-full border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="p-1 bg-green-500 rounded-lg text-white border-2 border-black">
            <Music className="w-5 h-5" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-outfit font-extrabold tracking-tighter text-gray-900">
            무빙 챌린지
          </h1>
        </div>
      </header>

      <div className="w-full max-w-3xl relative z-10">
        <div className="mb-6 px-2">
          <div className="flex justify-between items-end mb-3">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="font-outfit text-xs text-gray-500 font-bold tracking-wider mb-1">
                  CURRENT LEVEL
                </span>
                <span className="font-outfit text-xl sm:text-2xl font-black bg-gray-900 text-white px-3 sm:px-4 py-1 rounded-lg shadow-md">
                  LEVEL 0{currentLevel} <span className="text-gray-300 font-bold text-sm">/ {MAX_LEVELS}</span>
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-outfit text-xs text-gray-500 font-bold tracking-wider mb-1">
                  PATTERN
                </span>
                <span className="font-outfit text-2xl font-black text-gray-800">
                  {roundInLevel}
                  <span className="text-gray-400 text-lg mx-1">/</span>
                  {ROUNDS_PER_LEVEL}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-1 sm:gap-2">
              {Array.from({ length: MAX_LEVELS }, (_, i) => i + 1).map((lv) => (
                <button
                  key={lv}
                  type="button"
                  onClick={() => handleLevelChange(lv - currentLevel)}
                  disabled={isPlaying || isTransitioning || currentLevel === lv}
                  className={`min-w-[2.25rem] sm:min-w-[2.5rem] h-9 sm:h-10 rounded-lg border-2 border-gray-900 font-black text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation ${
                    currentLevel === lv
                      ? 'bg-green-500 text-white'
                      : 'bg-white text-gray-900 hover:bg-gray-100'
                  } shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none`}
                >
                  {lv}
                </button>
              ))}
            </div>

            <div className="flex-1 flex justify-center min-w-0">
              {isListenPhase && !isCountingDown && (
                <div className="flex items-center gap-2 bg-rose-100 text-rose-600 px-4 py-1 rounded-full border-2 border-rose-200 animate-pulse">
                  <Ear size={20} />
                  <span className="font-black font-outfit">LISTEN</span>
                </div>
              )}
              {isActionPhase && !isCountingDown && (
                <div className="flex items-center gap-2 bg-green-100 text-green-600 px-4 py-1 rounded-full border-2 border-green-200 animate-bounce">
                  <Mic size={20} />
                  <span className="font-black font-outfit">GO!</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => handleLevelChange(-1)}
                disabled={isPlaying || isTransitioning || currentLevel <= 1}
                className="w-10 h-10 rounded-lg border-2 border-gray-900 bg-white hover:bg-gray-100 text-gray-900 font-black flex items-center justify-center transition-all disabled:opacity-30 touch-manipulation shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
                aria-label="이전 레벨"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => handleLevelChange(1)}
                disabled={isPlaying || isTransitioning || currentLevel >= MAX_LEVELS}
                className="w-10 h-10 rounded-lg border-2 border-gray-900 bg-white hover:bg-gray-100 text-gray-900 font-black flex items-center justify-center transition-all disabled:opacity-30 touch-manipulation shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
                aria-label="다음 레벨"
              >
                +
              </button>
            </div>
          </div>

          <div className="w-full h-4 bg-white border-2 border-gray-900 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300 ease-linear border border-black"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="relative">
          {isTransitioning && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/95 backdrop-blur-md rounded-3xl border-4 border-gray-900 shadow-xl animate-in fade-in zoom-in duration-300">
              <span className="text-xl font-bold text-gray-500 tracking-widest mb-2 font-outfit">
                LEVEL {currentLevel} COMPLETE!
              </span>
              <span className="text-5xl font-black text-gray-900 mb-2 font-outfit">
                NEXT LEVEL {Math.min(currentLevel + 1, MAX_LEVELS)}
              </span>
              {restCountdown != null && (
                <span
                  className="text-[10rem] md:text-[12rem] font-black text-green-500 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] animate-pulse mt-4 font-outfit"
                  style={{ WebkitTextStroke: '3px black' }}
                >
                  {restCountdown}
                </span>
              )}
              {restCountdown == null && (
                <div className="flex gap-2 animate-bounce mt-6">
                  <ArrowRight size={32} className="text-green-500" />
                  <ArrowRight size={32} className="text-green-500 opacity-50" />
                  <ArrowRight size={32} className="text-green-500 opacity-25" />
                </div>
              )}
            </div>
          )}

          {currentBeat < 0 && isPlaying && !isTransitioning && !isFinishingRest && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
              <span
                className="text-[10rem] md:text-[12rem] font-black text-green-500 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] animate-pulse"
                style={{ WebkitTextStroke: '3px black' }}
              >
                {Math.abs(currentBeat)}
              </span>
            </div>
          )}

          <div
            className={`grid grid-cols-4 gap-4 mb-8 relative transition-all duration-500 p-6 bg-white/90 rounded-3xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)] ${
              isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
            }`}
          >
            {grid.map((content, index) => {
              const isActive =
                !isCountingDown && !isTransitioning && currentBeat >= 0 && displayBeat === index;
              const hasImage = isImage(content);

              let borderClass =
                'border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)]';
              if (isActive) {
                if (isListenPhase)
                  borderClass =
                    'border-[6px] border-rose-500 scale-105 z-10 shadow-[0_0_15px_rgba(244,63,94,0.4)]';
                if (isActionPhase)
                  borderClass =
                    'border-[6px] border-green-500 scale-105 z-10 shadow-[0_0_15px_rgba(34,197,94,0.4)]';
              }

              return (
                <div
                  key={index}
                  className={`
                    aspect-square flex items-center justify-center rounded-xl transition-all duration-75 relative overflow-hidden bg-white
                    ${borderClass}
                  `}
                >
                  {hasImage ? (
                    <img
                      src={content}
                      alt="grid-item"
                      className={`w-full h-full object-contain ${effectiveEditing ? 'opacity-50' : ''}`}
                    />
                  ) : effectiveEditing ? (
                    <input
                      type="text"
                      value={
                        composingCell?.index === index ? composingCell.value : content
                      }
                      onCompositionStart={(e) => {
                        setComposingCell({
                          index,
                          value: (e.target as HTMLInputElement).value,
                        });
                      }}
                      onCompositionEnd={(e) => {
                        const v = (e.target as HTMLInputElement).value;
                        handleWordEdit(index, v);
                        setComposingCell(null);
                      }}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (composingCell?.index === index) {
                          setComposingCell((prev) => (prev ? { ...prev, value: v } : null));
                        } else {
                          handleWordEdit(index, v);
                        }
                      }}
                      onBlur={(e) => {
                        if (composingCell?.index === index) {
                          handleWordEdit(index, (e.target as HTMLInputElement).value);
                          setComposingCell(null);
                        }
                      }}
                      className="w-full h-full text-center bg-transparent text-gray-900 font-display text-3xl focus:outline-none placeholder-gray-300"
                      maxLength={3}
                      placeholder="입력"
                    />
                  ) : (
                    <span className="font-display text-4xl md:text-5xl select-none relative z-10 text-gray-900">
                      {content}
                    </span>
                  )}
                  {effectiveEditing && !isPlaying && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-1 right-1 flex gap-1 pointer-events-auto">
                        {hasImage ? (
                          <button
                            onClick={() => clearCell(index)}
                            className="p-1.5 bg-white rounded-md border-2 border-gray-900 text-red-500 hover:bg-red-50 shadow-sm"
                          >
                            <X size={14} strokeWidth={3} />
                          </button>
                        ) : (
                          <button
                            onClick={() => triggerImageUpload(index)}
                            className="p-1.5 bg-white rounded-md border-2 border-gray-900 text-gray-500 hover:text-green-600 shadow-sm"
                          >
                            <ImageIcon size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-2xl p-5 flex flex-col md:flex-row items-center gap-6 justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={togglePlay}
              disabled={isTransitioning}
              className={`
                w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 border-2 border-gray-900 touch-manipulation
                ${
                  isFinished
                    ? 'bg-gray-200 text-gray-500 cursor-pointer hover:bg-gray-300'
                    : isPlaying
                      ? 'bg-red-500 text-white'
                        : 'bg-green-500 text-white'
                  }
                  ${isTransitioning ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {isFinished ? (
                  <RefreshCw size={28} />
                ) : isPlaying ? (
                  <Pause size={28} fill="currentColor" />
                ) : (
                  <Play size={28} fill="currentColor" className="ml-1" />
                )}
              </button>

            <button
              onClick={resetGame}
              className="w-12 h-12 rounded-full border-2 border-gray-900 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors shadow-sm"
            >
              <RefreshCw size={20} />
            </button>

            {onEnd && (
              <button
                type="button"
                onClick={onEnd}
                className="px-4 py-2 rounded-xl border-2 border-gray-900 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                Phase 종료
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto flex-1 md:max-w-xs bg-gray-50 p-3 rounded-xl border-2 border-gray-200 relative">
            {(isPlaying || lockBpm) && (
              <div className="absolute inset-0 bg-gray-100/50 z-20 cursor-not-allowed rounded-xl" />
            )}
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border-2 border-gray-200">
              <Settings size={20} className="text-gray-400" />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs font-outfit font-bold text-gray-500">
                <span>SPEED</span>
                <span className="text-green-600">{bpm} BPM{lockBpm ? ' (고정)' : ''}</span>
              </div>
              {!lockBpm && (
                <div className="relative flex items-center">
                  <div className="absolute w-full flex justify-between px-1 -bottom-3 pointer-events-none">
                    {bpmOptions.map((opt) => (
                      <div
                        key={opt}
                        className={`w-1 h-1 rounded-full ${bpm === opt ? 'bg-green-500' : 'bg-gray-300'}`}
                      />
                    ))}
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={bpmOptions.length - 1}
                    step={1}
                    value={bpmOptions.indexOf(bpm)}
                    onChange={handleBpmChange}
                    className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-green-500 z-10"
                  />
                </div>
              )}
            </div>
          </div>

          {allowEdit && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              disabled={isPlaying || isTransitioning}
              className={`
                flex items-center gap-2 px-5 py-3 rounded-xl font-body font-bold text-sm transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-gray-900 active:translate-y-[2px] active:shadow-none
                ${
                  isEditing
                    ? 'bg-green-100 text-green-800'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isEditing ? (
                <Check size={18} strokeWidth={3} />
              ) : (
                <Edit3 size={18} />
              )}
              <span className="hidden md:inline">{isEditing ? '완료' : '수정'}</span>
            </button>
          )}

          {allowEdit && onPresetChange && (
            <button
              type="button"
              onClick={() => {
                const gridsByLevel: Record<number, string[]> = {
                  1: (levelData[1] ?? defaultLevels[1]).slice(0, 8),
                  2: (levelData[2] ?? defaultLevels[2]).slice(0, 8),
                  3: (levelData[3] ?? defaultLevels[3]).slice(0, 8),
                  4: (levelData[4] ?? defaultLevels[4]).slice(0, 8),
                };
                onPresetChange({
                  bpm,
                  level: currentLevel,
                  grid: (levelData[currentLevel] ?? defaultLevels[currentLevel]).slice(0, 8),
                  gridsByLevel,
                });
              }}
              disabled={isPlaying}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-body font-bold text-sm bg-amber-500/20 text-amber-700 border-2 border-amber-400/50 hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
            >
              이 주차로 픽스
            </button>
          )}
        </div>
      </div>
        </>
      )}

      {isFinished && (
        <div className="w-full max-w-3xl relative z-10 px-2">
          <div className="w-full bg-white border-2 border-gray-900 rounded-3xl p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 rounded-full text-green-600 border-2 border-gray-900">
                <Zap size={28} fill="currentColor" />
              </div>
              <h3 className="text-3xl font-black text-gray-900 font-outfit">Excellent!</h3>
            </div>
            <div className="space-y-3 text-gray-600 font-body leading-relaxed text-lg">
              <p>
                총{' '}
                <strong className="text-green-600 bg-green-50 px-1 rounded">
                  {MAX_LEVELS}단계({estimatedDuration}초)
                </strong>{' '}
                챌린지를 완주했어요!
              </p>
              <ul className="text-base list-disc list-inside space-y-1">
                <li>듣고 따라하며(Listen & Speak) 언어 감각이 발달했습니다.</li>
                <li>정확한 타이밍에 반응하며 리듬감이 향상되었습니다.</li>
              </ul>
            </div>
            <button
              onClick={resetGame}
              className="mt-8 w-full py-4 bg-green-500 text-white font-black text-lg rounded-xl hover:bg-green-600 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black active:translate-y-[4px] active:shadow-none"
            >
              다시 도전하기 (RESTART)
            </button>
          </div>
        </div>
      )}

      <div className="mt-16 max-w-3xl w-full grid grid-cols-1 md:grid-cols-3 gap-6 opacity-60">
        <div className="text-center">
          <p className="font-outfit font-bold text-gray-400 text-sm tracking-widest uppercase">
            PLAY → THINK → FLOW
          </p>
        </div>
      </div>
    </div>
  );
}
