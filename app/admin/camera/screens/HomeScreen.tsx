'use client';

import Link from 'next/link';
import styles from '../spokedu-camera.module.css';

const MODE_DESCS: Record<string, { title: string; color: string; bg: string; badge: string }> = {
  speed:    { title: '스피드 스타',   color: 'var(--spokedu-primary)', bg: '#EFF6FF', badge: 'var(--spokedu-primary-l)' },
  sequence: { title: '넘버 시퀀스',   color: 'var(--spokedu-green)',   bg: '#DCFCE7', badge: 'var(--spokedu-green-l)' },
  shape:    { title: '쉐이프 헌터',   color: 'var(--spokedu-purple)',  bg: '#EDE9FE', badge: 'var(--spokedu-purple-l)' },
  moving:   { title: '무빙 캐치',     color: 'var(--spokedu-orange)',  bg: '#FFF7ED', badge: 'var(--spokedu-orange-l)' },
  balance:  { title: '밸런스 포즈',   color: 'var(--spokedu-cyan)',   bg: '#ECFEFF', badge: '#ECFEFF' },
  mirror:   { title: '미러 게임',     color: 'var(--spokedu-pink)',   bg: '#FDF2F8', badge: '#FDF2F8' },
};

const MODE_LIST = [
  { id: 'speed',    num: 1, icon: '⚡', desc: '화면에 나타나는 별을 빠르게 터치. 순발력과 자발적 몰입을 극대화합니다.', badge: '⏱ 순발력 · 반응속도' },
  { id: 'sequence', num: 2, icon: '🔢', desc: '숫자를 순서대로 기억하고 터치. 신체활동과 인지 자극을 동시에 경험합니다.', badge: '🧠 기억력 · 협동' },
  { id: 'shape',    num: 3, icon: '🔷', desc: '미션 모양만 정확히 터치하세요. 충동 조절과 판단력을 함께 기릅니다.', badge: '🎯 판단력 · 집중력' },
  { id: 'moving',   num: 4, icon: '🎯', desc: '통통 튀는 타겟을 끝까지 추적해 잡아내세요. 전신 협응력을 극대화합니다.', badge: '👁 동체시력 · 협응' },
  { id: 'balance',  num: 5, icon: '🧘', desc: '화면이 요청하는 포즈를 2초간 유지하세요. 균형감각과 집중력을 기릅니다.', badge: '⚖ 균형 · 고유감각' },
  { id: 'mirror',   num: 6, icon: '🤸', desc: '화면 실루엣 동작을 따라하세요. 시각-운동 협응과 모델링 학습을 경험합니다.', badge: '🤸 모델링 · 운동학습' },
];

interface HomeScreenProps {
  active: boolean;
  onSelectMode: (mode: string) => void;
  onShowReport: () => void;
  className?: string;
}

export function HomeScreen({ active, onSelectMode, onShowReport, className = '' }: HomeScreenProps) {
  return (
    <div id="screen-home" className={`${styles.screen} ${active ? styles.active : ''} ${className}`.trim()}>
      <div className={styles['home-header']}>
        <div>
          <div className={styles['logo-mark']}>SPOKEDU</div>
          <div className={styles['logo-sub']}>PLAY · THINK · GROW</div>
        </div>
        <div className={`${styles.flex} ${styles['items-center']} ${styles['gap-2']}`}>
          <Link href="/admin" className={`${styles.btn} ${styles['btn-secondary']} ${styles['btn-sm']}`}>← Admin</Link>
          <button type="button" className={`${styles.btn} ${styles['btn-secondary']} ${styles['btn-sm']}`} onClick={onShowReport}>📊 성장 기록</button>
        </div>
      </div>
      <div className={`${styles.card} ${styles['hero-panel']}`}>
        <p className={styles['hero-title']}>
          연세대 체육교육 전문가가 설계한 <strong>AI 포즈 인식 인터랙티브 웜업</strong> 시스템<br />
          개별 평가 · 다중 인식 · 성장 데이터 분석이 완벽하게 통합되었습니다.
        </p>
        <div className={styles['mode-grid']}>
          {MODE_LIST.map((m) => {
            const style = MODE_DESCS[m.id] ?? { color: '', bg: '#F8FAFC', badge: '#F8FAFC' };
            const mcClass = m.id === 'speed' ? styles['mc-speed'] : m.id === 'sequence' ? styles['mc-seq'] : m.id === 'shape' ? styles['mc-shape'] : m.id === 'moving' ? styles['mc-moving'] : m.id === 'balance' ? styles['mc-balance'] : styles['mc-mirror'];
            return (
              <div
                key={m.id}
                className={`${styles['mode-card']} ${mcClass}`}
                onClick={() => onSelectMode(m.id)}
                onKeyDown={(e) => e.key === 'Enter' && onSelectMode(m.id)}
                role="button"
                tabIndex={0}
              >
                <div className={styles['mode-num']} style={{ background: style.bg, color: style.color }}>{m.num}</div>
                <div className={styles['mode-icon']} style={{ background: style.bg }}>{m.icon}</div>
                <h3 style={{ color: style.color }}>{style.title}</h3>
                <p>{m.desc}</p>
                <div className={styles['mode-badge']} style={{ background: style.badge, color: style.color }}>{m.badge}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
