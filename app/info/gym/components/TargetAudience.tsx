'use client';

export default function TargetAudience() {
  return (
    <section id="target" className="gym-section" aria-labelledby="targetHeading">
      <div className="gym-container">
        <div className="gym-section-head">
          <div className="gym-kicker">수업 대상</div>
          <h2 id="targetHeading" className="gym-section-title">
            누구를 위한 수업인가요?
          </h2>
          <p className="gym-section-desc">
            유아(5–7세), 초등 저학년(1–3), 초등 고학년(4–6)을 대상으로 연령별·레벨별 소그룹을 편성합니다.
            운동 경험이 없거나 낯가림이 있어도 &quot;경험/루틴부터&quot; 시작하므로 부담 없이 참여할 수 있습니다.
          </p>
        </div>
        <div className="gym-grid-3">
          <div className="gym-card">
            <h3>유아 5–7세</h3>
            <p>놀이체육 기초발달, 공간 적응, 규칙 이해의 첫 단계. 루틴 정착과 안전한 움직임이 목표입니다.</p>
          </div>
          <div className="gym-card">
            <h3>초등 1–3학년</h3>
            <p>기초 움직임 + 룰게임, 반응·협응, 미니 게임까지. 팀 상황에서의 역할과 소통을 익힙니다.</p>
          </div>
          <div className="gym-card">
            <h3>초등 4–6학년</h3>
            <p>멀티스포츠 통합, 전략 요소, 팀 게임. 전이(transfer)와 자기조절을 강화하는 단계입니다.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
