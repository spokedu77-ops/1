import Image from 'next/image';

const INSTRUCTORS = [
  {
    photo: 'https://i.postimg.cc/s2n6Dbx4/20230318-001009.png',
    name: '총괄 팀장',
    tag: '연세대학교 체육교육학 학사',
    badges: ['지도 경력 10년 차', '교원자격증', '시스템 구축 및 강사 교육'],
    desc: '',
  },
  {
    photo: 'https://i.postimg.cc/RZ73P8f2/IMG-7176.jpg',
    name: '운영 팀장',
    tag: '연세대학교 체육교육학 학사',
    badges: ['지도 경력 8년 차', '교원자격증', '강사 관리 및 프로그램 기획'],
    desc: '',
  },
  {
    photo: 'https://i.postimg.cc/5yW4kbxr/20260403-134412.png',
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
          {INSTRUCTORS.map(({ photo, name, tag, badges, desc }) => (
            <div key={name} className="pl-inst-card">
              <div className="pl-inst-body">
                <div className="pl-inst-avatar">
                  <Image
                    src={photo}
                    alt={name}
                    width={176}
                    height={176}
                    sizes="(max-width: 420px) 120px, (max-width: 900px) 144px, 176px"
                  />
                </div>
                <div className="pl-inst-main">
                  <h4 className="pl-inst-name">{name}</h4>
                  <p className="pl-inst-degree">{tag}</p>
                  <ul className="pl-inst-meta">
                    {badges.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                  {desc && <p className="pl-inst-desc">{desc}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
