'use client';

import Link from 'next/link';
import { ACTIVE_CAMERA_MODE_IDS, type CameraModeId } from '../constants';
import styles from '../spokedu-camera.module.css';

const MODE_DESCS: Record<CameraModeId, { title: string; color: string; bg: string; badge: string }> = {
  speed: { title: '반응 깨우기', color: 'var(--spokedu-primary)', bg: '#EFF6FF', badge: 'var(--spokedu-primary-l)' },
  sequence: { title: '순서 따라가기', color: 'var(--spokedu-green)', bg: '#DCFCE7', badge: 'var(--spokedu-green-l)' },
  shape: { title: '쉐이프 헌터', color: 'var(--spokedu-purple)', bg: '#EDE9FE', badge: 'var(--spokedu-purple-l)' },
  moving: { title: '무빙 캐치', color: 'var(--spokedu-orange)', bg: '#FFF7ED', badge: 'var(--spokedu-orange-l)' },
  balance: { title: '밸런스 포즈', color: 'var(--spokedu-cyan)', bg: '#ECFEFF', badge: '#ECFEFF' },
  mirror: { title: '미러 게임', color: 'var(--spokedu-pink)', bg: '#FDF2F8', badge: '#FDF2F8' },
};

const MODE_LIST: Array<{ id: CameraModeId; num: number; icon: string; desc: string; badge: string }> = [
  {
    id: 'speed',
    num: 1,
    icon: '⚡',
    desc: '나타나는 타겟을 빠르게 터치합니다. 보너스 타겟이 섞여 있어 짧고 신나게 몰입할 수 있습니다.',
    badge: '시선 집중 · 반응속도',
  },
  {
    id: 'sequence',
    num: 2,
    icon: '🔢',
    desc: '숫자를 1번부터 차례대로 따라갑니다. 기억 게임보다 순서 실행과 침착함에 초점을 둡니다.',
    badge: '순서 실행 · 협응',
  },
  {
    id: 'shape',
    num: 3,
    icon: '🔷',
    desc: '미션 모양만 정확히 찾아 터치합니다. 넓어진 간격으로 억울한 감점은 줄이고 판단은 살렸습니다.',
    badge: '판단력 · 집중력',
  },
  {
    id: 'moving',
    num: 4,
    icon: '🎯',
    desc: '움직이는 타겟을 추적합니다. 현재는 내부 실험 모드입니다.',
    badge: '동체시력 · 협응',
  },
  {
    id: 'balance',
    num: 5,
    icon: '🧘',
    desc: '화면이 요청하는 포즈를 유지합니다. 현재는 내부 실험 모드입니다.',
    badge: '균형 · 고유감각',
  },
  {
    id: 'mirror',
    num: 6,
    icon: '🤸',
    desc: '화면 동작을 따라합니다. 현재는 내부 실험 모드입니다.',
    badge: '모방 · 운동학습',
  },
];

const ACTIVE_MODE_LIST = MODE_LIST.filter((mode) => (ACTIVE_CAMERA_MODE_IDS as readonly CameraModeId[]).includes(mode.id));

interface HomeScreenProps {
  active: boolean;
  onSelectMode: (mode: CameraModeId) => void;
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
          <Link href="/admin" className={`${styles.btn} ${styles['btn-secondary']} ${styles['btn-sm']}`}>Admin</Link>
          <button type="button" className={`${styles.btn} ${styles['btn-secondary']} ${styles['btn-sm']}`} onClick={onShowReport}>성장 기록</button>
        </div>
      </div>
      <div className={`${styles.card} ${styles['hero-panel']}`}>
        <p className={styles['hero-title']}>
          큰 화면에서 바로 뛰어드는 <strong>AI 카메라 움직임 게임</strong><br />
          지금은 잘 작동하는 핵심 3개 모드에 집중합니다.
        </p>
        <div className={styles['mode-grid']}>
          {ACTIVE_MODE_LIST.map((m) => {
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
