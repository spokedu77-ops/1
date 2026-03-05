const INSTRUCTORS = [
  {
    initial: 'A',
    name: '수석 연구원',
    tag: '연세대학교 체육교육학 석사',
    badges: ['지도 경력 5년 차', '유소년스포츠지도사', '자전거·기초체력 전문'],
    desc: '아이들의 눈높이에서 공감하며, 두려움을 극복하고 확실한 성취감을 느낄 수 있도록 섬세하게 지도합니다.',
  },
  {
    initial: 'B',
    name: '책임 강사',
    tag: '체육학 전공',
    badges: ['실무 경력 4년 차', '생활스포츠지도사', '줄넘기·인라인 전문'],
    desc: '유아동 체육 실무 경험을 바탕으로 낯가림이 심한 아이들도 금방 마음을 열고 뛰어놀 수 있게 만듭니다.',
  },
  {
    initial: 'C',
    name: '전임 강사',
    tag: '아동 체육 지도 전공',
    badges: ['아동 발달 센터 경력', '심리운동사 2급', '구기종목·인지체육'],
    desc: '행동 발달에 대한 전문적인 이해를 바탕으로, 단순 체육을 넘어 스스로 생각하는 힘을 길러줍니다.',
  },
];

export default function Instructors() {
  return (
    <section
      id="instructors"
      style={{
        background: 'rgba(255,255,255,0.01)',
        borderTop: '1px solid var(--pl-border)',
        borderBottom: '1px solid var(--pl-border)',
      }}
    >
      <div className="pl-container">
        <h2 className="pl-section-title">검증된 체육교육 전문가 그룹</h2>
        <p className="pl-lead">연세대학교 체육교육 전공진의 엄격한 기준을 통과한 전문 강사진이 함께합니다.</p>
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
              <p className="pl-inst-desc">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
