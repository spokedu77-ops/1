'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useAppSidebar } from '@/app/providers/AppSidebarProvider';
import styles from './TrainingDashboard.module.css';
import { SpomoveCatalogHero } from './_player/components/SpomoveCatalogHero';

type Tab = 'training' | 'teacher' | 'app';
type Filter = 'ALL' | 'response' | 'attention' | 'executive';

const groups = { response: '단순 반응', attention: '선택 반응', executive: '복합 반응' };
const programs = [
  { id: 'basic', title: '반응 인지', en: 'Reactive Cognition', group: 'response', icon: 'ϟ', color: '#fbbf24', desc: '화면 신호를 보고 판단하여 해당 색 위치로 빠르게 이동합니다.' },
  { id: 'reactTrain', title: '시지각 반응', en: 'Visual Reaction', group: 'response', icon: '◉', color: '#fb7185', desc: '움직이는 색 자극을 포착하고 해당 색 위치로 반응합니다.' },
  { id: 'simon', title: '사이먼 이펙트', en: 'Simon Effect', group: 'attention', icon: '◆', color: '#60a5fa', desc: '자극의 위치에 흔들리지 않고 정해진 색·방향 규칙에 반응합니다.' },
  { id: 'flanker', title: '플랭커 이펙트', en: 'Flanker Effect', group: 'attention', icon: '◎', color: '#60a5fa', desc: '주변의 방해 자극 속에서 가운데 목표만 구분해 반응합니다.' },
  { id: 'stroop', title: '스트룹 이펙트', en: 'Stroop Effect', group: 'executive', icon: '↔', color: '#34d399', desc: '글자의 의미와 색을 구분하고 지정된 규칙에 따라 이동합니다.' },
  { id: 'spatial', title: '순차 기억', en: 'Sequential Memory', group: 'executive', icon: '▦', color: '#34d399', desc: '순서대로 제시되는 시각 자극을 기억하고 같은 순서로 재현합니다.' },
] as const;

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
            <div><p className={styles.eyebrow}>SPOMOVE COGNITIVE SYSTEM</p><h1>움직임이 배움이 되는 <span>인지 피트니스</span></h1><p>화면 신호를 보고 판단하며, 4색 매트 위에서 움직이는 두뇌·신체 협응 트레이닝</p></div>
            <div className={styles.wallpaper}><SpomoveCatalogHero compact /></div>
          </section>
          <section aria-labelledby="training-title">
            <div className={styles.toolbar}>
              <h2 id="training-title">트레이닝 선택 <span>8개 섹터 · 스포츠 테마</span></h2>
              <div className={styles.filters} aria-label="훈련 영역 필터">
                {(['ALL', 'response', 'attention', 'executive'] as const).map(id => <button key={id} type="button" aria-pressed={filter === id} onClick={() => onFilterChange(id)}>{id === 'ALL' ? '전체' : groups[id]}</button>)}
              </div>
            </div>
            <div className={styles.grid}>
              {programs.filter(program => filter === 'ALL' || filter === program.group).map(program => (
                <article key={program.id} className={styles.card} data-program={program.id} style={{ '--course-color': program.color } as CSSProperties}>
                  <div className={styles.cardHeader}><span className={styles.icon} aria-hidden>{program.icon}</span><div><div className={styles.titleRow}><h3>{program.title}</h3><span className={styles.badge}>{groups[program.group]}</span></div><p>{program.en}</p></div></div>
                  <p className={styles.description}>{program.desc}</p>
                  <button className={styles.start} type="button" onClick={() => onPick(program.id)} aria-label={`${program.title} 훈련 시작`}>훈련 시작 <span aria-hidden>→</span></button>
                </article>
              ))}
              <article className={styles.card} data-program="flow" style={{ '--course-color': '#22d3ee' } as CSSProperties}>
                <div className={styles.cardHeader}><span className={styles.icon} aria-hidden>◇</span><div><div className={styles.titleRow}><h3>DIVE 3D</h3><span className={styles.badge}>몰입 훈련</span></div><p>Interactive Sports</p></div></div>
                <p className={styles.description}>화면 속에서 달리고, 점프하고, 장애물을 피하는 전신 움직임 훈련입니다.</p>
                <button className={styles.start} type="button" onClick={() => onPick('flow')}>입장 및 설정 <span aria-hidden>→</span></button>
              </article>
              <article className={styles.card} data-program="sports" style={{ '--course-color': '#a78bfa' } as CSSProperties}>
                <div className={styles.cardHeader}><span className={styles.icon} aria-hidden>⚔</span><div><div className={styles.titleRow}><h3>스포츠 테마</h3><span className={styles.badge}>스포츠 동작</span></div><p>Sports Theme</p></div></div>
                <p className={styles.description}>1번 펜싱 · 런지, 2번 검도 · 일도양단. 색과 타이밍을 읽고 스포츠 동작으로 반응합니다.</p>
                <button className={styles.start} type="button" onClick={() => onPick('sports')}>스포츠 테마 설정 <span aria-hidden>→</span></button>
              </article>
            </div>
          </section>
        </main>
      ) : appContent}
    </div>
  );
}
