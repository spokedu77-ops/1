'use client';

import styles from '../spokedu-camera.module.css';
import { MAX_CAMERA_PARTICIPANTS, MODE_META, PLAYER_COLORS } from '../constants';
import type { HistoryRecord } from '../types';

interface ResultScreenProps {
  active: boolean;
  record: HistoryRecord | null;
  multiOn: boolean;
  isNewPB: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'failed';
  onGoHome: () => void;
  onRestart: () => void;
  onShowReport: () => void;
  className?: string;
}

function getResultTitle(record: HistoryRecord | null): string {
  if (!record) return '수고했어요!';
  const score = record.scores[0] ?? 0;
  if (score >= 100) return '완벽해요!';
  if (score >= 50) return '좋았어요!';
  return '잘했어요!';
}

export function ResultScreen({
  active,
  record,
  multiOn,
  isNewPB,
  saveStatus,
  onGoHome,
  onRestart,
  onShowReport,
  className = '',
}: ResultScreenProps) {
  const playerCount = multiOn ? MAX_CAMERA_PARTICIPANTS : 1;
  const saveLabel =
    saveStatus === 'saving'
      ? '결과 저장 중'
      : saveStatus === 'saved'
        ? '결과 저장 완료'
        : saveStatus === 'failed'
          ? '결과 저장 실패'
          : '';

  return (
    <div id="screen-result" className={`${styles.screen} ${active ? styles.active : ''} ${className}`.trim()}>
      <div className={`${styles.card} ${styles['result-card']}`}>
        <div className={styles['result-trophy']} id="r-trophy">{record ? MODE_META[record.mode]?.emoji ?? '🏆' : '🏆'}</div>
        <div className={styles['result-title']} id="r-title">{getResultTitle(record)}</div>
        <div className={styles['result-sub']}>SPOKEDU와 함께 한 뼘 더 성장했습니다</div>
        <div className={styles['result-stats']} id="r-stats">
          {record && (
            <>
              <div className={styles['r-stat']}>
                <div className={styles['r-stat-lbl']}>P1 점수</div>
                <div className={styles['r-stat-val']} style={{ color: 'var(--spokedu-primary)' }}>{record.scores[0]}</div>
              </div>
              <div className={styles['r-stat']}>
                <div className={styles['r-stat-lbl']}>반응속도</div>
                <div className={styles['r-stat-val']} style={{ color: 'var(--spokedu-purple)' }}>{record.avgRt != null ? `${record.avgRt}ms` : '-'}</div>
              </div>
              <div className={styles['r-stat']}>
                <div className={styles['r-stat-lbl']}>게임시간</div>
                <div className={styles['r-stat-val']} style={{ color: 'var(--spokedu-green)' }}>{record.dur}초</div>
              </div>
            </>
          )}
        </div>
        <div className={styles['result-players']} id="r-players">
          {record && Array.from({ length: playerCount }, (_, i) => (i > 0 && record.scores[i] === 0) ? null : (
            <div key={i} className={styles['r-player']}>
              <div className={styles['r-bubble']} style={{ background: PLAYER_COLORS[i]?.hex }}>{record.scores[i] ?? 0}</div>
              <div className={styles['r-pname']}>{record.participantSlots?.[i]?.displayName || `플레이어 ${i + 1}`}</div>
            </div>
          )).filter(Boolean)}
        </div>
        {isNewPB && <div id="r-pb"><span className={styles['pb-badge']}>개인 최고기록 갱신!</span></div>}
        {saveLabel && <div className={`${styles['save-badge']} ${styles[`save-${saveStatus}`]}`}>{saveLabel}</div>}
        <div className={styles['result-acts']}>
          <button type="button" className={`${styles.btn} ${styles['btn-secondary']}`} onClick={onGoHome}>홈</button>
          <button type="button" className={`${styles.btn} ${styles['btn-secondary']}`} onClick={onRestart}>다시</button>
          <button type="button" className={`${styles.btn} ${styles['btn-primary']}`} onClick={onShowReport}>기록</button>
        </div>
      </div>
    </div>
  );
}
