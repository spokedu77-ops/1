'use client';

import styles from '../spokedu-camera.module.css';

interface ReportScreenProps {
  active: boolean;
  onClearHistory: () => void;
  onGoHome: () => void;
  className?: string;
}

export function ReportScreen({ active, onClearHistory, onGoHome, className = '' }: ReportScreenProps) {
  return (
    <div id="screen-report" className={`${styles.screen} ${active ? styles.active : ''} ${className}`.trim()}>
      <div className={`${styles.card} ${styles['report-card']}`}>
        <div className={styles['report-hdr']}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--spokedu-primary)' }}>📈 성장 기록</h2>
            <p className={`${styles['text-sm']} ${styles['text-gray']} ${styles['mt-1']}`}>지속 가능한 성장(Grow)을 눈으로 확인하세요</p>
          </div>
          <div className={`${styles.flex} ${styles['gap-2']}`}>
            <button type="button" className={`${styles.btn} ${styles['btn-danger']} ${styles['btn-sm']}`} onClick={onClearHistory}>🗑 초기화</button>
            <button type="button" className={`${styles.btn} ${styles['btn-secondary']} ${styles['btn-sm']}`} onClick={onGoHome}>← 돌아가기</button>
          </div>
        </div>
        <div className={styles['expert-box']}>
          <h4>🎓 전문가 코멘트</h4>
          <p id="expert-msg">아직 기록이 없습니다. 즐거운 신체활동을 시작해 보세요!</p>
        </div>
        <div className={styles['stats-row']}>
          <div className={styles['stat-box']}><div className={styles['stat-val']} id="st-plays">0</div><div className={styles['stat-lbl']}>총 플레이</div></div>
          <div className={styles['stat-box']}><div className={styles['stat-val']} id="st-best">0</div><div className={styles['stat-lbl']}>P1 최고점수</div></div>
          <div className={styles['stat-box']}><div className={styles['stat-val']} id="st-rt">—</div><div className={styles['stat-lbl']}>평균반응(ms)</div></div>
        </div>
        <div className={styles['chart-wrap']}>
          <h4>점수 성장 추이</h4>
          <canvas id="chartCanvas" height={140} />
        </div>
        <div className={styles['sect-title']}>최근 활동 내역</div>
        <div className={styles['history-list']} id="history-list">
          <p className={`${styles['text-center']} ${styles['text-muted']}`} style={{ padding: '2rem 0' }}>기록이 없습니다.</p>
        </div>
      </div>
    </div>
  );
}
