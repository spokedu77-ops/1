import type { CSSProperties } from 'react';
import type { ResultFact } from '../../lib/trainingResultViewModel';
import { RecordV2Details } from './RecordV2Details';
import styles from './RecordV2Details.module.css';

export function InstantMemoryRecordV2({ gridSize, settings }: { gridSize?: 3 | 4 | 5; settings: ResultFact[] }) {
  return <><div className={styles.visual}><h3>{gridSize ? `${gridSize}×${gridSize} 격자 구성` : '격자 설정 기록 없음'}</h3>{gridSize ? <div className={styles.grid} style={{ '--grid-size': gridSize } as CSSProperties} aria-label="사용한 격자 크기 안내">{Array.from({ length: gridSize * gridSize }, (_, index) => <span key={index} />)}</div> : null}<p>실제 제시 색이나 정답 위치를 재현한 기록은 아닙니다.</p></div><RecordV2Details title="사용한 격자 설정" items={settings} /></>;
}
