const CARDS = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
    title: 'Play (즐거운 첫걸음)',
    desc: '운동을 억지로 시키는 훈련이 아닙니다. 야외 환경에서 아이가 흥미를 느낄 수 있는 요소를 찾아 스스로 움직이는 재미를 먼저 발견하도록 유도합니다.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9.673 15.875A4 4 0 1 1 12 7a4 4 0 0 1 2.327 8.875" />
        <path d="M12 22v-6" />
        <path d="M12 2v2" />
        <path d="M22 12h-2" />
        <path d="M4 12H2" />
      </svg>
    ),
    title: 'Think (스스로 하는 인지 판단)',
    desc: '강사의 지시를 수동적으로 따르기만 하는 수업을 지양합니다. 불규칙한 야외 환경에서 어떻게 몸을 통제하고 움직일지 아이 스스로 생각하게 만듭니다.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    title: 'Grow (확실한 정서적 성장)',
    desc: '신체 능력 향상은 기본입니다. 탁 트인 공간에서의 신체 활동과 작은 성취감들이 모여 스트레스를 해소하고 아이의 단단한 자존감을 형성합니다.',
  },
];

export default function Philosophy() {
  return (
    <section id="about">
      <div className="pl-container">
        <h2 className="pl-section-title">Play, Think, Grow</h2>
        <p className="pl-lead">
          야외 공원, 아파트 단지 등 주어진 환경 속에서 1:1 맞춤형으로 진행되는 스포키듀만의 차별화된 교육
          방식입니다.
        </p>
        <div className="pl-grid-3">
          {CARDS.map(({ icon, title, desc }) => (
            <div key={title} className="pl-card pl-glass-panel">
              <div className="pl-card-icon">{icon}</div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
