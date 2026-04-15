const INSTRUCTORS = [
  {
    initial: 'A',
    name: '총괄 팀장',
    tag: '연세대학교 체육교육학 학사',
    badges: ['지도 경력 10년 차', '교원자격증', '시스템 구축 및 강사 교육'],
    desc: '',
  },
  {
    initial: 'B',
    name: '운영 팀장',
    tag: '연세대학교 체육교육학 학사',
    badges: ['지도 경력 8년 차', '교원자격증', '강사 관리 및 프로그램 기획'],
    desc: '',
  },
  {
    initial: 'C',
    name: '수업 팀장',
    tag: '강원대학교 체육교육학 학사',
    badges: ['지도 경력 5년 차', '생활체육 지도자 자격증', '프로그램 개발 및 수업 총괄'],
    desc: '',
  },
];

export default function Instructors() {
  return (
    <section
      id="instructors"
      style={{
        background: 'rgba(255,255,255,0.01)',
        borderBottom: '1px solid var(--pl-border)',
      }}
    >
      <div className="pl-container">
        <h2 className="pl-section-title">검증된 체육교육 전문가 운영진</h2>
        <div className="pl-inst-grid">
          {INSTRUCTORS.map(({ initial, name, tag, badges, desc }) => (
            <div key={name} className="pl-inst-card">
              <div className="pl-inst-header">
                <div className="pl-inst-avatar">{initial}</div>
                <div className="pl-inst-info">
                  <h4>{name}</h4>
                  <span>{tag}</span>
                </div>
              </div>
              <div className="pl-inst-badges">
                {badges.map((b) => (
                  <div key={b} className="pl-badge">
                    {b}
                  </div>
                ))}
              </div>
              {desc && <p className="pl-inst-desc">{desc}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
