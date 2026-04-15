const REVIEWS = [
  {
    text: '"동네 학원에 보내면 아이가 뒤처질까 봐 걱정이었는데, 1:1로 아이 성향에 완벽하게 맞춰서 지도해주시니 아이가 매주 체육 시간만 기다려요."',
    who: '초등 2학년 학부모',
    course: '기초체력 및 달리기 코스',
    avatar: '👩',
  },
  {
    text: '“공을 받는 것도 무서워하고 몸을 자꾸 피했는데, 강사님이 던지기보다 ‘보는 법, 기다리는 법, 받는 자세’부터 차근차근 잡아주셨어요. 지금은 스스로 먼저 공놀이하자고 말할 만큼 자신감이 생겼습니다.”',
    who: '7세 학부모',
    course: '기초 구기 자신감 코스',
    avatar: '👩',
  },
  {
    text: '“PAPS 준비를 막연하게만 생각했는데, 아이 수준에 맞춰 차근차근 지도해주셔서 부담 없이 시작할 수 있었어요. 수업 후에는 아이도 체육에 대한 자신감이 조금씩 생기고, 기록도 전보다 좋아지는 게 보여 만족스러웠습니다.”',
    who: '초등 5학년 학부모',
    course: 'PAPS 대비 체력 향상 코스',
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
