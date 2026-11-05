import Image from 'next/image';
import { Eye, Brain, MoveUpRight } from 'lucide-react';
import { SPOKEDU_IMAGES } from '../../data/images';

export const spomovePhotos = {
  field: SPOKEDU_IMAGES.programs.spomoveClassConnected,
  colorField: SPOKEDU_IMAGES.programs.spomoveColorScreenField,
  mat: { src: '/images/spokedu/spomat-layout.png', alt: 'SPOMAT 실제 제품 — 위 빨강·노랑, 아래 초록·파랑의 2×2 매트' },
};

const steps = [
  { label: 'SEE', title: '시각정보 인지', Icon: Eye },
  { label: 'THINK', title: '규칙 이해·반응 선택', Icon: Brain },
  { label: 'MOVE', title: '신체 움직임 수행', Icon: MoveUpRight },
];

export function SpomoveProcessingFlow() {
  return <ol className="web-processing-flow" aria-label="SPOMOVE 정보처리 흐름">{steps.map(({ label, title, Icon }) => <li key={label}><Icon size={22} strokeWidth={1.7} aria-hidden="true" /><strong>{label}</strong><span>{title}</span></li>)}</ol>;
}

export function SpomoveFieldPhoto() {
  return <figure className="web-spomove-field">
    <picture><source media="(max-width: 639px)" srcSet={spomovePhotos.colorField.src} /><img src={spomovePhotos.field.src} alt="화면의 시각 자극을 보고 SPOMAT 4색 매트 위에서 움직이는 아동과 수업 지도자" loading="lazy" width={1280} height={960} /></picture>
    <figcaption>화면 자극을 확인하고, 규칙에 따라 4색 매트 위에서 움직이는 실제 수업 현장</figcaption>
  </figure>;
}

export function SpomatProductPhoto() {
  return <figure className="web-spomat-product"><div><Image unoptimized src={spomovePhotos.mat.src} alt={spomovePhotos.mat.alt} loading="lazy" width={322} height={337} /></div><figcaption><strong>SPOMAT · 4색 2×2 매트</strong><span>위 빨강·노랑 / 아래 초록·파랑</span></figcaption></figure>;
}
