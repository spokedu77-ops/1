'use client';

import type { ReactNode } from 'react';
import type { TrainingResultKind } from '../../lib/trainingResultKind';
import { Brain, Lightbulb, RotateCcw } from 'lucide-react';
import styles from './ResultV2.module.css';
import { selectV2ResultCopy } from '../../lib/trainingResultEducation';
import type { TrainingResultViewInput } from '../../lib/trainingResultViewModel';

function StitchSymbol({ name }: { name: string }) {
  return <span className={styles.symbol} aria-hidden="true">{name}</span>;
}

export function ResultV2Frame({ theme, reason, children, layout = 'color-v2' }: { theme: string; reason: string; children: ReactNode; layout?: `${TrainingResultKind}-v2` }) {
  return <div className={styles.root} data-theme={theme} data-completion={reason} data-result-layout={layout}>
    <div className={styles.board}>
      {children}
    </div>
  </div>;
}

export function ResultV2Banner({ status, title, activity, description, student }: { status: string; title: string; activity: string; description: string; student?: string }) {
  return <section className={`${styles.surface} ${styles.banner}`} aria-labelledby="result-v2-title">
    <div className={styles.bannerCopy}>
      <div className={styles.identity}><span className={styles.status}>{status}</span>{student ? <span>{student}</span> : null}</div>
      <h1 id="result-v2-title">{title}</h1><p className={styles.activityName}>{activity}</p><p>{description}</p>
    </div>
  </section>;
}

export type ResultV2Metric = { label: string; value: string; note: string; progress?: { current: number; total: number } };
export function ResultV2Metrics({ items }: { items: ResultV2Metric[] }) {
  const icons = ['timer', 'flag', 'bolt'];
  return <dl className={styles.metrics}>{items.map((item, index) => {
    return <div key={item.label} className={styles.metric} data-tone={index}><dt><span className={styles.metricIcon}>{icons[index] ? <StitchSymbol name={icons[index]} /> : null}</span>{item.label}</dt><dd>{item.value}</dd><p>{item.note}</p>
    </div>;
  })}</dl>;
}

export function ResultV2RecordFrame({ children, feature, subtitle, badge, featureTitle = '기록 요약' }: { children: ReactNode; feature: string | null; subtitle: string; badge: string; featureTitle?: string }) {
  return <section className={`${styles.surface} ${styles.record}`} aria-labelledby="result-v2-record"><div className={styles.sectionHeading}><span className={styles.sectionIcon}><StitchSymbol name="grid_view" /></span><div><h2 id="result-v2-record">이번 활동의 기록</h2><p>{subtitle}</p></div><span className={styles.badge}>{badge}</span></div>{children}{feature ? <ResultV2Feature text={feature} title={featureTitle} /> : null}</section>;
}
export function ResultV2Feature({ text, title }: { text: string; title: string }) {
  return <section className={styles.feature}><RotateCcw size={19} aria-hidden="true" /><div><h3>{title}</h3><p>{text}</p></div></section>;
}

export function ResultV2Experiences({ items }: { items: { label: string; description: string }[] }) {
  return <section className={`${styles.surface} ${styles.education}`} aria-labelledby="result-v2-experiences"><div className={styles.sectionHeading}><span className={styles.sectionIcon}><Lightbulb size={20} aria-hidden="true" /></span><h2 id="result-v2-experiences">이번 활동에서 경험한 것</h2></div><ol className={styles.experiences}>{items.map((item, index) => <li key={item.label}><span aria-hidden="true">{index + 1}</span><div><h3>{item.label}</h3><p>{item.description}</p></div></li>)}</ol></section>;
}

export function ResultV2Reflection({ question, extra, movement }: { question: string; extra: string; movement: string }) {
  return <section className={`${styles.surface} ${styles.reflection}`} aria-labelledby="result-v2-reflection"><div className={styles.sectionHeading}><span className={styles.sectionIcon}><Brain size={20} aria-hidden="true" /></span><h2 id="result-v2-reflection">오늘의 생각 열기</h2></div><dl><div><dt>핵심 질문</dt><dd>{question}</dd></div><div><dt>추가 질문</dt><dd>{extra}</dd></div><div><dt>움직임 표현</dt><dd>{movement}</dd></div></dl></section>;
}

export function ResultV2Learning({ input, seed }: { input: Omit<TrainingResultViewInput, 'colorCounts'> & { colorCounts?: TrainingResultViewInput['colorCounts'] }; seed: number }) {
  const copy = selectV2ResultCopy({ ...input, colorCounts: input.colorCounts ?? null }, seed);
  return <aside className={styles.sidebar}><ResultV2Experiences items={copy.education.experiences} /><ResultV2Reflection question={copy.question} extra={copy.extra} movement={copy.movement} /></aside>;
}

export function ResultV2Actions({ onBack, onRetry, retryLabel, footer, additionalActions, notice }: { onBack: () => void; onRetry: () => void; retryLabel?: string; footer?: ReactNode; additionalActions?: ReactNode; notice?: ReactNode }) {
  return <section className={`${styles.surface} ${styles.actionArea}`} aria-label="활동 후 행동">
    {notice ? <div className={styles.actionNotice}>{notice}</div> : null}
    <nav className={styles.actions} aria-label="활동 결과 행동">{additionalActions ?? <><button type="button" onClick={onBack}><StitchSymbol name="arrow_back" />활동 목록으로</button><button type="button" className={styles.primary} onClick={onRetry}><StitchSymbol name="replay" />{retryLabel ?? '다시 도전하기'}</button></>}{footer}</nav>
  </section>;
}
