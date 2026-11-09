'use client';

import React, { useState } from 'react';
import type { GlassBridgeResult } from '../lib/glassBridgeMemory';
import type { DiveActionMoveSession } from '../lib/diveActionMoveReport';
import type { ColorStimulusCounts, TrainingResultConfig } from '../lib/trainingResultSummary';
import type { SpomoveCompletionReason } from '@/app/spokedu-master/spomove/session/sessionResultModel';
import { buildTrainingResultViewModel, type ResultFact } from '../lib/trainingResultViewModel';
import { ClipboardCheck, Flag, Info, LayoutGrid, Lightbulb, RotateCcw, Timer, Target } from 'lucide-react';
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
  /** 유효한 실제 사용 설정 요약입니다. */
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

function FactList({ items, summary = false }: { items: ResultFact[]; summary?: boolean }) {
  const icons = [Timer, Flag, Target];
  return <dl className={styles.facts}>{items.map((item, index) => {
    const Icon = icons[index];
    return <div key={item.id}><dt>{summary && Icon ? <Icon size={21} aria-hidden="true" /> : null}{item.label}</dt><dd>{item.value}</dd></div>;
  })}</dl>;
}

export function TrainingResultScreen(props: Props) {
  const vm = buildTrainingResultViewModel(props);
  const [theme] = useState(() => typeof window !== 'undefined' && localStorage.getItem('spokedu_theme') === 'dark' ? 'dark' : 'light');
  useViewportScrollLock(true);
  const hasDistribution = vm.distribution.length > 0;
  // Top-level facts already show elapsed time and task count. Keep other recorded units here.
  const extraFacts = vm.facts.filter(item => {
    if (item.id === 'elapsed' || item.id === 'tasks') return false;
    if (hasDistribution && item.id === 'targets') return false;
    if (item.id === 'presented') return props.glassBridge?.scoringMode === 'color-choice';
    if (item.id === 'completed' && props.glassBridge?.scoringMode === 'color-choice') return false;
    if (props.glassBridge?.scoringMode === 'color-choice' && ['success', 'failure'].includes(item.id)) return false;
    return true;
  });
  const recordTitle = hasDistribution
    ? vm.distributionKind === 'zone' ? '이번 활동에서 목표가 나타난 구역' : vm.distributionTitle
    : '이번 활동의 기록';
  return (
    <div className={`spomove-player-root tr-result-root ${styles.root}`} data-theme={theme} data-completion={vm.reason}>
      <style>{CSS}</style>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}><span className={styles.wordmark}>SPOMOVE</span><span>스마트 인지놀이 체육</span></div>
          <span className={styles.headerTitle}><ClipboardCheck size={21} aria-hidden="true" />활동 결과 리포트</span>
        </div>
      </header>
      <main className={styles.scroll}>
        <div className={styles.board}>
          <section className={`${styles.card} ${styles.mission}`} aria-labelledby="tr-mission-title">
            <div className={styles.identity}><span className={styles.status}>{vm.status}</span><span>스마트 신체인지 활동</span></div>
            <div className={styles.missionHeading}><h1 id="tr-mission-title">{vm.title}</h1><p className={styles.activity}>{vm.activityTitle}</p></div>
            {props.student ? <p className={styles.muted}>{props.student.name}의 활동 기록</p> : null}
            <FactList summary items={[
              { id: 'elapsed', label: '활동 시간', value: vm.elapsed },
              { id: 'volume', label: '설정 분량', value: vm.volume },
              { id: 'progress', label: '실제 진행량', value: vm.progress },
            ]} />
          </section>

          <section className={styles.card} aria-labelledby="tr-record-title">
            <div className={styles.sectionHeading}>
              <h2 id="tr-record-title">{recordTitle}</h2>
              {hasDistribution ? <p className={styles.muted}>{vm.distributionKind === 'zone' ? 'SPOMAT 4구역 발판 배치 기준' : vm.distributionKind === 'number' ? '숫자별 실제 출현 기록' : '실제 색상 자극 제시 기록'}</p> : null}
            </div>
            {hasDistribution ? <ul className={styles.distribution} aria-label={vm.distributionTitle}>
              {vm.distribution.map(item => <li key={item.id} data-color={vm.distributionKind === 'number' ? undefined : item.id}>
                <div className={styles.colorLabel}><span className={styles.dot} aria-hidden="true" /><div><span>{item.label}</span><span className={styles.countLabel}>출현 횟수</span></div></div>
                <strong>{item.count}<span>회</span></strong>
              </li>)}
            </ul> : null}
            {extraFacts.length ? <FactList items={extraFacts} /> : null}
            {!hasDistribution && vm.settings.length ? <FactList items={vm.settings} /> : null}
            {hasDistribution && props.sessionSettings?.primary.trim() ? <p className={styles.settings}>{[props.sessionSettings.primary, props.sessionSettings.secondary].filter(Boolean).join(' · ')}</p> : null}
            <p className={styles.note}><Info size={22} aria-hidden="true" />{vm.recordNote}</p>
          </section>

          <div className={styles.bottom}>
            <section className={`${styles.card} ${styles.education}`} aria-labelledby="tr-about-title">
              <h2 id="tr-about-title"><Lightbulb size={22} aria-hidden="true" />이 활동은?</h2>
              <p>{vm.activityDescription}</p>
              {vm.educationTags.length ? <div className={styles.educationElements}><h3>교육적 요소</h3><ul>{vm.educationTags.map(tag => <li key={tag}>{tag}</li>)}</ul></div> : null}
            </section>
            <nav className={styles.actions} aria-label="활동 결과 행동">
              <button type="button" className={styles.button} onClick={props.onBack}><LayoutGrid size={22} aria-hidden="true" />활동 목록으로</button>
              <button type="button" className={`${styles.button} ${styles.primary}`} onClick={props.onRetry}><RotateCcw size={22} aria-hidden="true" />{props.retryLabel ?? '다시 실행'}</button>
            </nav>
          </div>
          {props.footer ? <footer className={styles.footer}>{props.footer}</footer> : null}
        </div>
      </main>
    </div>
  );
}
