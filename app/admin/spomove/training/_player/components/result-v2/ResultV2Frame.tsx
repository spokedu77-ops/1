'use client';

import type { ReactNode } from 'react';
import type { TrainingResultKind } from '../../lib/trainingResultKind';
import { Brain, Flag, LayoutGrid, Lightbulb, List, RotateCcw, Timer, Zap } from 'lucide-react';
import styles from './ResultV2.module.css';

export function ResultV2Frame({ theme, reason, children, layout = 'color-v2' }: { theme: string; reason: string; children: ReactNode; layout?: `${TrainingResultKind}-v2` }) {
  return <div className={styles.root} data-theme={theme} data-completion={reason} data-result-layout={layout}>
    <div className={styles.board}>
      <header className={styles.header}><strong className={styles.brand}>SPOKEDU <span>· SPOMOVE</span></strong><p>시각정보를 움직임으로 연결하는 체육활동</p><span className={styles.badge}>활동 결과 리포트</span></header>
      {children}
    </div>
  </div>;
}

export function ResultV2Banner({ status, title, activity, description, student }: { status: string; title: string; activity: string; description: string; student?: string }) {
  return <section className={`${styles.surface} ${styles.banner}`} aria-labelledby="result-v2-title">
    <span className={styles.emblem} aria-hidden="true">S</span><div className={styles.bannerCopy}>
      <div className={styles.identity}><span className={styles.status}>{status}</span>{student ? <span>{student}</span> : null}</div>
      <h1 id="result-v2-title">{title}</h1><p className={styles.activityName}>{activity}</p><p>{description}</p>
    </div><span className={styles.bannerLabel}>이번 활동의 기록</span>
  </section>;
}

export type ResultV2Metric = { label: string; value: string; note: string; progress?: { current: number; total: number } };
export function ResultV2Metrics({ items }: { items: ResultV2Metric[] }) {
  const icons = [Timer, Flag, Zap];
  return <dl className={styles.metrics}>{items.map((item, index) => {
    const Icon = icons[index];
    return <div key={item.label} className={styles.metric} data-tone={index}><dt><span className={styles.metricIcon}>{Icon ? <Icon size={18} aria-hidden="true" /> : null}</span>{item.label}</dt><dd>{item.value}</dd><p>{item.note}</p>
      {item.progress ? <div className={styles.progress} role="progressbar" aria-label={item.label} aria-valuemin={0} aria-valuemax={item.progress.total} aria-valuenow={item.progress.current}><span style={{ width: `${Math.min(100, item.progress.current / item.progress.total * 100)}%` }} /></div> : <div className={styles.metricRule} aria-hidden="true" />}
    </div>;
  })}</dl>;
}

export function ResultV2RecordFrame({ children, feature, subtitle, badge }: { children: ReactNode; feature: string | null; subtitle: string; badge: string }) {
  return <section className={`${styles.surface} ${styles.record}`} aria-labelledby="result-v2-record"><div className={styles.sectionHeading}><span className={styles.sectionIcon}><LayoutGrid size={20} aria-hidden="true" /></span><div><h2 id="result-v2-record">이번 활동의 기록</h2><p>{subtitle}</p></div><span className={styles.badge}>{badge}</span></div>{children}{feature ? <ResultV2Feature text={feature} /> : null}</section>;
}

export function ResultV2Feature({ text }: { text: string }) {
  return <section className={styles.feature}><RotateCcw size={19} aria-hidden="true" /><div><h3>이번 활동의 특징</h3><p>{text}</p></div></section>;
}

export function ResultV2Experiences({ items }: { items: { label: string; description: string }[] }) {
  return <section className={`${styles.surface} ${styles.education}`} aria-labelledby="result-v2-experiences"><div className={styles.sectionHeading}><span className={styles.sectionIcon}><Lightbulb size={20} aria-hidden="true" /></span><h2 id="result-v2-experiences">이번 활동에서 경험한 것</h2></div><ol className={styles.experiences}>{items.map((item, index) => <li key={item.label}><span aria-hidden="true">{index + 1}</span><div><h3>{item.label}</h3><p>{item.description}</p></div></li>)}</ol></section>;
}

export function ResultV2Reflection({ question, extra, movement }: { question: string; extra: string; movement: string }) {
  return <section className={`${styles.surface} ${styles.reflection}`} aria-labelledby="result-v2-reflection"><div className={styles.sectionHeading}><span className={styles.sectionIcon}><Brain size={20} aria-hidden="true" /></span><h2 id="result-v2-reflection">오늘의 생각 열기</h2></div><dl><div><dt>핵심 질문</dt><dd>{question}</dd></div><div><dt>추가 질문</dt><dd>{extra}</dd></div><div><dt>움직임 표현</dt><dd>{movement}</dd></div></dl><p className={styles.reflectionNote}>정답을 고르지 않아도 괜찮아요. 자신이 보고 생각한 과정을 자유롭게 이야기해 보세요.</p></section>;
}

export function ResultV2Actions({ onBack, onRetry, retryLabel, footer, additionalActions, notice }: { onBack: () => void; onRetry: () => void; retryLabel?: string; footer?: ReactNode; additionalActions?: ReactNode; notice?: ReactNode }) {
  return <section className={`${styles.surface} ${styles.actionArea}`} aria-label="활동 후 행동">
    {notice ? <div className={styles.actionNotice}>{notice}</div> : null}
    <nav className={styles.actions} aria-label="활동 결과 행동">{additionalActions ?? <><button type="button" onClick={onBack}><List size={20} aria-hidden="true" />활동 목록으로</button><button type="button" className={styles.primary} onClick={onRetry}><RotateCcw size={22} aria-hidden="true" />{retryLabel ?? '다시 도전하기'}</button></>}{footer}</nav>
  </section>;
}
