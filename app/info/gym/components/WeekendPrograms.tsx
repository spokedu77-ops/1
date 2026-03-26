'use client';

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export default function WeekendPrograms() {
  return (
    <section id="weekend-programs" className="gym-section" aria-labelledby="weekendHeading">
      <div className="gym-container">
        <div className="gym-section-head">
          <div className="gym-kicker">주말 운영</div>
          <h2 id="weekendHeading" className="gym-section-title">
            토요일은 시작, 일요일은 확장
          </h2>
          <p className="gym-section-desc">
            정규 수업 외에도 주말에 아이가 더 재미있게 참여하고, 다음 단계의 움직임으로 자연스럽게 이어지도록 구성합니다.
          </p>
        </div>
        <div className="gym-weekly-grid">
          <article className="gym-card">
            <h3>토요일: 첫 경험 세팅</h3>
            <p>처음 참여하는 아이가 수업 리듬을 빠르게 익히고, 함께 즐길 수 있도록 체험/이벤트 형식으로 진행합니다.</p>
          </article>
          <article className="gym-card">
            <h3>일요일: 주제 확장 세션</h3>
            <p>이번 주에 배운 움직임을 더 다양한 규칙과 상황으로 확장해, 적용력을 키우는 프로그램입니다.</p>
          </article>
          <article className="gym-card">
            <h3>연결 코칭</h3>
            <p>주말 참여 흐름을 바탕으로 다음 주 평일 반을 자연스럽게 안내하고, 아이의 속도에 맞춰 조정합니다.</p>
          </article>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="gym-btn primary" onClick={() => scrollToId('contact')}>
            체험/상담 신청
          </button>
        </div>
      </div>
    </section>
  );
}
