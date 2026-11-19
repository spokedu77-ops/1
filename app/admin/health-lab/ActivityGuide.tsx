import styles from './HealthLabPage.module.css';

const COLORS = [
  { name: '빨강', fill: '#ef4444' },
  { name: '노랑', fill: '#facc15' },
  { name: '초록', fill: '#22c55e' },
  { name: '파랑', fill: '#38bdf8', target: true },
];

export function ActivityGuide({ missionId }: { missionId?: string }) {
  if (missionId === 'week1-color-move') {
    return (
      <svg className={styles.guide} viewBox="0 0 360 150" role="img" aria-label="출발 지점에서 파란 목표 카드까지 걸어가는 예시">
        <title>출발 지점에서 파란 목표 카드까지 걸어가는 예시</title>
        <rect x="8" y="48" width="52" height="36" rx="8" fill="#0f172a" stroke="#38bdf8" />
        <text x="34" y="70" textAnchor="middle" fill="#e2e8f0" fontSize="12">출발</text>
        <path d="M68 66 H128" stroke="#38bdf8" strokeWidth="3" />
        <path d="M118 58 L132 66 L118 74" fill="#38bdf8" />
        {COLORS.map((card, index) => {
          const x = 142 + index * 52;
          return (
            <g key={card.name}>
              <rect x={x} y="28" width="44" height="58" rx="8" fill={card.fill} stroke={card.target ? '#fff' : 'transparent'} strokeWidth="2" />
              <text x={x + 22} y="108" textAnchor="middle" fill="#cbd5e1" fontSize="11">{card.name}</text>
              {card.target && <text x={x + 22} y="20" textAnchor="middle" fill="#7dd3fc" fontSize="11">목표</text>}
            </g>
          );
        })}
      </svg>
    );
  }
  if (missionId === 'week2-footstep-path') {
    return (
      <svg className={styles.guide} viewBox="0 0 360 168" role="img" aria-label="출발에서 도착까지 왼발과 오른발 여섯 개를 따라 걷는 길">
        <title>출발에서 도착까지 왼발과 오른발 여섯 개를 따라 걷는 길</title>
        <text x="8" y="78" fill="#7dd3fc" fontSize="12">출발</text>
        <path d="M36 74 H58" stroke="#38bdf8" strokeWidth="3" />
        <path d="M52 68 L64 74 L52 80" fill="#38bdf8" />
        {Array.from({ length: 6 }, (_, index) => {
          const left = index % 2 === 0;
          const x = 70 + index * 42;
          const y = left ? 28 : 78;
          return (
            <g key={index} transform={`translate(${x} ${y})`}>
              <ellipse cx="16" cy="24" rx="14" ry="22" fill={left ? '#38bdf8' : '#7dd3fc'} />
              <circle cx="8" cy="4" r="3" fill={left ? '#7dd3fc' : '#e0f2fe'} />
              <circle cx="16" cy="2" r="3" fill={left ? '#7dd3fc' : '#e0f2fe'} />
              <circle cx="24" cy="5" r="3" fill={left ? '#7dd3fc' : '#e0f2fe'} />
              <text x="16" y="58" textAnchor="middle" fill="#cbd5e1" fontSize="11">{left ? '왼' : '오'} {index + 1}</text>
            </g>
          );
        })}
        <text x="324" y="78" fill="#7dd3fc" fontSize="12">도착</text>
      </svg>
    );
  }
  return null;
}
