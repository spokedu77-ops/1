import Link from 'next/link';

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

const PARTNERS = [
  '2023년 OO구청 주관 아동 체육 프로그램 운영 연계',
  '지역 보건소 아동 신체 발달 관리 체육 파견',
  '프리미엄 호텔 5성급 키즈 웰니스 프로그램 파트너십',
];

export default function Hero() {
  return (
    <section className="pl-hero">
      <div className="pl-container">
        <div className="pl-hero-content">
          <div className="pl-trust-badge">
            <ShieldIcon />
            연세대학교 체육교육 전문가 그룹
          </div>
          <h1>
            신체 활동으로
            <br />
            <span className="pl-text-gradient">스스로 생각하는 힘</span>
            을 기릅니다
          </h1>
          <p>
            단순한 기술 습득이 아닌, 아이들이 스스로 판단하고 몰입하게 만드는 1:1 방문 체육. 학문적 근거와 누적
            10,000회 이상의 현장 경험이 집약된 유아동 및 청소년 프리미엄 커리큘럼을 경험해 보세요.
          </p>
          <div className="pl-hero-cta">
            <Link className="pl-btn pl-btn-outline" href="#diagnosis">
              우리 아이 성향 진단
            </Link>
            <Link className="pl-btn pl-btn-primary" href="#apply" style={{ color: '#09090b' }}>
              전문 상담 접수하기
            </Link>
          </div>
        </div>
        <div className="pl-partners-bar">
          <div className="pl-partners-title">공공기관 및 프리미엄 브랜드 검증 완료</div>
          <div className="pl-partners-list">
            {PARTNERS.map((text) => (
              <div key={text} className="pl-partner-item">
                <span>✓</span>
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
