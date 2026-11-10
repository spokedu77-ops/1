'use client';

import React, { useState } from 'react';
import type { GlassBridgeResult } from '../lib/glassBridgeMemory';
import type { DiveActionMoveSession } from '../lib/diveActionMoveReport';
import type { ColorStimulusCounts, TrainingResultConfig } from '../lib/trainingResultSummary';
import type { SpomoveCompletionReason } from '@/app/spokedu-master/spomove/session/sessionResultModel';
import type { ResultFact } from '../lib/trainingResultViewModel';
import { buildTrainingResultPresentation } from '../lib/trainingResultPresentation';
import { Brain, CheckCircle2, Compass, Crosshair, Flag, Info, LayoutGrid, Lightbulb, RotateCcw, Timer, List } from 'lucide-react';
import { CSS } from '../styles';
import { useViewportScrollLock } from '../lib/lockViewportScroll';
import styles from './TrainingResultScreen.module.css';
import { TrainingResultEducation } from './TrainingResultEducation';

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
    const value = summary ? /^(\d+(?:\/\d+)?)(초|회|개|라운드|과제)$/.exec(item.value) : null;
    return <div key={item.id}><dt>{summary && Icon ? <span className={styles.factIcon}><Icon size={19} aria-hidden="true" /></span> : null}{item.label}</dt><dd>{value ? <>{value[1]}<small>{value[2]}</small></> : item.value}</dd></div>;
  })}</dl>;
}

const POSITIONS = { red: '좌측 상단', yellow: '우측 상단', green: '좌측 하단', blue: '우측 하단' } as const;

export function TrainingResultScreen(props: Props) {
  const [educationSeed] = useState(() => Math.floor(Math.random() * 1024));
  const vm = buildTrainingResultPresentation(props, educationSeed);
  const twoColumns = vm.showDistribution || vm.layout === 'direction';
  const RecordIcon = vm.layout === 'direction' ? Compass : LayoutGrid;
  const [theme] = useState(() => typeof window !== 'undefined' && localStorage.getItem('spokedu_theme') === 'dark' ? 'dark' : 'light');
  useViewportScrollLock(true);
  return (
    <div className={`spomove-player-root tr-result-root ${styles.root}`} data-theme={theme} data-completion={vm.reason} data-result-layout={vm.layout}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      <style>{CSS}</style>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}><span className={styles.brandIcon} aria-hidden="true">S</span><div><span className={styles.wordmark}>SPOMOVE</span><p>시각정보를 움직임으로 연결하는 체육활동</p></div></div>
          <div className={styles.headerMeta}><span className={styles.headerTitle}><span aria-hidden="true" />활동 결과 리포트</span>{props.student ? <span className={styles.student}>{props.student.name}</span> : null}</div>
        </div>
      </header>
      <main className={styles.scroll}>
        <div className={styles.board}>
          <section className={`${styles.card} ${styles.mission}`} aria-labelledby="tr-mission-title">
            <div className={styles.missionCopy}>
              <div className={styles.identity}><span className={styles.status}>{vm.status}</span><span className={styles.category}>시지각 움직임 활동</span></div>
              <h1 id="tr-mission-title">{vm.title} <span className={styles.activity}>{vm.activityTitle}</span></h1>
              <p className={styles.description}>{vm.description}</p>
            </div>
            <FactList summary items={vm.summary} />
          </section>

          <div className={twoColumns ? styles.contentGrid : undefined}>
            <section className={`${styles.card} ${styles.record} ${twoColumns ? styles.distributionRecord : ''}`} aria-labelledby="tr-record-title">
              <div className={styles.sectionHeading}>
                <div className={styles.sectionTitle}><span className={styles.sectionIcon}><RecordIcon size={18} aria-hidden="true" /></span><div><h2 id="tr-record-title">{vm.recordTitle}</h2><p className={styles.sectionSubtitle}>{vm.recordSubtitle}</p></div></div>
                <span className={styles.layoutBadge}>{vm.recordBadge}</span>
              </div>
              {vm.feedback && vm.recordFacts.length ? <div className={styles.observedRecord}><h3>이번 활동의 실제 기록{props.glassBridge ? ' · 교사 입력' : ''}</h3><FactList items={vm.recordFacts} /></div> : null}
              {vm.direction ? <>
                <ul className={styles.directionGrid} aria-label="방향 신호 안내와 제시 기록">
                  {vm.direction.cells.map((item, index) => <React.Fragment key={item.id}>
                    {index === 4 ? <li className={styles.directionCenter}><Crosshair size={22} aria-hidden="true" /><strong>방향 기준</strong><span>화면 기준 안내</span></li> : null}
                    <li className={styles.directionCell} data-supported={item.supported} data-presented={item.count !== null && item.count > 0} data-peak={item.mostFrequent}>
                      <div className={styles.directionHeading}><strong><span aria-hidden="true">{item.icon}</span>{item.label}</strong><span className={item.mostFrequent ? styles.peakBadge : undefined}>{item.mostFrequent ? '최다' : item.diagonal ? '대각선' : '직선'}</span></div>
                      <div className={styles.directionBottom}><span>{!item.supported ? '사용하지 않음' : item.count === null ? '개별 기록 없음' : item.count === 0 ? '미제시' : '신호 제시'}</span><strong>{item.supported ? item.count ?? '—' : '—'}{item.count !== null ? <small>회</small> : null}</strong></div>
                    </li>
                  </React.Fragment>)}
                </ul>
                <p className={styles.note}><Info size={18} aria-hidden="true" />{vm.direction.note}</p>
              </> : vm.showDistribution ? <ul className={styles.distribution} aria-label={vm.distributionTitle}>
                {vm.displayDistribution.map((item, index) => <li key={item.id} data-color={vm.distributionKind === 'number' ? undefined : item.id} data-empty={item.count === 0 || item.count === null}>
                  <div className={styles.zoneHeading}><div className={styles.colorLabel}><span className={styles.dot} aria-hidden="true">{vm.distributionKind === 'number' ? index + 1 : null}</span><strong>{item.label}</strong></div>{vm.distributionKind === 'zone' ? <span className={styles.position}>{POSITIONS[item.id]}</span> : null}</div>
                  <div className={styles.zoneBottom}><span className={item.count === 0 || item.count === null ? styles.countLabel : styles.cueLabel}>{item.count === null ? '개별 기록 없음' : item.count === 0 ? '이번엔 나오지 않았어요' : vm.distributionKind === 'zone' ? '목표 출현' : '자극 제시'}</span><div className={styles.zoneValue}><strong>{item.count ?? '—'}{item.count !== null ? <span>회</span> : null}</strong></div></div>
                </li>)}
              </ul> : vm.feedback ? <TrainingResultEducation feedback={vm.feedback} /> : null}
              {vm.showDistribution ? <p className={styles.note}><CheckCircle2 size={18} aria-hidden="true" />{vm.distributionNote}</p> : null}
              {twoColumns && vm.recordFacts.length ? <div>{props.glassBridge ? <p className={styles.settings}>교사가 입력한 활동 기록</p> : null}<FactList items={vm.recordFacts} /></div> : null}
              {twoColumns && props.sessionSettings?.primary.trim() ? <p className={styles.settings}>{[props.sessionSettings.primary, props.sessionSettings.secondary].filter(Boolean).join(' · ')}</p> : null}
              {!twoColumns && vm.note ? <p className={styles.note}><Info size={14} aria-hidden="true" />{vm.note}</p> : null}
            </section>

            {twoColumns ? <section className={`${styles.card} ${styles.education}`} aria-labelledby="tr-about-title">
              <div className={styles.aboutActivity}>
                <div className={styles.aboutHeading}><h2 id="tr-about-title"><Info size={18} aria-hidden="true" />이 활동은?</h2>
                  <ul className={styles.educationElements} aria-label="활동에서 경험하는 요소">{vm.educationTags.map(tag => <li key={tag}>#{tag}</li>)}</ul>
                </div>
                <p>{vm.activityDescription}</p>
              </div>
              <section className={styles.reflection} aria-labelledby="tr-reflection-title">
                <div className={styles.reflectionHeading}><h3 id="tr-reflection-title"><Brain size={18} aria-hidden="true" />오늘의 생각 열기</h3><span>열린 생각</span></div>
                <div className={styles.keyQuestion}><span>핵심 질문</span><p>{vm.reflection.question}</p></div>
                <ol className={styles.reflectionPrompts}>{vm.reflection.prompts.map(prompt => <li key={prompt}>{prompt}</li>)}</ol>
                <p className={styles.reflectionHint}><Lightbulb size={16} aria-hidden="true" /><span>{vm.reflection.hint}</span></p>
              </section>
            </section> : null}
          </div>
          <nav className={styles.actions} aria-label="활동 결과 행동">
            <button type="button" className={styles.button} onClick={props.onBack}><List size={16} aria-hidden="true" />활동 목록으로</button>
            <button type="button" className={`${styles.button} ${styles.primary}`} onClick={props.onRetry}><RotateCcw size={18} aria-hidden="true" />{props.retryLabel ?? '다시 도전하기'}</button>
          </nav>
          {props.footer ? <footer className={styles.footer}>{props.footer}</footer> : null}
        </div>
      </main>
      <footer className={styles.pageFooter}><div><span>© SPOKEDU · SPOMOVE</span><span>화면에 제시된 신호와 실제 진행 기록을 함께 살펴보세요.</span></div></footer>
    </div>
  );
}
