'use client';

/** 09:00 ~ 19:00 (1시간 단위), 20:00은 19시 블록 끝 */
const TIME_LABELS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'] as const;
const DAYS = ['월', '화', '수', '목', '금', '토'] as const;

/** 해당 요일·시간(시)이 운영 중인지 */
function isOperating(day: string, timeIndex: number): boolean {
  const hour = 9 + timeIndex; // 09 -> 0, 13 -> 4, 19 -> 10
  if (day === '토') return hour >= 9 && hour <= 19;
  return hour >= 13 && hour <= 19; // 평일 13~19시
}

export default function Schedule() {
  return (
    <section id="schedule" className="gym-section" aria-labelledby="scheduleHeading">
      <div className="gym-container">
        <div className="gym-section-head" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
          <div>
            <div className="gym-kicker">운영 시간표</div>
            <h2 id="scheduleHeading" className="gym-section-title">
              시간표 (운영시간)
            </h2>
            <p className="gym-section-desc">
              평일 정규 클래스와 토요일 운영 시간표입니다. 일요일 원데이/특강은 별도 공지 후 운영됩니다.
            </p>
          </div>
        </div>
        <div
          className="gym-schedule-grid-wrap"
          style={{
            borderRadius: 'var(--gym-r-lg)',
            border: '1px solid var(--gym-line)',
            background: 'linear-gradient(180deg, rgba(18,26,46,.55), rgba(10,14,25,.6))',
            overflow: 'hidden',
          }}
        >
          <table
            aria-label="요일·시간대별 운영 시간표"
            className="gym-schedule-table"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: 'var(--gym-font)',
              fontSize: 'var(--gym-fs-sm)',
            }}
          >
            <thead>
              <tr>
                <th scope="col" style={{ width: 56, padding: '10px 8px', borderBottom: '1px solid rgba(255,255,255,.12)', borderRight: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.06)', fontWeight: 600, color: 'var(--gym-muted2)' }}>
                  시간
                </th>
                {DAYS.map((d) => (
                  <th key={d} scope="col" style={{ padding: '10px 8px', borderBottom: '1px solid rgba(255,255,255,.12)', borderRight: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.06)', fontWeight: 600, color: 'var(--gym-text)' }}>
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_LABELS.map((time, timeIndex) => (
                <tr key={time}>
                  <td style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,.08)', borderRight: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', color: 'var(--gym-muted2)', whiteSpace: 'nowrap' }}>
                    {time}
                  </td>
                  {DAYS.map((day) => {
                    const operating = isOperating(day, timeIndex);
                    return (
                      <td
                        key={day}
                        style={{
                          padding: '8px',
                          borderBottom: '1px solid rgba(255,255,255,.08)',
                          borderRight: day === '토' ? 'none' : '1px solid rgba(255,255,255,.08)',
                          background: operating ? 'rgba(200, 243, 74, 0.15)' : 'rgba(255,255,255,.02)',
                          color: operating ? 'var(--gym-text)' : 'var(--gym-muted2)',
                          textAlign: 'center',
                          minWidth: 48,
                        }}
                      >
                        {operating ? '운영' : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
