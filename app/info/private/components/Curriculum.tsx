import { CURRICULUM_IMAGES } from '../data/images';

export default function Curriculum() {
  return (
    <section id="curriculum" style={{ background: 'var(--pl-bg-alt)' }}>
      <div className="pl-container">
        <h2 className="pl-section-title">전문 커리큘럼</h2>
        <p className="pl-lead">아이의 연령과 기초 체력을 분석하여 가장 적합한 프로그램을 개별 설계합니다.</p>
        <div className="pl-curr-grid">
          {CURRICULUM_IMAGES.map(({ img, alt, title, desc }) => (
            <div key={title} className="pl-curr-item">
              <img src={img} alt={alt} />
              <div className="pl-curr-content">
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
