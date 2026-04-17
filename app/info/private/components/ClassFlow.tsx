import { CLASS_FLOW_IMAGES } from '../data/images';
import Image from 'next/image';

const STEPS = [
  {
    num: '01',
    title: '라포 형성 및 신체기능 향상 세션',
    desc: '강사와의 유대감을 형성하고, 그날 진행할 메인 활동에 필요한 신체 기능 향상 프로그램을 진행합니다.',
  },
  {
    num: '02',
    title: '메인 활동',
    desc: '아동별 발달 특성과 운동 수행 수준에 따라 다양한 종목을 맞춤형으로 구성하고 기술 습득과 신체 기능 향상이 함께 이루어지는 체육 수업을 제공합니다.',
  },
  {
    num: '03',
    title: '쿨다운 및 피드백',
    desc: '신체를 안정시키며 오늘 성취한 부분에 대해 스스로 이야기하게 유도하고, 긍정적인 피드백으로 자존감을 높여 마무리합니다.',
  },
];

export default function ClassFlow() {
  return (
    <section id="class-flow">
      <div className="pl-container">
        <h2 className="pl-section-title">스포키듀 60분 수업 스케치</h2>
        <p className="pl-lead">아이의 몰입을 완벽하게 이끌어내는 체계적인 3단계 수업 구조입니다.</p>
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
              <Image
                key={img.alt}
                src={img.src}
                alt={img.alt}
                className={img.large ? 'pl-large' : ''}
                width={img.large ? 1600 : 900}
                height={img.large ? 700 : 900}
                sizes="(max-width: 900px) 100vw, 50vw"
                loading="lazy"
                fetchPriority="low"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
