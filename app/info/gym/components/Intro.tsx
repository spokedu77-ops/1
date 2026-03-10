'use client';

const CLASS_CONTENTS = [
  '영어체육',
  '멀티·뉴스포츠',
  '생활체육',
  '팝스놀이체육',
  '느린학습자 체육',
] as const;

export default function Intro() {
  return (
    <section id="intro" className="gym-section" aria-labelledby="introHeading">
      <div className="gym-container">
        <div className="gym-section-head">
          <div className="gym-kicker">체육관 소개</div>
          <h2 id="introHeading" className="gym-section-title">
            체육관에서 만나는 다양한 수업
          </h2>
          <p className="gym-section-desc">
            스포키듀 체육관은 <b>영어와 체육</b>, <b>뉴스포츠·생활체육</b>, <b>팝스놀이</b>, <b>느린학습자 맞춤</b> 등
            아이의 성향과 목표에 맞는 프로그램을 한 곳에서 운영합니다. 정원을 맞춘 소그룹으로 수업 품질을 유지하고,
            부모님과의 소통을 통해 성장을 함께 정리합니다.
          </p>
        </div>
        <div className="gym-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>수업 컨텐츠</h3>
          <p style={{ margin: 0, marginBottom: 12 }}>
            영어체육 / 멀티·뉴스포츠 / 생활체육 / 팝스놀이체육 / 느린학습자 체육
          </p>
          <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--gym-muted)', fontSize: 'var(--gym-fs-sm)', lineHeight: 1.6 }}>
            {CLASS_CONTENTS.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
        <div className="gym-grid-3">
          <div className="gym-card">
            <h3>수업 표준화</h3>
            <p>50분 루틴(도입–기초–게임–정리)을 고정해, 강사가 늘어도 품질이 흔들리지 않게 합니다.</p>
            <ul className="bullets" style={{ margin: '12px 0 0', paddingLeft: 20, color: 'var(--gym-muted)', fontSize: 'var(--gym-fs-sm)' }}>
              <li>수업 언어/규범 루틴 통일</li>
              <li>안전 동선/정원 기준 고정</li>
              <li>분기(12주) 운영으로 누적</li>
            </ul>
          </div>
          <div className="gym-card">
            <h3>멀티·뉴스포츠 설계</h3>
            <p>종목 나열이 아니라, 게임 상황에서 규칙 이해·역할 수행·전환 개념을 학습하게 만듭니다.</p>
            <ul className="bullets" style={{ margin: '12px 0 0', paddingLeft: 20, color: 'var(--gym-muted)', fontSize: 'var(--gym-fs-sm)' }}>
              <li>Game-based Learning</li>
              <li>전이(Transfer) 중심</li>
              <li>팀 플레이/자기조절 포함</li>
            </ul>
          </div>
          <div className="gym-card">
            <h3>부모 커뮤니케이션</h3>
            <p>관찰 기반 리포트와 짧은 코치 코멘트로 &quot;무엇이 좋아졌는지&quot;를 분기 단위로 정리합니다.</p>
            <ul className="bullets" style={{ margin: '12px 0 0', paddingLeft: 20, color: 'var(--gym-muted)', fontSize: 'var(--gym-fs-sm)' }}>
              <li>체험→레벨 진단→반 편성</li>
              <li>중간 점검(Week 6)</li>
              <li>분기 리포트(Week 12)</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
