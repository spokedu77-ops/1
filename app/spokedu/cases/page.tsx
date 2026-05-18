import type { Metadata } from 'next';
import { SectionHeader } from '../components/blocks';

export const metadata: Metadata = {
  title: 'SPOKEDU Cases | 수업 사례',
  description: '기관 및 아동 대상 실제 수업 운영 사례를 정리합니다.',
};

export default function SpokeduCasesPage() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10">
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-5xl">수업 사례</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
          기관 환경, 대상 연령, 운영 목적에 맞춰 어떻게 수업을 설계하고 실행했는지 사례 중심으로 정리합니다.
        </p>
      </section>
      <section className="space-y-6">
        <SectionHeader title="대표 사례 아카이브" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            '양천거점형키움센터 SPOMOVE',
            '동작거점형키움센터 리듬챌린지',
            '다사랑영등포지역아동센터 원데이 체육행사',
            'PLAYZ Lounge 방학캠프',
            '서대문형무소 어린이날 체험 부스',
            '스포키듀 LAB 파일럿 클래스',
          ].map((item) => (
            <article key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">{item}</h3>
              <p className="mt-2 text-sm text-slate-600">운영 목표, 대상, 핵심 활동, 현장 피드백 중심으로 정리된 사례입니다.</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
