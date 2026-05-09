'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  BarChart3,
  BookOpenCheck,
  Check,
  Clock3,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Square,
  Users,
  WifiOff,
} from 'lucide-react';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { ACTIVE_CAMERA_MODE_IDS, DEFAULT_SETTINGS, MAX_CAMERA_PARTICIPANTS, MODE_META } from '../constants';
import { AGE_BAND_LABELS, CAMERA_CONTENT_PACKS, type CameraContentPack } from '../contentPacks';
import type { CameraModeId, DiffKey } from '../constants';
import type {
  CameraActivityResultDetail,
  CameraActivityResultSummary,
  CameraControlPhase,
  CameraControlSessionDraft,
  CameraControllerCommand,
  CameraParticipantMode,
  CameraParticipantSlot,
  CameraSettings,
} from '../types';
import * as Store from '../store';
import styles from './camera-control.module.css';

const MODE_HELP: Record<CameraModeId, string> = {
  speed: '빠른 반응과 시선 집중',
  sequence: '순서 실행과 신체 협응',
  shape: '선택 주의와 판단',
  moving: '추적 반응과 민첩성',
  balance: '균형 감각과 자세 유지',
  mirror: '모방 학습과 신체 인식',
};

const DIFF_LABELS: Record<DiffKey, string> = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
};

const PARTICIPANT_LABELS: Record<CameraParticipantMode, string> = {
  solo: '1명',
  multi: `여러 명(최대 ${MAX_CAMERA_PARTICIPANTS}명)`,
  team: '팀',
  unknown: '미정',
};

type CameraRosterStudent = {
  id: string;
  name: string;
  classGroup?: string;
};

function phaseLabel(phase: CameraControlPhase): string {
  if (phase === 'running') return '진행 중';
  if (phase === 'paused') return '일시정지';
  if (phase === 'ended') return '종료됨';
  if (phase === 'ready') return '준비됨';
  return '대기 중';
}

function formatResultTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function createDefaultSlots(): CameraParticipantSlot[] {
  return Array.from({ length: MAX_CAMERA_PARTICIPANTS }, (_, index) => ({
    slotIndex: index,
    displayName: `P${index + 1}`,
    studentId: null,
    teamId: null,
  }));
}

function mergeParticipantSlots(slots: CameraSettings['participantSlots']): CameraParticipantSlot[] {
  const defaults = createDefaultSlots();
  (slots ?? []).forEach((slot) => {
    if (slot.slotIndex >= 0 && slot.slotIndex < MAX_CAMERA_PARTICIPANTS) {
      defaults[slot.slotIndex] = {
        ...defaults[slot.slotIndex]!,
        ...slot,
        displayName: slot.displayName || defaults[slot.slotIndex]!.displayName,
      };
    }
  });
  return defaults;
}

export default function CameraControlPage() {
  const [settings, setSettings] = useState<CameraSettings>({ ...DEFAULT_SETTINGS });
  const [participantSlots, setParticipantSlots] = useState<CameraParticipantSlot[]>(() => mergeParticipantSlots(undefined));
  const [mode, setMode] = useState<CameraModeId>('speed');
  const [participantMode, setParticipantMode] = useState<CameraParticipantMode>('solo');
  const [phase, setPhase] = useState<CameraControlPhase>('idle');
  const [contentPackId, setContentPackId] = useState(CAMERA_CONTENT_PACKS[0]?.id ?? '');
  const [sessionCode, setSessionCode] = useState('');
  const [controlSession, setControlSession] = useState<CameraControlSessionDraft | null>(null);
  const [connectionMessage, setConnectionMessage] = useState('큰 화면 플레이어에 표시된 코드를 입력하세요.');
  const [connecting, setConnecting] = useState(false);
  const [recentResults, setRecentResults] = useState<CameraActivityResultSummary[]>([]);
  const [resultsMessage, setResultsMessage] = useState('저장된 결과를 불러오는 중');
  const [selectedResult, setSelectedResult] = useState<CameraActivityResultDetail | null>(null);
  const [detailMessage, setDetailMessage] = useState('');
  const [rosterStudents, setRosterStudents] = useState<CameraRosterStudent[]>([]);
  const [rosterMessage, setRosterMessage] = useState('');
  const [selectedClassGroup, setSelectedClassGroup] = useState('all');

  useEffect(() => {
    Store.initStore();
    const savedSettings = Store.getSettings();
    setSettings(savedSettings);
    setParticipantSlots(mergeParticipantSlots(savedSettings.participantSlots));
  }, []);

  const loadRosterStudents = async () => {
    setRosterMessage('');
    try {
      const res = await fetch('/api/spokedu-pro/students', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRosterMessage(typeof json?.error === 'string' ? json.error : '원생 목록을 불러오지 못했습니다.');
        return;
      }
      const students = Array.isArray(json?.students) ? json.students as CameraRosterStudent[] : [];
      setRosterStudents(students.filter((student) => student.id && student.name));
      setRosterMessage(students.length ? '' : '등록된 원생이 없습니다.');
    } catch {
      setRosterMessage('네트워크 오류로 원생 목록을 불러오지 못했습니다.');
    }
  };

  useEffect(() => {
    void loadRosterStudents();
  }, []);

  const loadRecentResults = async () => {
    setResultsMessage('저장된 결과를 불러오는 중');
    try {
      const res = await fetch('/api/admin/camera/activity-results?limit=6', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResultsMessage(typeof json?.error === 'string' ? json.error : '결과를 불러오지 못했습니다.');
        return;
      }
      const results = Array.isArray(json?.results) ? json.results as CameraActivityResultSummary[] : [];
      setRecentResults(results);
      setResultsMessage(results.length ? '최근 저장 결과' : '아직 저장된 결과가 없습니다.');
    } catch {
      setResultsMessage('네트워크 오류로 결과를 불러오지 못했습니다.');
    }
  };

  const loadResultDetail = async (id: string) => {
    setDetailMessage('상세 결과를 불러오는 중');
    try {
      const res = await fetch(`/api/admin/camera/activity-results?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDetailMessage(typeof json?.error === 'string' ? json.error : '상세 결과를 불러오지 못했습니다.');
        return;
      }
      setSelectedResult(json.result as CameraActivityResultDetail);
      setDetailMessage('');
    } catch {
      setDetailMessage('네트워크 오류로 상세 결과를 불러오지 못했습니다.');
    }
  };

  useEffect(() => {
    void loadRecentResults();
  }, []);

  const selectedMode = MODE_META[mode];
  const selectedContentPack = CAMERA_CONTENT_PACKS.find((pack) => pack.id === contentPackId);
  const canStart = phase === 'idle' || phase === 'ready' || phase === 'ended';
  const canPause = phase === 'running';
  const canResume = phase === 'paused';
  const canEnd = phase === 'running' || phase === 'paused';
  const classGroups = useMemo(
    () => Array.from(new Set(rosterStudents.map((student) => student.classGroup).filter((group): group is string => Boolean(group)))).sort(),
    [rosterStudents]
  );
  const filteredRosterStudents = useMemo(
    () => selectedClassGroup === 'all'
      ? rosterStudents
      : rosterStudents.filter((student) => student.classGroup === selectedClassGroup),
    [rosterStudents, selectedClassGroup]
  );

  const summary = useMemo(
    () => [
      selectedMode.label,
      DIFF_LABELS[settings.diff],
      `${settings.dur}초`,
      PARTICIPANT_LABELS[participantMode],
    ].join(' · '),
    [participantMode, selectedMode.label, settings.diff, settings.dur]
  );

  const controllerState = (
    nextSettings: CameraSettings = settings,
    nextPhase: CameraControlPhase = phase,
    nextMode: CameraModeId = mode,
    nextParticipantMode: CameraParticipantMode = participantMode
  ) => ({
    phase: nextPhase,
    mode: nextMode,
    settings: nextSettings,
    participantMode: nextParticipantMode,
    updatedAt: new Date().toISOString(),
  });

  const sendCommand = async (
    command: CameraControllerCommand,
    nextSettings: CameraSettings = settings,
    nextPhase: CameraControlPhase = phase,
    nextMode: CameraModeId = mode,
    nextParticipantMode: CameraParticipantMode = participantMode
  ) => {
    if (!controlSession) return;
    try {
      const res = await fetch('/api/admin/camera/control-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'command',
          id: controlSession.id,
          command,
          controllerState: controllerState(nextSettings, nextPhase, nextMode, nextParticipantMode),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.session) {
        setControlSession(json.session as CameraControlSessionDraft);
        setConnectionMessage('명령을 보냈습니다.');
      } else if (!res.ok) {
        setConnectionMessage(typeof json?.error === 'string' ? json.error : '명령 전송에 실패했습니다.');
      }
    } catch {
      setConnectionMessage('네트워크 오류로 명령을 보내지 못했습니다.');
    }
  };

  const updateSettings = (patch: Partial<CameraSettings>) => {
    const next = { ...settings, ...patch };
    const nextPhase = phase === 'idle' ? 'ready' : phase;
    setSettings(next);
    Store.saveSettings(next);
    if (phase === 'idle') setPhase('ready');
    void sendCommand({ type: 'updateSettings', settings: patch }, next, nextPhase);
  };

  const updateParticipantSlot = (slotIndex: number, displayName: string) => {
    const nextSlots = participantSlots.map((slot) =>
      slot.slotIndex === slotIndex
        ? {
            ...slot,
            displayName: displayName.slice(0, 40),
            teamId: participantMode === 'team' && displayName.trim() ? `team-${slotIndex + 1}` : null,
            studentId: null,
          }
        : slot
    );
    const nextSettings = { ...settings, participantSlots: nextSlots };
    const nextPhase = phase === 'idle' ? 'ready' : phase;
    setParticipantSlots(nextSlots);
    setSettings(nextSettings);
    Store.saveSettings(nextSettings);
    if (phase === 'idle') setPhase('ready');
    void sendCommand({ type: 'updateSettings', settings: { participantSlots: nextSlots } }, nextSettings, nextPhase);
  };

  const assignRosterStudent = (slotIndex: number, studentId: string) => {
    const student = rosterStudents.find((item) => item.id === studentId);
    const nextSlots = participantSlots.map((slot) =>
      slot.slotIndex === slotIndex
        ? {
            ...slot,
            displayName: student?.name ?? slot.displayName,
            studentId: student?.id ?? null,
            teamId: null,
          }
        : slot
    );
    const nextSettings = { ...settings, participantSlots: nextSlots };
    const nextPhase = phase === 'idle' ? 'ready' : phase;
    setParticipantSlots(nextSlots);
    setSettings(nextSettings);
    Store.saveSettings(nextSettings);
    if (phase === 'idle') setPhase('ready');
    void sendCommand({ type: 'updateSettings', settings: { participantSlots: nextSlots } }, nextSettings, nextPhase);
  };

  const changeClassGroup = (classGroup: string) => {
    setSelectedClassGroup(classGroup);
    if (classGroup === 'all') return;
    const allowed = new Set(rosterStudents.filter((student) => student.classGroup === classGroup).map((student) => student.id));
    const nextSlots = participantSlots.map((slot) =>
      slot.studentId && !allowed.has(slot.studentId)
        ? { ...slot, studentId: null, displayName: `P${slot.slotIndex + 1}` }
        : slot
    );
    if (nextSlots.some((slot, index) => slot !== participantSlots[index])) {
      const nextSettings = { ...settings, participantSlots: nextSlots };
      setParticipantSlots(nextSlots);
      setSettings(nextSettings);
      Store.saveSettings(nextSettings);
      void sendCommand({ type: 'updateSettings', settings: { participantSlots: nextSlots } }, nextSettings, phase);
    }
  };

  const applyContentPack = (pack: CameraContentPack) => {
    const nextSettings = { ...settings, ...pack.settings };
    const nextPhase = phase === 'idle' ? 'ready' : phase;
    setContentPackId(pack.id);
    setMode(pack.mode);
    setParticipantMode(pack.participantMode);
    setSettings(nextSettings);
    Store.saveSettings(nextSettings);
    if (phase === 'idle') setPhase('ready');
    void sendCommand(
      { type: 'applyContentPack', packId: pack.id, mode: pack.mode, settings: pack.settings },
      nextSettings,
      nextPhase,
      pack.mode,
      pack.participantMode
    );
  };

  const joinSession = async () => {
    const code = sessionCode.trim().toUpperCase();
    if (!code) {
      setConnectionMessage('세션 코드를 먼저 입력하세요.');
      return;
    }
    setConnecting(true);
    setConnectionMessage('플레이어를 찾는 중...');
    try {
      const res = await fetch('/api/admin/camera/control-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          code,
          controllerState: controllerState(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setConnectionMessage(typeof json?.error === 'string' ? json.error : '연결에 실패했습니다.');
        return;
      }
      setControlSession(json.session as CameraControlSessionDraft);
      setConnectionMessage('플레이어와 연결했습니다.');
    } catch {
      setConnectionMessage('네트워크 오류로 연결하지 못했습니다.');
    } finally {
      setConnecting(false);
    }
  };

  const setPhaseAndSend = (nextPhase: CameraControlPhase, command: CameraControllerCommand) => {
    setPhase(nextPhase);
    void sendCommand(command, settings, nextPhase);
    if (command.type === 'end') {
      window.setTimeout(() => void loadRecentResults(), 1800);
    }
  };

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>SPOKEDU Camera</p>
          <h1>모바일 컨트롤러</h1>
        </div>
        <Link className={styles.playerLink} href="/admin/camera">
          플레이어
        </Link>
      </header>

      <section className={styles.connectionPanel} aria-label="player connection">
        <div className={styles.connectionState}>
          <WifiOff size={18} />
          <div>
            <strong>{controlSession ? '플레이어 연결됨' : '플레이어 미연결'}</strong>
            <span>큰 화면에서 코드를 생성한 뒤 이 화면에 입력합니다.</span>
          </div>
        </div>
        <label className={styles.codeField}>
          <span>세션 코드</span>
          <input
            value={sessionCode}
            onChange={(event) => setSessionCode(event.target.value.toUpperCase())}
            placeholder="예: A7K2"
            maxLength={6}
            inputMode="text"
          />
        </label>
        <button type="button" className={styles.connectButton} onClick={joinSession} disabled={connecting}>
          {connecting ? '연결 중...' : controlSession ? '다시 연결' : '연결'}
        </button>
        <p className={styles.connectionMessage}>{connectionMessage}</p>
      </section>

      <section className={styles.section} aria-labelledby="pack-title">
        <div className={styles.sectionTitle}>
          <BookOpenCheck size={18} />
          <h2 id="pack-title">수업 콘텐츠</h2>
        </div>
        <div className={styles.packGrid}>
          {CAMERA_CONTENT_PACKS.map((pack) => {
            const selected = pack.id === contentPackId;
            return (
              <button
                key={pack.id}
                type="button"
                className={`${styles.packButton} ${selected ? styles.selectedPack : ''}`}
                onClick={() => applyContentPack(pack)}
                aria-pressed={selected}
              >
                <span>
                  <strong>{pack.label}</strong>
                  <small>{AGE_BAND_LABELS[pack.ageBand]} · {pack.goal}</small>
                </span>
                {selected && <Check size={16} />}
              </button>
            );
          })}
        </div>
        {selectedContentPack && <p className={styles.packNote}>{selectedContentPack.description}</p>}
      </section>

      <section className={styles.section} aria-labelledby="mode-title">
        <div className={styles.sectionTitle}>
          <Activity size={18} />
          <h2 id="mode-title">활동 선택</h2>
        </div>
        <div className={styles.modeGrid}>
          {ACTIVE_CAMERA_MODE_IDS.map((id) => {
            const meta = MODE_META[id];
            const selected = id === mode;
            return (
              <button
                key={id}
                type="button"
                className={`${styles.modeButton} ${selected ? styles.selected : ''}`}
                onClick={() => {
                  const nextPhase = phase === 'idle' ? 'ready' : phase;
                  setMode(id);
                  if (phase === 'idle') setPhase('ready');
                  void sendCommand({ type: 'selectMode', mode: id }, settings, nextPhase, id);
                }}
                aria-pressed={selected}
              >
                <span className={styles.modeEmoji}>{meta.emoji}</span>
                <span>
                  <strong>{meta.label}</strong>
                  <small>{MODE_HELP[id]}</small>
                </span>
                {selected && <Check size={16} />}
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="settings-title">
        <div className={styles.sectionTitle}>
          <Settings2 size={18} />
          <h2 id="settings-title">수업 설정</h2>
        </div>

        <div className={styles.controlGroup}>
          <span>난이도</span>
          <div className={styles.segment}>
            {(['easy', 'normal', 'hard'] as const).map((diff) => (
              <button key={diff} type="button" className={settings.diff === diff ? styles.on : ''} onClick={() => updateSettings({ diff })}>
                {DIFF_LABELS[diff]}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.controlGroup}>
          <span>시간</span>
          <div className={styles.segment}>
            {[20, 30, 60].map((dur) => (
              <button key={dur} type="button" className={settings.dur === dur ? styles.on : ''} onClick={() => updateSettings({ dur })}>
                {dur}초
              </button>
            ))}
          </div>
        </div>

        <div className={styles.controlGroup}>
          <span>참여</span>
          <div className={styles.segment}>
            {(['solo', 'multi', 'team'] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={participantMode === value ? styles.on : ''}
                onClick={() => {
                  const nextSettings = { ...settings, multiOn: value !== 'solo' };
                  const nextPhase = phase === 'idle' ? 'ready' : phase;
                  setParticipantMode(value);
                  const renamedSlots = participantSlots.map((slot) => ({
                    ...slot,
                    displayName: value === 'team' && /^P[1-3]$/.test(slot.displayName)
                      ? `팀 ${slot.slotIndex + 1}`
                      : slot.displayName,
                    teamId: value === 'team' ? `team-${slot.slotIndex + 1}` : null,
                    studentId: null,
                  }));
                  setSettings({ ...nextSettings, participantSlots: renamedSlots });
                  setParticipantSlots(renamedSlots);
                  Store.saveSettings({ ...nextSettings, participantSlots: renamedSlots });
                  if (phase === 'idle') setPhase('ready');
                  void sendCommand(
                    { type: 'updateSettings', settings: { multiOn: value !== 'solo', participantSlots: renamedSlots } },
                    { ...nextSettings, participantSlots: renamedSlots },
                    nextPhase,
                    mode,
                    value
                  );
                }}
              >
                {PARTICIPANT_LABELS[value]}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.controlGroup}>
          <span>슬롯 이름</span>
          {participantMode !== 'team' && (
            <select
              className={styles.classSelect}
              value={selectedClassGroup}
              onChange={(event) => changeClassGroup(event.target.value)}
              aria-label="반 선택"
            >
              <option value="all">전체 반</option>
              {classGroups.map((group) => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          )}
          <div className={styles.slotGrid}>
            {participantSlots.map((slot) => (
              <label key={slot.slotIndex} className={styles.slotField}>
                <span>P{slot.slotIndex + 1}</span>
                <input
                  value={slot.displayName}
                  onChange={(event) => updateParticipantSlot(slot.slotIndex, event.target.value)}
                  placeholder={participantMode === 'team' ? `팀 ${slot.slotIndex + 1}` : `참여자 ${slot.slotIndex + 1}`}
                />
                {participantMode !== 'team' && (
                  <select
                    value={slot.studentId ?? ''}
                    onChange={(event) => assignRosterStudent(slot.slotIndex, event.target.value)}
                    aria-label={`P${slot.slotIndex + 1} 원생 선택`}
                  >
                    <option value="">원생 선택 안 함</option>
                    {filteredRosterStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name}{student.classGroup ? ` · ${student.classGroup}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            ))}
          </div>
          {rosterMessage && <p className={styles.slotNote}>{rosterMessage}</p>}
        </div>

        <label className={styles.toggleRow}>
          <span>효과음</span>
          <input type="checkbox" checked={settings.soundOn} onChange={(event) => updateSettings({ soundOn: event.target.checked })} />
        </label>
      </section>

      <section className={styles.runPanel} aria-label="run controls">
        <div className={styles.runSummary}>
          <div>
            <p>{phaseLabel(phase)}</p>
            <strong>{summary}</strong>
          </div>
          <Clock3 size={22} />
        </div>

        <div className={styles.primaryActions}>
          {canStart && (
            <button type="button" className={styles.startButton} onClick={() => setPhaseAndSend('running', { type: 'start' })}>
              <Play size={20} />
              시작
            </button>
          )}
          {canPause && (
            <button type="button" className={styles.pauseButton} onClick={() => setPhaseAndSend('paused', { type: 'pause' })}>
              <Pause size={20} />
              일시정지
            </button>
          )}
          {canResume && (
            <button type="button" className={styles.startButton} onClick={() => setPhaseAndSend('running', { type: 'resume' })}>
              <Play size={20} />
              계속
            </button>
          )}
          {canEnd && (
            <button type="button" className={styles.endButton} onClick={() => setPhaseAndSend('ended', { type: 'end' })}>
              <Square size={18} />
              종료
            </button>
          )}
        </div>

        <button type="button" className={styles.resetButton} onClick={() => setPhaseAndSend('ready', { type: 'reset' })}>
          <RotateCcw size={17} />
          다시 준비
        </button>
      </section>

      <section className={styles.resultPreview} aria-labelledby="result-title">
        <div className={styles.sectionTitle}>
          <BarChart3 size={18} />
          <h2 id="result-title">현재 설정</h2>
        </div>
        <div className={styles.resultGrid}>
          <div>
            <span>상태</span>
            <strong>{phaseLabel(phase)}</strong>
          </div>
          <div>
            <span>참여</span>
            <strong>
              <Users size={16} />
              {PARTICIPANT_LABELS[participantMode]}
            </strong>
          </div>
        </div>
        <p className={styles.note}>
          활동이 끝나면 큰 화면 플레이어가 결과를 저장하고, 아래 최근 결과에서 바로 확인할 수 있습니다.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="recent-results-title">
        <div className={styles.sectionTitle}>
          <BarChart3 size={18} />
          <h2 id="recent-results-title">최근 활동 결과</h2>
          <button type="button" className={styles.refreshButton} onClick={() => void loadRecentResults()}>
            새로고침
          </button>
        </div>
        <p className={styles.resultMessage}>{resultsMessage}</p>
        {recentResults.length === 0 && resultsMessage === '아직 저장된 결과가 없습니다.' && (
          <Empty className="border-slate-200 bg-slate-50">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BarChart3 />
              </EmptyMedia>
              <EmptyTitle>저장된 활동 결과가 없습니다</EmptyTitle>
              <EmptyDescription>활동을 한 번 진행하고 종료하면 결과가 여기에 쌓입니다.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {recentResults.length > 0 && (
          <div className={styles.recentList}>
            {recentResults.map((result) => (
              <button
                key={result.id}
                type="button"
                className={`${styles.recentItem} ${selectedResult?.id === result.id ? styles.selectedResult : ''}`}
                onClick={() => void loadResultDetail(result.id)}
              >
                <div>
                  <strong>{MODE_META[result.mode]?.label ?? result.mode}</strong>
                  <span>{formatResultTime(result.createdAt)} · {DIFF_LABELS[result.difficulty]} · {result.durationSec}초</span>
                </div>
                <div className={styles.recentScore}>
                  <span>{result.participantCount}명</span>
                  <strong>{result.topScore}</strong>
                </div>
              </button>
            ))}
          </div>
        )}
        {detailMessage && <p className={styles.resultMessage}>{detailMessage}</p>}
        {selectedResult && (
          <div className={styles.detailPanel}>
            <div className={styles.detailHeader}>
              <div>
                <span>{formatResultTime(selectedResult.createdAt)}</span>
                <strong>{MODE_META[selectedResult.mode]?.label ?? selectedResult.mode}</strong>
              </div>
              <button type="button" className={styles.refreshButton} onClick={() => setSelectedResult(null)}>
                닫기
              </button>
            </div>
            <div className={styles.detailMetrics}>
              <div>
                <span>총점</span>
                <strong>{selectedResult.metrics.totalScore}</strong>
              </div>
              <div>
                <span>최고점</span>
                <strong>{selectedResult.topScore}</strong>
              </div>
              <div>
                <span>반응</span>
                <strong>{selectedResult.metrics.avgReactionMs != null ? `${selectedResult.metrics.avgReactionMs}ms` : '-'}</strong>
              </div>
            </div>
            <div className={styles.participantList}>
              {selectedResult.participants.map((participant) => (
                <div key={participant.id} className={styles.participantItem}>
                  <div>
                    <strong>{participant.displayName ?? `P${participant.slotIndex + 1}`}</strong>
                    <span>히트 {participant.hitCount} · 미스 {participant.missCount ?? 0}</span>
                  </div>
                  <strong>{participant.score}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
