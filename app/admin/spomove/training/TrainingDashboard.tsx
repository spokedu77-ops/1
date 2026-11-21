'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useAppSidebar } from '@/app/providers/AppSidebarProvider';
import styles from './TrainingDashboard.module.css';
import { SpomoveCatalogHero } from './_player/components/SpomoveCatalogHero';

type Tab = 'training' | 'teacher' | 'app';
import { TRAINING_GROUPS, visibleTrainingPrograms, type TrainingFilter as Filter } from './trainingCatalog';

export function TrainingDashboard({ tab, filter, onTabChange, onFilterChange, onPick, appContent }: {
  tab: Tab; filter: Filter; onTabChange: (tab: Tab) => void;
  onFilterChange: (filter: Filter) => void; onPick: (modeId: string) => void; appContent: ReactNode;
}) {
  const { toggleMobile, isMobileOpen } = useAppSidebar();
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>SPOK<span>EDU</span><small>SPOMOVE</small></div>
          <nav className={styles.nav} aria-label="SPOMOVE 메뉴">
            {([['training', 'Training'], ['teacher', 'Teacher'], ['app', 'Asset Hub']] as const).map(([id, label]) => (
              <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => onTabChange(id)}>{label}</button>
            ))}
          </nav>
          <div className={styles.headerActions}>
            <button type="button" disabled aria-label="알림" title="알림 기능 미제공"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg></button>
            <button type="button" onClick={toggleMobile} aria-label="메뉴 열기" aria-expanded={isMobileOpen} aria-controls="app-navigation">☰</button>
          </div>
        </div>
      </header>
      {tab === 'training' ? (
        <main className={styles.main}>
          <section className={styles.intro}>
            <div><p className={styles.eyebrow}>SPOKEDU COGNITIVE SYSTEM</p><h1>움직임이 배움이 되는 <span>인지 피트니스</span></h1><p>화면 신호를 보고 판단하며, 4색 매트 위에서 움직이는 두뇌·신체 협응 트레이닝</p></div>
            <div className={styles.wallpaper}><SpomoveCatalogHero compact /></div>
          </section>
          <section aria-labelledby="training-title">
            <div className={styles.toolbar}>
              <h2 id="training-title">트레이닝 선택 <span>8개 프로그램 · 4개 반응 영역</span></h2>
              <div className={styles.filters} aria-label="훈련 영역 필터">
                {(['ALL', 'response', 'attention', 'executive', 'advanced'] as const).map(id => <button key={id} type="button" aria-pressed={filter === id} onClick={() => onFilterChange(id)}>{id === 'ALL' ? '전체' : TRAINING_GROUPS[id].label}</button>)}
              </div>
            </div>
            <div className={styles.grid}>
              {visibleTrainingPrograms(filter).map(program => (
                <article key={program.id} className={styles.card} data-program={program.id} style={{ '--course-color': TRAINING_GROUPS[program.group].color } as CSSProperties}>
                  <div className={styles.cardHeader}><span className={styles.icon} aria-hidden>{program.icon}</span><h3>{program.title}</h3></div>
                  <div className={styles.secondary}><p>{program.en}</p><span className={styles.badge}>{TRAINING_GROUPS[program.group].label}</span></div>
                  <p className={styles.description}>{program.desc}</p>
                  <button className={styles.start} type="button" onClick={() => program.enter(onPick)} aria-label={`${program.title} 훈련 설정`}>훈련 설정 <span aria-hidden>→</span></button>
                </article>
              ))}
            </div>
          </section>
        </main>
      ) : appContent}
    </div>
  );
}
