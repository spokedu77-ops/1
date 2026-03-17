'use client';

export default function Product() {
  const items = [
    {
      num: '01',
      numColor: 'var(--green)',
      iconBg: 'rgba(61,220,132,0.1)',
      iconPath: 'M4 4h16v16H4z',
      iconPath2: 'M8 9h8M8 12h8M8 15h5',
      stroke: '#3ddc84',
      label: '연간 교재 및 매뉴얼 사진 영역',
      title: '현장 검증 연간 커리큘럼 북',
      desc: 'Play, Think, Grow 단계별로 설계된 12개월 분량의 웜업 매뉴얼. 강사의 역량과 무관하게 항상 최상급의 수업 퀄리티를 유지할 수 있도록 상세한 티칭 가이드를 수록했습니다.',
    },
    {
      num: '02',
      numColor: '#63b3ed',
      iconBg: 'rgba(99,179,237,0.1)',
      iconPath: 'M2 4h20v14H2z',
      iconPath2: 'M10 9.5l5 2.5-5 2.5V9.5z',
      stroke: '#63b3ed',
      label: '강사 교육 VOD 시연 사진 영역',
      title: '연세대 연구진 직강 VOD',
      desc: '프로그램의 체육교육학적 근거부터 아이들의 100% 자발적 참여를 이끄는 티칭 노하우까지, 강사진의 역량을 단기간에 끌어올리는 전용 교육 영상을 제공합니다.',
    },
    {
      num: '03',
      numColor: '#a78bfa',
      iconBg: 'rgba(167,139,250,0.1)',
      iconPath: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z',
      iconPath2: 'M14 3v6h6M9 13h6M9 17h4',
      stroke: '#a78bfa',
      label: '학부모 배포용 브로셔 사진 영역',
      title: '프리미엄 상담·마케팅 키트',
      desc: '기관의 전문성을 시각적으로 증명하는 고급 학부모 브로셔, 원내 설명회용 PPT 템플릿, 등록률을 높이는 원장님 전용 상담 스크립트 등 운영 도구를 지원합니다.',
    },
    {
      num: '04',
      numColor: '#fb923c',
      iconBg: 'rgba(251,146,60,0.1)',
      iconPath: 'M3 14h5v7H3z M10 9h5v12h-5z M17 4h5v17h-5z',
      iconPath2: '',
      stroke: '#fb923c',
      label: '웜업 전용 교구 세트 사진 영역',
      title: '인터랙티브 웜업 전용 교구',
      desc: '아이들이 스스로 생각하고 움직이는 인지적 몰입을 극대화하기 위해 특별히 고안된 교구 세트. 유아부터 시니어, 느린 학습자까지 안전하게 참여할 수 있도록 돕습니다.',
    },
  ];

  return (
    <section id="product" style={{ padding: '100px 28px', maxWidth: 1200, margin: '0 auto' }}>
      <div className="reveal" style={{ marginBottom: 64 }}>
        <div className="label" style={{ color: 'var(--green)', marginBottom: 16 }}>
          What You Get
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24 }}>
          <h2 className="display" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: '#fff' }}>
            도입 시 제공되는
            <br />
            실전 솔루션 패키지
          </h2>
          <p style={{ color: 'var(--text-dim)', maxWidth: 320, fontSize: '0.9rem', lineHeight: 1.75 }}>
            추상적인 개념이 아닙니다. 내일 당장 현장에 적용할 수 있는 완벽한 실전 도구들을 제공합니다.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
        {items.map((item, i) => (
          <div key={item.num} className={`reveal ${i % 2 === 0 ? 'd1' : 'd2'}`}>
            <div className="product-img" style={{ marginBottom: 20, borderRadius: 16 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: item.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                  {item.num === '01' && (
                    <>
                      <path d="M4 4h16v16H4z" rx="2" stroke={item.stroke} strokeWidth="1.5" />
                      <path d="M8 9h8M8 12h8M8 15h5" stroke={item.stroke} strokeWidth="1.3" strokeLinecap="round" />
                    </>
                  )}
                  {item.num === '02' && (
                    <>
                      <rect x="2" y="4" width="20" height="14" rx="2.5" stroke={item.stroke} strokeWidth="1.5" />
                      <path d="M10 9.5l5 2.5-5 2.5V9.5z" fill={item.stroke} />
                    </>
                  )}
                  {item.num === '03' && (
                    <>
                      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z" stroke={item.stroke} strokeWidth="1.5" strokeLinejoin="round" />
                      <path d="M14 3v6h6M9 13h6M9 17h4" stroke={item.stroke} strokeWidth="1.3" strokeLinecap="round" />
                    </>
                  )}
                  {item.num === '04' && (
                    <>
                      <rect x="3" y="14" width="5" height="7" rx="1" stroke={item.stroke} strokeWidth="1.5" />
                      <rect x="10" y="9" width="5" height="12" rx="1" stroke={item.stroke} strokeWidth="1.5" />
                      <rect x="17" y="4" width="5" height="17" rx="1" stroke={item.stroke} strokeWidth="1.5" />
                    </>
                  )}
                </svg>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {item.label}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div
                style={{
                  padding: '4px 12px',
                  borderRadius: 100,
                  background: item.iconBg,
                  color: item.numColor,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  marginTop: 2,
                }}
              >
                {item.num}
              </div>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: 8 }}>{item.title}</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.75 }}>{item.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
