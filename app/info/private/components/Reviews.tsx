const REVIEWS = [
  {
    text: '"동네 학원에 보내면 아이가 뒤처질까 봐 걱정이었는데, 1:1로 아이 성향에 완벽하게 맞춰서 지도해주시니 아이가 매주 체육 시간만 기다려요."',
    who: '초등 2학년 학부모',
    course: '기초체력 및 달리기 코스',
    avatar: '👩',
  },
  {
    text: '"단순히 땀 빼고 노는 게 아니라, 선생님께서 아이가 스스로 생각하고 판단하게끔 유도하는 방식이 너무 만족스럽습니다. 연세대 선생님들은 다르네요."',
    who: '초등 4학년 학부모',
    course: '구기 종목 기초 과정',
    avatar: '👨',
  },
  {
    text: '"두발자전거를 너무 무서워해서 반포기 상태였는데, 강사님께서 야외 환경을 활용해 놀이처럼 접근해주셔서 단 3회 만에 보조바퀴를 뗐습니다!"',
    who: '초등 1학년 학부모',
    course: '자전거 마스터 코스',
    avatar: '👩',
  },
];

export default function Reviews() {
  return (
    <section id="reviews" style={{ background: 'rgba(255,255,255,0.01)' }}>
      <div className="pl-container">
        <h2 className="pl-section-title">학부모 후기</h2>
        <p className="pl-lead">스포키듀의 체계적인 교육 시스템을 먼저 경험하신 학부모님들의 솔직한 피드백입니다.</p>
        <div className="pl-review-grid">
          {REVIEWS.map(({ text, who, course, avatar }) => (
            <div key={who + course} className="pl-review-card">
              <div className="pl-stars">★★★★★</div>
              <p>{text}</p>
              <div className="pl-reviewer">
                <div className="pl-reviewer-avatar">{avatar}</div>
                <div className="pl-reviewer-info">
                  <strong>{who}</strong>
                  <span>{course}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
