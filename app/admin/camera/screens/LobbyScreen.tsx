'use client';

import styles from '../spokedu-camera.module.css';
import type { DiffKey } from '../constants';

interface LobbyScreenProps {
  active: boolean;
  title: string;
  desc: string;
  calibStatus: { text: string; className: string };
  loaderVisible: boolean;
  startBtnVisible: boolean;
  diff: DiffKey;
  dur: number;
  multiOn: boolean;
  soundOn: boolean;
  onSetDiff: (d: DiffKey) => void;
  onSetDur: (d: number) => void;
  onSetMulti: (v: boolean) => void;
  onSetSound: (v: boolean) => void;
  onGoHome: () => void;
  onStart: () => void;
  className?: string;
}

const DIFF_LABELS: Record<DiffKey, string> = { easy: '쉬움', normal: '보통', hard: '어려움' };

export function LobbyScreen({
  active,
  title,
  desc,
  calibStatus,
  loaderVisible,
  startBtnVisible,
  diff,
  dur,
  multiOn,
  soundOn,
  onSetDiff,
  onSetDur,
  onSetMulti,
  onSetSound,
  onGoHome,
  onStart,
  className = '',
}: LobbyScreenProps) {
  const calibClass = calibStatus.className === 'calib-ok' ? styles['calib-ok'] : calibStatus.className === 'calib-err' ? styles['calib-err'] : styles['calib-wait'];
  return (
    <div id="screen-lobby" className={`${styles.screen} ${active ? styles.active : ''} ${className}`.trim()}>
      <div className={`${styles.card} ${styles['lobby-card']}`}>
        <h2 className={styles['lobby-title']}>{title}</h2>
        <p className={styles['lobby-desc']}>{desc}</p>
        <div className={styles['calib-box']}>
          <div className={styles['calib-icon']}>📷</div>
          <p>카메라와 AI 엔진을 준비하는 중입니다</p>
          <div id="calib-status" className={`${styles['calib-status']} ${calibClass}`}>{calibStatus.text}</div>
        </div>
        {loaderVisible && (
          <div className={styles['loader-wrap']}>
            <div className={styles.spinner} />
            <p className={styles['loader-txt']}>카메라 연결 중...</p>
          </div>
        )}
        <div className={styles['settings-panel']} role="group" aria-labelledby="lobby-settings-title">
          <div id="lobby-settings-title" className={styles['sect-title']} style={{ marginBottom: '.75rem' }}>게임 설정</div>
          <div className={styles['s-row']}>
            <span className={styles['s-label']} id="lobby-diff-label">난이도</span>
            <div className={styles.seg} role="group" aria-labelledby="lobby-diff-label">
              {(['easy', 'normal', 'hard'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`${styles['seg-btn']} ${diff === d ? styles.on : ''}`}
                  data-diff={d}
                  onClick={() => onSetDiff(d)}
                  aria-pressed={diff === d}
                  aria-label={`난이도 ${DIFF_LABELS[d]}`}
                >
                  {DIFF_LABELS[d]}
                </button>
              ))}
            </div>
          </div>
          <div className={styles['s-row']}>
            <span className={styles['s-label']} id="lobby-dur-label">게임 시간</span>
            <div className={styles.seg} role="group" aria-labelledby="lobby-dur-label">
              {[20, 30, 60].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`${styles['seg-btn']} ${dur === d ? styles.on : ''}`}
                  data-dur={d}
                  onClick={() => onSetDur(d)}
                  aria-pressed={dur === d}
                  aria-label={`게임 시간 ${d}초`}
                >
                  {d}초
                </button>
              ))}
            </div>
          </div>
          <div className={styles['s-row']}>
            <span className={styles['s-label']} id="lobby-multi-label">다중 인식 (최대 3인)</span>
            <label className={styles.toggle} aria-label="다중 인식 사용 시 최대 3인까지 점수 인식">
              <input type="checkbox" id="multi-toggle" checked={multiOn} onChange={(e) => onSetMulti(e.target.checked)} />
              <div className={styles.ttrack} /><div className={styles.tthumb} />
            </label>
          </div>
          <div className={styles['s-row']}>
            <span className={styles['s-label']} id="lobby-sound-label">음향 피드백</span>
            <label className={styles.toggle} aria-label="효과음 사용">
              <input type="checkbox" id="sound-toggle" checked={soundOn} onChange={(e) => onSetSound(e.target.checked)} />
              <div className={styles.ttrack} /><div className={styles.tthumb} />
            </label>
          </div>
        </div>
        <div className={styles['lobby-actions']}>
          <button type="button" className={`${styles.btn} ${styles['btn-secondary']}`} onClick={onGoHome} aria-label="목록으로 돌아가기">목록으로</button>
          {startBtnVisible && (
            <button type="button" id="btn-start" className={`${styles.btn} ${styles['btn-primary']} ${styles['btn-lg']} ${styles['w-full']}`} onClick={onStart} aria-label="운동 시작">🏃 운동 시작!</button>
          )}
        </div>
      </div>
    </div>
  );
}
