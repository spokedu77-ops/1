'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { ActivityGuide } from './ActivityGuide';
import styles from './HealthLabPage.module.css';
import { HEALTH_LAB_PROGRAM_ID, LAB_WEEKS, type LabWeek } from './curriculum';
import { applyHabitDraft, habitHeading } from './habitRecord';
import { acceptedSpecific, choiceLabel as specificChoiceLabel, feedbackLines, missionObservation, UNANSWERED_SPECIFIC } from './missionObservation';
import { clearHealthLabStore, readHealthLabStore, writeHealthLabStore } from './healthLabStorage';
import {
  CHILD_A,
  CHILDREN,
  closeMission,
  completionSummary,
  isOpenStatus,
  latestAttempt,
  pauseMission,
  programCompletion,
  resumeMission,
  retryMission,
  startMission,
  type GuardianObservation,
  type HabitLog,
  type HealthLabStore,
  type MissionAssignment,
  type MissionAttempt,
  type MissionRunStatus,
  type MovementLevel,
  type ParticipationResult,
  type SpecificChoice,
  type TransitionResult,
  type UnderstandingLevel,
} from './missionEngine';

type Mode = 'home' | 'activity' | 'research';

const REQUIRED_ASSIGNMENTS: MissionAssignment[] = CHILDREN.flatMap((child) => LAB_WEEKS.flatMap((week) => (
  week.required && week.available && week.missionId
    ? [{ childId: child.id, programId: HEALTH_LAB_PROGRAM_ID, missionId: week.missionId, required: true }]
    : []
)));
const AVAILABLE_WEEKS = LAB_WEEKS.filter((week) => week.available && week.missionId);
const LATER_WEEKS = LAB_WEEKS.filter((week) => !week.available);

const STATUS_LABEL: Record<MissionRunStatus, string> = {
  before: '시작 전', running: '진행 중', paused: '일시중단', done: '완료', 'partial-closed': '일부 참여 종료', 'stopped-closed': '중단 종료',
};
const UNDERSTANDING_OPTIONS: { value: UnderstandingLevel; label: string }[] = [
  { value: 'once', label: '한 번의 안내로 이해' },
  { value: 'repeated', label: '반복 안내 후 이해' },
  { value: 'ongoing-help', label: '지속적인 도움 필요' },
];
const MOVEMENT_OPTIONS: { value: MovementLevel; label: string }[] = [
  { value: 'independent', label: '독립적으로 수행' },
  { value: 'partial-help', label: '부분적인 도움 필요' },
  { value: 'difficult', label: '수행 어려움' },
];
const PARTICIPATION_OPTIONS: { value: ParticipationResult; label: string }[] = [
  { value: 'finished', label: '완료' },
  { value: 'partial', label: '일부 참여' },
  { value: 'stopped', label: '중단' },
];

function labelOf<T extends string>(options: { value: T; label: string }[], value: T) {
  return options.find((option) => option.value === value)?.label ?? '기록 없음';
}
function seoulToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function blankHabit(childId: string, date: string): HabitLog {
  return { childId, date, vegetables: null, movementPlay: null, bedtime: null, wakeTime: null, mediaMinutes: null };
}
function choiceLabel(value: 'yes' | 'no' | null) {
  if (value === 'yes') return '예';
  if (value === 'no') return '아니오';
  return '미기록';
}
function mediaLabel(value: number | null) {
  if (value == null) return '미기록';
  return `${value}분`;
}
function latestChildAttempt(attempts: MissionAttempt[], childId: string) {
  return attempts.filter((attempt) => attempt.childId === childId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).at(-1) ?? null;
}

export default function HealthLabPage() {
  const today = seoulToday();
  const [ready, setReady] = useState(false);
  const [store, setStore] = useState<HealthLabStore | null>(null);
  const [corrupt, setCorrupt] = useState(false);
  const [mode, setMode] = useState<Mode>('home');
  const [childId, setChildId] = useState<(typeof CHILDREN)[number]['id']>(CHILD_A.id);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [habitDate, setHabitDate] = useState(today);
  const [researchDate, setResearchDate] = useState(today);
  const [habit, setHabit] = useState<HabitLog>(blankHabit(CHILD_A.id, today));
  const [habitMessage, setHabitMessage] = useState('');
  const [habitError, setHabitError] = useState('');
  const [wrappingUp, setWrappingUp] = useState(false);
  const [understanding, setUnderstanding] = useState<UnderstandingLevel | ''>('');
  const [movement, setMovement] = useState<MovementLevel | ''>('');
  const [participation, setParticipation] = useState<ParticipationResult | ''>('');
  const [specificChoice, setSpecificChoice] = useState<SpecificChoice | ''>('');
  const [memo, setMemo] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const loaded = readHealthLabStore();
    setStore(loaded.store);
    setCorrupt(loaded.corrupted);
    if (loaded.corrupted) writeHealthLabStore(loaded.store);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!store) return;
    const found = store.habitLogs.find((item) => item.childId === childId && item.date === habitDate);
    setHabit(found ?? blankHabit(childId, habitDate));
  }, [store, childId, habitDate]);

  useEffect(() => {
    setHabitMessage('');
    setHabitError('');
  }, [childId, habitDate]);

  const persist = (next: HealthLabStore) => {
    setStore(next);
    setCorrupt(false);
    writeHealthLabStore(next);
  };
  const apply = (result: TransitionResult) => {
    if (!result.ok) { setFormError(result.reason); return; }
    setFormError('');
    setWrappingUp(false);
    setUnderstanding('');
    setMovement('');
    setParticipation('');
    setSpecificChoice('');
    setMemo('');
    persist(result.store);
  };

  const child = CHILDREN.find((item) => item.id === childId) ?? CHILD_A;
  const summary = store ? completionSummary(store, child.id, REQUIRED_ASSIGNMENTS) : { completed: 0, required: 0, percent: 0 };
  const overall = store ? programCompletion(store, REQUIRED_ASSIGNMENTS) : { completed: 0, required: 0, percent: 0 };
  const nextWeek = AVAILABLE_WEEKS.find((week) => {
    const latest = store && week.missionId ? latestAttempt(store, child.id, week.missionId) : null;
    return latest?.status !== 'done';
  }) ?? AVAILABLE_WEEKS[AVAILABLE_WEEKS.length - 1];
  const nextDone = Boolean(nextWeek?.missionId && store && latestAttempt(store, child.id, nextWeek.missionId)?.status === 'done');
  const activeWeek = LAB_WEEKS.find((week) => week.week === selectedWeek) ?? LAB_WEEKS[0];
  const missionId = activeWeek.available ? activeWeek.missionId : undefined;
  const current = store && missionId ? latestAttempt(store, child.id, missionId) : null;
  const status: MissionRunStatus = current?.status ?? 'before';
  const weekAttempts = store && missionId ? store.attempts.filter((attempt) => attempt.missionId === missionId && attempt.childId === child.id) : [];
  const childAttempts = store ? store.attempts.filter((attempt) => attempt.childId === child.id) : [];
  const researchHabit = store?.habitLogs.find((item) => item.childId === childId && item.date === researchDate) ?? blankHabit(childId, researchDate);
  const researchMissing = researchHabit.vegetables == null || researchHabit.movementPlay == null || researchHabit.bedtime == null || researchHabit.wakeTime == null || researchHabit.mediaMinutes == null;

  const openActivity = (week: LabWeek) => {
    setSelectedWeek(week.week);
    setMode('activity');
    setWrappingUp(false);
    setFormError('');
  };
  const saveObservation = () => {
    if (!store || !missionId) return;
    if (!understanding || !movement || !participation) {
      setFormError('세 가지 관찰 항목을 모두 선택한 뒤 저장해 주세요.');
      return;
    }
    const item = missionObservation(missionId);
    if (participation === 'finished' && !specificChoice) {
      setFormError('완료로 저장하려면 고유 관찰을 선택해 주세요.');
      return;
    }
    const savedAt = new Date().toISOString();
    const observation: GuardianObservation = {
      understanding, movement, participation, memo: memo.trim(), savedAt,
      specific: item && specificChoice ? { itemId: item.itemId, itemVersion: item.itemVersion, choice: specificChoice, recordedAt: savedAt } : null,
    };
    apply(closeMission(store, child.id, missionId, observation));
  };
  const saveHabit = () => {
    if (!store) return;
    const draft = { ...habit, childId: child.id, date: habitDate };
    const result = applyHabitDraft(store.habitLogs, draft, habitHeading(habitDate, today));
    if (!result.ok) {
      setHabitMessage('');
      setHabitError(result.message);
      return;
    }
    const next = { ...store, habitLogs: result.habitLogs };
    try {
      writeHealthLabStore(next);
    } catch {
      setHabitMessage('');
      setHabitError('저장하지 못했습니다. 다시 시도해 주세요.');
      return;
    }
    setStore(next);
    setHabitError('');
    setHabitMessage(result.message);
  };
  const resetRecord = () => {
    if (!window.confirm('이 브라우저에 저장된 Health Lab 시범 기록을 지울까요?')) return;
    setStore(clearHealthLabStore());
    setMode('home');
    setSelectedWeek(1);
    setChildId(CHILD_A.id);
    setWrappingUp(false);
    setFormError('');
    setHabitMessage('');
    setHabitError('');
    setCorrupt(false);
  };

  if (!ready || !store) return <div className={styles.page}><p role="status">시범 기록을 불러오는 중입니다.</p></div>;

  const saved = current?.observation ?? null;
  const canObserve = status === 'running' || status === 'paused';
  const closed = current != null && !isOpenStatus(current.status);
  const showObservation = canObserve && wrappingUp;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.utility}>
          <Link href="/admin" className={styles.back}><ArrowLeft size={16} aria-hidden="true" />관리 홈</Link>
          <button type="button" className={styles.ghost} onClick={resetRecord}><RotateCcw size={14} aria-hidden="true" />테스트 기록 초기화</button>
        </div>
        <header className={styles.header}>
          <div className={styles.titleBlock}>
            <h1>Health Lab</h1>
            <p className={styles.sub}>{child.label} · {child.ageLabel}</p>
            <p className={styles.sub}>필수 미션 완료 {summary.completed} / {summary.required}</p>
          </div>
        </header>
        {corrupt && <p className={styles.alert} role="alert">저장된 시범 기록을 읽지 못해 시작 전 상태로 되돌렸습니다.</p>}
        <div className={styles.tabs} role="tablist" aria-label="가상 아동 선택">
          {CHILDREN.map((item) => <button key={item.id} type="button" role="tab" className={styles.tab} aria-selected={child.id === item.id} onClick={() => setChildId(item.id)}>{item.label}</button>)}
        </div>
        <div className={styles.tabs} role="tablist" aria-label="화면 선택">
          <button type="button" role="tab" className={styles.tab} aria-selected={mode === 'home' || mode === 'activity'} onClick={() => setMode('home')}>보호자 홈</button>
          <button type="button" role="tab" className={styles.tab} aria-selected={mode === 'research'} onClick={() => setMode('research')}>연구 관리자</button>
        </div>

        {mode === 'home' && (
          <>
            <section className={styles.hero}>
              <div>
                <p>{nextDone ? '열어 둔 움직임 미션을 모두 완료했습니다.' : '다음에 수행할 움직임 활동'}</p>
                <h2>{nextWeek?.mission}</h2>
                <p>{nextWeek?.duration ? nextWeek.duration : nextWeek?.domain}</p>
                <ActivityGuide missionId={nextWeek?.missionId} />
              </div>
              {nextWeek && !nextDone && <button type="button" className={styles.primary} onClick={() => openActivity(nextWeek)}>활동 준비하기</button>}
            </section>
            <section className={styles.panel} aria-labelledby="habit-heading">
              <h2 id="habit-heading">{habitHeading(habitDate, today)}</h2>
              <p className={styles.note}>보호자 자기보고입니다.</p>
              <label className={styles.timeRow}>날짜
                <input className={styles.dateInput} type="date" value={habitDate} onChange={(event) => setHabitDate(event.target.value)} />
              </label>
              <div className={styles.habits}>
                <article className={styles.habit}>
                  <h3>건강한 식습관</h3>
                  <p>선택한 날짜에 아이가 채소를 먹었나요?</p>
                  <div className={styles.choiceRow}>
                    <button type="button" className={habit.vegetables === 'yes' ? styles.primary : styles.secondary} onClick={() => setHabit({ ...habit, vegetables: 'yes' })}>예</button>
                    <button type="button" className={habit.vegetables === 'no' ? styles.primary : styles.secondary} onClick={() => setHabit({ ...habit, vegetables: 'no' })}>아니오</button>
                  </div>
                </article>
                <article className={styles.habit}>
                  <h3>신체활동</h3>
                  <p>선택한 날짜에 움직임 놀이에 참여했나요?</p>
                  <div className={styles.choiceRow}>
                    <button type="button" className={habit.movementPlay === 'yes' ? styles.primary : styles.secondary} onClick={() => setHabit({ ...habit, movementPlay: 'yes' })}>예</button>
                    <button type="button" className={habit.movementPlay === 'no' ? styles.primary : styles.secondary} onClick={() => setHabit({ ...habit, movementPlay: 'no' })}>아니오</button>
                  </div>
                </article>
                <article className={styles.habit}>
                  <h3>건강한 수면</h3>
                  <div className={styles.timeRow}>
                    <label>전날 취침<input type="time" value={habit.bedtime ?? ''} onChange={(event) => setHabit({ ...habit, bedtime: event.target.value || null })} /></label>
                    <p className={styles.note}>{habit.bedtime ? habit.bedtime : '미기록'}</p>
                    <label>당일 기상<input type="time" value={habit.wakeTime ?? ''} onChange={(event) => setHabit({ ...habit, wakeTime: event.target.value || null })} /></label>
                    <p className={styles.note}>{habit.wakeTime ? habit.wakeTime : '미기록'}</p>
                  </div>
                </article>
                <article className={styles.habit}>
                  <h3>미디어 사용습관</h3>
                  <label className={styles.timeRow}>당일 이용시간(분)
                    <input inputMode="numeric" value={habit.mediaMinutes ?? ''} onChange={(event) => {
                      const raw = event.target.value.trim();
                      if (raw === '') setHabit({ ...habit, mediaMinutes: null });
                      else if (/^\d+$/.test(raw)) setHabit({ ...habit, mediaMinutes: Math.min(1440, Number(raw)) });
                    }} />
                  </label>
                  <p className={styles.note}>{mediaLabel(habit.mediaMinutes)}</p>
                </article>
              </div>
              <div className={styles.actions}><button type="button" className={styles.primary} onClick={saveHabit}>이 날짜의 습관 저장</button></div>
              {habitMessage && <p className={styles.saved} role="status">{habitMessage}</p>}
              {habitError && <p className={styles.alert} role="alert">{habitError}</p>}
            </section>
            <details className={styles.folded}>
              <summary>3~8주 움직임은 아직 열리지 않았습니다.</summary>
              <p>준비 중인 주차는 실행할 수 없습니다. {LATER_WEEKS.map((week) => `${week.week}주 ${week.topic}`).join(' · ')}</p>
            </details>
          </>
        )}

        {mode === 'activity' && activeWeek.available && (
          <section className={styles.panel}>
            <button type="button" className={styles.secondary} onClick={() => setMode('home')}>보호자 홈</button>
            {status === 'before' && (
              <>
                <h2>{activeWeek.mission}</h2>
                <p>{activeWeek.goal}</p>
                <ActivityGuide missionId={activeWeek.missionId} />
                <div className={styles.block}><h3>준비물</h3><p>{activeWeek.materials}</p></div>
                <div className={styles.block}><h3>안전 안내</h3><p>{activeWeek.safety}</p></div>
                <div className={styles.actions}><button type="button" className={styles.primary} onClick={() => apply(startMission(store, { id: crypto.randomUUID(), childId: child.id, programId: HEALTH_LAB_PROGRAM_ID, missionId: missionId ?? '', missionVersion: activeWeek.version ?? 1, createdAt: new Date().toISOString() }))}>활동 시작</button></div>
                <details className={styles.folded}>
                  <summary>상세 단계와 연령별 조절</summary>
                  <ol className={styles.steps}>{activeWeek.steps?.map((step) => <li key={step}>{step}</li>)}</ol>
                  {activeWeek.guidance?.map((line) => <p key={line}>{line}</p>)}
                </details>
              </>
            )}
            {canObserve && !showObservation && (
              <>
                <p className={styles.statusPill}>{STATUS_LABEL[status]}</p>
                <h2>{activeWeek.mission}</h2>
                <p>{activeWeek.goal}</p>
                <div className={styles.actions}>
                  {status === 'running' && <button type="button" className={styles.secondary} onClick={() => missionId && apply(pauseMission(store, child.id, missionId))}>잠시 중단</button>}
                  {status === 'paused' && <button type="button" className={styles.primary} onClick={() => missionId && apply(resumeMission(store, child.id, missionId))}>다시 시작</button>}
                  <button type="button" className={styles.primary} onClick={() => setWrappingUp(true)}>활동 마치기</button>
                </div>
              </>
            )}
            {showObservation && (
              <form onSubmit={(event) => { event.preventDefault(); saveObservation(); }}>
                <h2>활동 관찰</h2>
                <fieldset className={styles.fieldset}><legend>1. 활동 방법을 어떻게 이해했나요?</legend>{UNDERSTANDING_OPTIONS.map((option) => <label key={option.value} className={styles.choice}><input type="radio" name="understanding" checked={understanding === option.value} onChange={() => setUnderstanding(option.value)} />{option.label}</label>)}</fieldset>
                <fieldset className={styles.fieldset}><legend>2. 목표 움직임을 어떻게 수행했나요?</legend>{MOVEMENT_OPTIONS.map((option) => <label key={option.value} className={styles.choice}><input type="radio" name="movement" checked={movement === option.value} onChange={() => setMovement(option.value)} />{option.label}</label>)}</fieldset>
                <fieldset className={styles.fieldset}><legend>3. 참여 결과</legend>{PARTICIPATION_OPTIONS.map((option) => <label key={option.value} className={styles.choice}><input type="radio" name="participation" checked={participation === option.value} onChange={() => setParticipation(option.value)} />{option.label}</label>)}</fieldset>
                {missionId && missionObservation(missionId) && (
                  <fieldset className={styles.fieldset}>
                    <legend>4. {missionObservation(missionId)?.prompt}</legend>
                    {missionObservation(missionId)?.choices.map((option) => <label key={option.value} className={styles.choice}><input type="radio" name="specific" checked={specificChoice === option.value} onChange={() => setSpecificChoice(option.value)} />{option.label}</label>)}
                    {participation !== 'finished' && <p className={styles.note}>일부 참여와 중단은 관찰하지 못했으면 선택하지 않은 채로 저장할 수 있습니다.</p>}
                  </fieldset>
                )}
                <label className={styles.fieldset}>자유 메모 (선택)<textarea className={styles.memo} value={memo} maxLength={2000} onChange={(event) => setMemo(event.target.value)} /></label>
                {formError && <p className={styles.alert} role="alert">{formError}</p>}
                <div className={styles.actions}><button type="submit" className={styles.primary}>관찰 저장</button></div>
              </form>
            )}
            {closed && saved && (
              <div className={styles.detail}>
                <h3>저장된 관찰</h3>
                <dl>
                  <dt>참여 상태</dt><dd>{STATUS_LABEL[status]}</dd>
                  <dt>지시 이해</dt><dd>{labelOf(UNDERSTANDING_OPTIONS, saved.understanding)}</dd>
                  <dt>움직임 수행</dt><dd>{labelOf(MOVEMENT_OPTIONS, saved.movement)}</dd>
                  <dt>참여 결과</dt><dd>{labelOf(PARTICIPATION_OPTIONS, saved.participation)}</dd>
                  <dt>메모</dt><dd>{saved.memo || '메모 없음'}</dd>
                  <dt>고유 관찰</dt><dd>{missionId && acceptedSpecific(missionId, saved.specific) && missionObservation(missionId) ? specificChoiceLabel(missionObservation(missionId)!, acceptedSpecific(missionId, saved.specific)!.choice) : UNANSWERED_SPECIFIC}</dd>
                  <dt>교육 피드백</dt><dd>{feedbackLines(missionId ?? '', saved).join(' ')}</dd>
                  <dt>수행 회차</dt><dd>{weekAttempts.length}회</dd>
                </dl>
                <button type="button" className={styles.secondary} onClick={() => apply(retryMission(store, { id: crypto.randomUUID(), childId: child.id, programId: HEALTH_LAB_PROGRAM_ID, missionId: missionId ?? '', missionVersion: activeWeek.version ?? 1, createdAt: new Date().toISOString() }))}>다시 수행</button>
              </div>
            )}
          </section>
        )}

        {mode === 'research' && (
          <section className={styles.panel}>
            <h2>연구 기록</h2>
            <p className={styles.note}>가상 아동 시범 데이터입니다. 미션 완료율과 생활습관 자기보고는 따로 봅니다.</p>
            <div className={styles.stats}>
              <div className={styles.metric}><span>전체 완료율</span><strong>{overall.completed} / {overall.required}</strong></div>
              <div className={styles.metric}><span>완료된 필수 배정</span><strong>{overall.completed}</strong></div>
              <div className={styles.metric}><span>배정된 필수 미션</span><strong>{overall.required}</strong></div>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.dataTable}>
                <thead><tr><th className={styles.dataHead}>아동</th><th className={styles.dataHead}>완료</th><th className={styles.dataHead}>배정</th><th className={styles.dataHead}>완료율</th><th className={styles.dataHead}>최근 수행 상태</th></tr></thead>
                <tbody>
                  {CHILDREN.map((item) => {
                    const itemSummary = completionSummary(store, item.id, REQUIRED_ASSIGNMENTS);
                    const latest = latestChildAttempt(store.attempts, item.id);
                    return (
                      <tr key={item.id}>
                        <td className={styles.dataCell}>{item.label}</td>
                        <td className={styles.dataCell}>{itemSummary.completed}</td>
                        <td className={styles.dataCell}>{itemSummary.required}</td>
                        <td className={styles.dataCell}>{itemSummary.completed} / {itemSummary.required}</td>
                        <td className={styles.dataCell}>{latest ? STATUS_LABEL[latest.status] : '시작 전'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <h3>{child.label} 수행 기록</h3>
            <div className={styles.tableWrap}>
              <table className={styles.dataTable}>
                <thead><tr><th className={styles.dataHead}>주차</th><th className={styles.dataHead}>미션</th><th className={styles.dataHead}>상태</th><th className={styles.dataHead}>회차</th></tr></thead>
                <tbody>
                  {LAB_WEEKS.map((week) => {
                    const attempts = week.missionId ? store.attempts.filter((attempt) => attempt.childId === child.id && attempt.missionId === week.missionId) : [];
                    const latest = attempts.at(-1);
                    return <tr key={week.week}><td className={styles.dataCell}>{week.week}주</td><td className={styles.dataCell}>{week.available ? week.mission : week.topic}</td><td className={styles.dataCell}>{week.available ? STATUS_LABEL[latest?.status ?? 'before'] : '준비 중'}</td><td className={styles.dataCell}>{week.available ? (attempts.length ? String(attempts.length) : '미기록') : '준비 중'}</td></tr>;
                  })}
                </tbody>
              </table>
            </div>
            <h3>수행 회차</h3>
            {childAttempts.length === 0 ? <p>수행 회차가 없습니다.</p> : (
              <div className={styles.detail}>
                {[...childAttempts].reverse().map((attempt, index) => (
                  <dl key={attempt.id}>
                    <dt>회차</dt><dd>{childAttempts.length - index} · {LAB_WEEKS.find((week) => week.missionId === attempt.missionId)?.mission ?? attempt.missionId}</dd>
                    <dt>참여 결과</dt><dd>{attempt.observation ? labelOf(PARTICIPATION_OPTIONS, attempt.observation.participation) : '기록 없음'}</dd>
                    <dt>활동 방법 이해</dt><dd>{attempt.observation ? labelOf(UNDERSTANDING_OPTIONS, attempt.observation.understanding) : '기록 없음'}</dd>
                    <dt>움직임 수행</dt><dd>{attempt.observation ? labelOf(MOVEMENT_OPTIONS, attempt.observation.movement) : '기록 없음'}</dd>
                    <dt>보호자 메모</dt><dd>{attempt.observation?.memo || '메모 없음'}</dd>
                    <dt>저장 일시</dt><dd>{attempt.observation?.savedAt ?? attempt.createdAt}</dd>
                    <dt>고유 관찰</dt><dd>{attempt.observation && acceptedSpecific(attempt.missionId, attempt.observation.specific) && missionObservation(attempt.missionId) ? specificChoiceLabel(missionObservation(attempt.missionId)!, acceptedSpecific(attempt.missionId, attempt.observation.specific)!.choice) : UNANSWERED_SPECIFIC}</dd>
                    <dt>교육 피드백</dt><dd>{attempt.observation ? feedbackLines(attempt.missionId, attempt.observation).join(' ') : '기록 없음'}</dd>
                  </dl>
                ))}
              </div>
            )}
            <h3>생활습관 자기보고</h3>
            <label className={styles.timeRow}>조회 날짜<input className={styles.dateInput} type="date" value={researchDate} onChange={(event) => setResearchDate(event.target.value)} /></label>
            <dl className={styles.detail}>
              <dt>채소 섭취</dt><dd>{choiceLabel(researchHabit.vegetables)}</dd>
              <dt>움직임 놀이</dt><dd>{choiceLabel(researchHabit.movementPlay)}</dd>
              <dt>전날 취침</dt><dd>{researchHabit.bedtime ?? '미기록'}</dd>
              <dt>당일 기상</dt><dd>{researchHabit.wakeTime ?? '미기록'}</dd>
              <dt>미디어 이용</dt><dd>{mediaLabel(researchHabit.mediaMinutes)}</dd>
              <dt>기록 누락</dt><dd>{researchMissing ? '일부 항목이 비어 있습니다.' : '네 영역이 모두 기록되었습니다.'}</dd>
            </dl>
          </section>
        )}
      </div>
    </div>
  );
}
