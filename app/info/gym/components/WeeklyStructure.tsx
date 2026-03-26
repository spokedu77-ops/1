'use client';

import { WEEKLY_OPERATIONS } from '../data/config';

export default function WeeklyStructure() {
  const labelByTitle: Record<string, string> = {
    "월-금": "평일 정규 성장 수업 운영",
    "토요일": "토요일 원데이/이벤트 운영",
  };

  return (
    <section id="weekly-ops" className="gym-section" aria-labelledby="weeklyHeading">
      <div className="gym-container">
        <div className="gym-section-head">
          <div className="gym-kicker">주간 운영</div>
          <h2 id="weeklyHeading" className="gym-section-title">
            평일 정규 수업, 토요일은 원데이/이벤트로 연결합니다
          </h2>
          <p className="gym-section-desc">
            평일은 성장과 보완을, 토요일은 원데이/이벤트 경험으로 다음 단계의 움직임을 준비합니다.
          </p>
        </div>
        <div className="gym-weekly-grid">
          {WEEKLY_OPERATIONS.map((op) => (
            <div className="gym-card" key={op.title}>
              <h3>{op.title}</h3>
              <p style={{ color: 'var(--gym-accent)' }}>{labelByTitle[op.title] ?? op.purpose}</p>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20, color: 'var(--gym-muted)', fontSize: 13, lineHeight: 1.7 }}>
                {op.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
