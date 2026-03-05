import { CLASS_FLOW_IMAGES } from '../data/images';

const STEPS = [
  {
    num: '01',
    title: '라포 형성 및 인지 웜업 (10분)',
    desc: '강사와의 유대감을 형성하고, 그날 진행할 활동의 목적을 가벼운 퀴즈나 놀이 형식으로 인지시킵니다.',
  },
  {
    num: '02',
    title: '메인 타겟 신체 활동 (40분)',
    desc: '야외 환경을 적극 활용하여 사전에 계획된 개인 맞춤형 종목(자전거, 줄넘기, 구기 등)의 스킬업과 몰입 활동을 진행합니다.',
  },
  {
    num: '03',
    title: '쿨다운 및 긍정 피드백 (10분)',
    desc: '신체를 안정시키며 오늘 성취한 부분에 대해 스스로 이야기하게 유도하고, 긍정적인 피드백으로 자존감을 높여 마무리합니다.',
  },
];

export default function ClassFlow() {
  return (
    <section id="class-flow">
      <div className="pl-container">
        <h2 className="pl-section-title">스포키듀 60분 수업 현장</h2>
        <p className="pl-lead">아이의 몰입을 완벽하게 이끌어내는 체계적인 3단계 수업 구조입니다. (60분 기준)</p>
        <div className="pl-flow-wrapper">
          <div className="pl-flow-timeline">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="pl-flow-step">
                <div className="pl-flow-icon">{num}</div>
                <div className="pl-flow-content">
                  <h4>{title}</h4>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="pl-flow-gallery">
            {CLASS_FLOW_IMAGES.map((img) => (
              <img
                key={img.alt}
                src={img.src}
                alt={img.alt}
                className={img.large ? 'pl-large' : ''}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
