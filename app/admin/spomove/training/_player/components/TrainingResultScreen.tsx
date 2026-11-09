'use client';

import React, { useState } from 'react';
import type { GlassBridgeResult } from '../lib/glassBridgeMemory';
import type { DiveActionMoveSession } from '../lib/diveActionMoveReport';
import type { ColorStimulusCounts, TrainingResultConfig } from '../lib/trainingResultSummary';
import type { SpomoveCompletionReason } from '@/app/spokedu-master/spomove/session/sessionResultModel';
import { buildTrainingResultViewModel, type ResultFact } from '../lib/trainingResultViewModel';
import { MODES } from '../constants';
import { CSS } from '../styles';
import { useViewportScrollLock } from '../lib/lockViewportScroll';
import styles from './TrainingResultScreen.module.css';

type StudentBadge = { name: string; color: string };

/** MASTER 세션 등 — 측정 점수가 아닌 실제 사용 설정 요약 */
export type TrainingResultSessionSettings = {
  title?: string;
  primary: string;
  secondary?: string;
};

type Props = {
  cfg: TrainingResultConfig;
  /** Canonical terminal state shared by Admin, Teacher and MASTER/LAB. */
  completionReason?: SpomoveCompletionReason;
  elapsedMs: number;
  colorCounts: ColorStimulusCounts | null;
  stims?: number;
  glassBridge?: GlassBridgeResult;
  levelLabel: string;
  title?: string;
  statusBadge?: string | null;
  programTitle?: string;
  student?: StudentBadge | null;
  /** 유효한 실제 사용 설정만 지도자 상세에 표시합니다. */
  sessionSettings?: TrainingResultSessionSettings | null;
  footer?: React.ReactNode;
  /** DIVE 액션무브 결과만. 없으면 기존 훈련 리포트를 유지한다. */
  diveActionMove?: DiveActionMoveSession | null;
  /** MASTER execution-volume SSOT. Admin results keep describeSessionVolume. */
  volumeLabel?: string;
  onBack: () => void;
  onRetry: () => void;
  retryLabel?: string;
};

const FEELINGS = [
  { label: '쉬웠어요', icon: '☀', reply: '느낌을 알려줘서 고마워요. 다음에도 함께해요!' },
  { label: '괜찮았어요', icon: '◡', reply: '느낌을 나눠줘서 고마워요. 잠깐 쉬어도 좋아요!' },
  { label: '어려웠어요', icon: '△', reply: '솔직하게 알려줘서 고마워요. 선생님과 함께 이야기해 봐요!' },
] as const;

function FactList({ items }: { items: ResultFact[] }) {
  return <dl className={styles.facts}>{items.map(item => (
    <div key={item.id}><dt>{item.label}</dt><dd>{item.value}</dd></div>
  ))}</dl>;
}

export function TrainingResultScreen(props: Props) {
  const vm = buildTrainingResultViewModel(props);
  const [feeling, setFeeling] = useState<number | null>(null);
  const [theme] = useState(() => typeof window !== 'undefined' && localStorage.getItem('spokedu_theme') === 'dark' ? 'dark' : 'light');
  useViewportScrollLock(true);
  const accent = MODES[props.cfg.mode]?.accent ?? '#F97316';
  return (
    <div className={`spomove-player-root tr-result-root ${styles.root}`} data-theme={theme}
      data-completion={vm.reason} style={{ '--tr-accent': accent } as React.CSSProperties}>
      <style>{CSS}</style>
      <header className={styles.header}>
        <button type="button" className={styles.button} onClick={props.onBack}>목록</button>
        <span className={styles.headerTitle}>오늘의 활동 기록</span>
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={props.onRetry}>{props.retryLabel ?? '다시 실행'}</button>
      </header>
      <main className={styles.scroll}>
        <div className={styles.board}>
          <section className={`${styles.card} ${styles.mission}`} aria-labelledby="tr-mission-title">
            <div className={styles.missionHeading}>
              <div>
                <p className={styles.eyebrow}>오늘의 미션 결과</p>
                <h1 id="tr-mission-title">{vm.title}</h1>
                <p className={styles.activity}>{vm.activityTitle}</p>
                {props.student ? <p className={styles.muted}>{props.student.name}의 활동 기록</p> : null}
              </div>
              <span className={styles.status}>{vm.status}</span>
            </div>
            <p className={styles.muted}>{vm.description}</p>
            <FactList items={[
              { id: 'elapsed', label: '실제 진행 시간', value: vm.elapsed },
              { id: 'volume', label: '설정 분량', value: vm.volume },
              { id: 'progress', label: '실제 진행량', value: vm.progress },
            ]} />
          </section>

          <div className={styles.middle}>
            <section className={styles.card} aria-labelledby="tr-record-title">
              <p className={styles.eyebrow}>이번에 남긴 기록</p>
              <h2 id="tr-record-title">오늘의 활동 기록</h2>
              {vm.facts.length ? <FactList items={vm.facts} /> : null}
              {vm.distribution.length ? <div className={styles.distribution}>
                <h3>{vm.distributionTitle}</h3>
                <ul>{vm.distribution.map(item => <li key={item.id}>
                  <span>{item.label}</span>
                  <span className={styles.track} aria-hidden="true"><span style={{ width: `${item.width}%`, background: item.color }} /></span>
                  <strong>{item.count}회</strong>
                </li>)}</ul>
              </div> : null}
              <p className={styles.note}>{vm.recordNote}</p>
            </section>
            {vm.showFeeling ? <section className={`${styles.card} ${styles.feeling}`} aria-labelledby="tr-feeling-title">
              <p className={styles.eyebrow}>정답 없는 나의 이야기</p>
              <h2 id="tr-feeling-title">내 느낌</h2>
              <p className={styles.muted}>오늘 활동은 어땠나요?</p>
              <div className={styles.feelingChoices} role="group" aria-label="오늘 활동의 느낌">
                {FEELINGS.map((item, index) => <button key={item.label} type="button" aria-pressed={feeling === index}
                  onClick={() => setFeeling(feeling === index ? null : index)}>
                  <span className={styles.feelingIcon} aria-hidden="true">{item.icon}</span>{item.label}
                </button>)}
              </div>
              <p className={styles.muted}>선택은 자유예요. 결과 점수에 영향을 주지 않아요.</p>
              <p role="status" className={styles.reply}>{feeling !== null ? FEELINGS[feeling].reply : ''}</p>
            </section> : null}
          </div>

          <section className={`${styles.card} ${styles.challenge}`} aria-labelledby="tr-challenge-title">
            <p className={styles.eyebrow}>다시 해볼 때 떠올려요</p>
            <h2 id="tr-challenge-title">다음 도전</h2>
            <p>{vm.nextChallenge}</p>
          </section>
          <details className={`${styles.card} ${styles.details}`}>
            <summary>지도자 상세 분석 <span className={styles.muted}>기록과 지도 방법 확인</span></summary>
            <div className={styles.detailContent}>
              <section><h3>활동 목표</h3><p>{vm.objective}</p></section>
              <section><h3>실제 기록</h3><FactList items={[
                { id: 'status', label: '종료 상태', value: vm.status },
                { id: 'elapsed', label: '실제 진행 시간', value: vm.elapsed },
                ...vm.facts.filter(item => item.id !== 'elapsed'),
              ]} /></section>
              <section><h3>교육적 의미</h3><p>{vm.meaning}</p></section>
              <section><h3>지도 포인트</h3><p>{vm.nextChallenge}</p><p className={styles.muted}>다음 수업에서 목표를 확인하는 과정과 이동 후 균형을 관찰해 주세요.</p></section>
              <section><h3>사용한 설정</h3><FactList items={[{ id: 'volume', label: '설정 분량', value: vm.volume }, ...vm.settings]} /></section>
              <section><h3>기록 한계</h3><ul className={styles.limits}>{vm.limitations.map(line => <li key={line}>{line}</li>)}</ul></section>
            </div>
          </details>
          {props.footer ? <footer className={styles.footer}>{props.footer}</footer> : null}
        </div>
      </main>
    </div>
  );
}
