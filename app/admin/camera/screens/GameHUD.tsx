'use client';

import styles from '../spokedu-camera.module.css';
import { PLAYER_COLORS } from '../constants';

interface GameHUDProps {
  active: boolean;
  hudTime: string;
  hudWarn: boolean;
  missionText: string;
  showMissionBanner: boolean;
  scores: number[];
  multiOn: boolean;
  onPause: () => void;
  className?: string;
}

export function GameHUD({
  active,
  hudTime,
  hudWarn,
  missionText,
  showMissionBanner,
  scores,
  multiOn,
  onPause,
  className = '',
}: GameHUDProps) {
  return (
    <div id="screen-game" className={`${styles.screen} ${active ? styles.active : ''} ${className}`.trim()}>
      <div className={styles['hud-top']}>
        <div className={styles['hud-card']}>
          <div className={styles['hud-lbl']}>남은 시간</div>
          <div className={`${styles['hud-val']} ${hudWarn ? styles.warn : ''}`} id="hud-time" dangerouslySetInnerHTML={{ __html: hudTime }} />
        </div>
        <div id="mission-banner" className={showMissionBanner ? styles.show : ''}>
          <div className={styles['mission-inner']}>
            <span className={styles['mission-lbl']}>현재 미션</span>
            <div id="mission-text">{missionText}</div>
          </div>
        </div>
        <div className={`${styles.flex} ${styles['items-center']} ${styles['gap-2']}`}>
          <div className={styles['hud-card']}>
            <div className={styles['hud-lbl']}>점수</div>
            <div className={styles.scoreboard}>
              {[0, 1, 2].map((i) => (
                <div key={i} className={`${styles['score-player']} ${i >= 1 && !multiOn ? styles.dim : ''}`} id={`sp${i + 1}`}>
                  <div className={styles['score-dot']} style={{ background: PLAYER_COLORS[i]?.hex }} />
                  <div className={styles['score-val']} id={`sv${i + 1}`} style={{ color: PLAYER_COLORS[i]?.hex }}>{scores[i] ?? 0}</div>
                  <div className={styles['score-lbl']}>P{i + 1}</div>
                </div>
              ))}
            </div>
          </div>
          <button type="button" className={styles['btn-pause']} onClick={onPause} title="일시정지 (Esc)">⏸</button>
        </div>
      </div>
      <div className={styles['hud-bottom']} id="hud-extra" />
    </div>
  );
}
