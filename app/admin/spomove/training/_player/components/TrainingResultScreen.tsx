'use client';

import React, { useState } from 'react';
import type { GlassBridgeResult } from '../lib/glassBridgeMemory';
import type { DiveActionMoveSession } from '../lib/diveActionMoveReport';
import type { ColorStimulusCounts, TrainingResultConfig } from '../lib/trainingResultSummary';
import type { SpomoveCompletionReason } from '@/app/spokedu-master/spomove/session/sessionResultModel';
import type { ResultFact } from '../lib/trainingResultViewModel';
import { buildTrainingResultPresentation } from '../lib/trainingResultPresentation';
import { ClipboardCheck, Flag, Info, LayoutGrid, Lightbulb, RotateCcw, Timer, Zap, List } from 'lucide-react';
import { CSS } from '../styles';
import { useViewportScrollLock } from '../lib/lockViewportScroll';
import styles from './TrainingResultScreen.module.css';
import { TrainingResultActivityVisual } from './TrainingResultActivityVisual';

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
  education?: { description: string; tags: string[] };
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
  const icons = [Timer, RotateCcw, Flag];
  return <dl className={summary ? styles.summaryFacts : styles.facts}>{items.map((item, index) => {
    const Icon = icons[index];
    const value = summary ? /^(\d+(?:\/\d+)?)(초|회|개|라운드)$/.exec(item.value) : null;
    return <div key={item.id}><dt>{summary && Icon ? <Icon size={14} aria-hidden="true" /> : null}{item.label}</dt><dd>{value ? <>{value[1]}<small>{value[2]}</small></> : item.value}</dd></div>;
  })}</dl>;
}

const POSITIONS = { red: '좌측 상단', yellow: '우측 상단', green: '좌측 하단', blue: '우측 하단' } as const;

export function TrainingResultScreen(props: Props) {
  const vm = buildTrainingResultPresentation(props);
  const [theme] = useState(() => typeof window !== 'undefined' && localStorage.getItem('spokedu_theme') === 'dark' ? 'dark' : 'light');
  useViewportScrollLock(true);
  return (
    <div className={`spomove-player-root tr-result-root ${styles.root}`} data-theme={theme} data-completion={vm.reason}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      {/* Result-only display font, intentionally scoped to this screen. */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&display=swap" />
      <style>{CSS}</style>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}><span className={styles.brandIcon}><Zap size={24} aria-hidden="true" /></span><div><div className={styles.brandLine}><span className={styles.wordmark}>SPOMOVE</span><span className={styles.reportBadge}>ACTIVITY REPORT</span></div><p>시각정보를 움직임으로 연결하는 체육활동</p></div></div>
          <span className={styles.headerTitle}><ClipboardCheck size={14} aria-hidden="true" />활동 결과</span>
        </div>
      </header>
      <main className={styles.scroll}>
        <div className={styles.board}>
          <section className={`${styles.card} ${styles.mission}`} aria-labelledby="tr-mission-title">
            <div className={styles.missionCopy}>
              <div className={styles.identity}><span className={styles.category}>시지각 움직임 활동</span><span className={styles.status}>{vm.status}</span></div>
              <div className={styles.missionHeading}><h1 id="tr-mission-title">{vm.title}</h1><span className={styles.separator} aria-hidden="true">·</span><p className={styles.activity}>{vm.activityTitle}</p></div>
              <p className={styles.description}><Info size={15} aria-hidden="true" />{vm.description}</p>
              {props.student ? <p className={styles.muted}>{props.student.name}의 활동 기록</p> : null}
            </div>
            <FactList summary items={vm.summary} />
          </section>

          <section className={`${styles.card} ${styles.record}`} aria-labelledby="tr-record-title">
            <div className={styles.sectionHeading}>
              <div className={styles.sectionTitle}><span className={styles.sectionIcon}><LayoutGrid size={16} aria-hidden="true" /></span><h2 id="tr-record-title">{vm.recordTitle}</h2><span className={styles.sectionSubtitle}>{vm.recordSubtitle}</span></div>
              <span className={styles.layoutBadge}>{vm.recordBadge}</span>
            </div>
            {vm.visual && vm.recordFacts.length ? <div className={styles.observedRecord}><h3>이번 활동의 실제 기록{props.glassBridge ? ' · 교사 입력' : ''}</h3><FactList items={vm.recordFacts} /></div> : null}
            {vm.hasDistribution ? <ul className={styles.distribution} aria-label={vm.distributionTitle}>
              {vm.distribution.map((item, index) => <li key={item.id} data-color={vm.distributionKind === 'number' ? undefined : item.id} data-empty={item.count === 0}>
                <div className={styles.colorLabel}><span className={styles.dot} aria-hidden="true">{vm.distributionKind === 'number' ? index + 1 : null}</span><div><div className={styles.zoneHeading}><strong>{item.label}</strong>{vm.distributionKind === 'zone' ? <span className={styles.position}>{POSITIONS[item.id]}</span> : null}</div><span className={styles.countLabel}>{item.count === 0 ? '이번 활동에서는 나오지 않았어요' : vm.distributionKind === 'zone' ? '목표가 제시된 구역' : '화면에 제시된 자극'}</span></div></div>
                <div className={styles.zoneValue}><span className={styles.countBadge}>{item.count === 0 ? '출현 없음' : `${item.count}회 출현`}</span><strong>{item.count}<span>회</span></strong></div>
              </li>)}
            </ul> : vm.visual ? <TrainingResultActivityVisual visual={vm.visual} /> : null}
            {vm.hasDistribution && vm.recordFacts.length ? <FactList items={vm.recordFacts} /> : null}
            {vm.hasDistribution && props.sessionSettings?.primary.trim() ? <p className={styles.settings}>{[props.sessionSettings.primary, props.sessionSettings.secondary].filter(Boolean).join(' · ')}</p> : null}
            {vm.note ? <p className={styles.note}><Info size={14} aria-hidden="true" />{vm.note}</p> : null}
          </section>

          <div className={styles.bottom}>
            <section className={`${styles.card} ${styles.education}`} aria-labelledby="tr-about-title">
              <h2 id="tr-about-title"><Lightbulb size={16} aria-hidden="true" />이 활동은?</h2>
              <p>{vm.activityDescription}</p>
              {vm.educationTags.length ? <ul className={styles.educationElements} aria-label="활동에서 경험하는 요소">{vm.educationTags.map(tag => <li key={tag}><span aria-hidden="true">#</span>{tag}</li>)}</ul> : null}
            </section>
            <nav className={styles.actions} aria-label="활동 결과 행동">
              <button type="button" className={styles.button} onClick={props.onBack}><List size={16} aria-hidden="true" />활동 목록으로</button>
              <button type="button" className={`${styles.button} ${styles.primary}`} onClick={props.onRetry}><RotateCcw size={17} aria-hidden="true" />{props.retryLabel ?? '다시 활동하기'}</button>
            </nav>
          </div>
          {props.footer ? <footer className={styles.footer}>{props.footer}</footer> : null}
        </div>
      </main>
    </div>
  );
}
