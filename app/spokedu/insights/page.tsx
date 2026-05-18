import type { Metadata } from 'next';
import { SectionHeader } from '../components/blocks';

export const metadata: Metadata = {
  title: 'SPOKEDU Insights | 교육 인사이트',
  description: '아동·청소년 움직임 교육에 대한 관점과 노하우를 공유합니다.',
};

export default function SpokeduInsightsPage() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10">
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-5xl">교육 인사이트</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
          아동·청소년 움직임 교육을 설계할 때 필요한 관점, 운영 원칙, 강사 교육 기준을 글과 자료로 정리합니다.
        </p>
      </section>
      <section className="space-y-6">
        <SectionHeader title="최근 인사이트" />
        <div className="grid gap-4 md:grid-cols-2">
          {[
            '좋은 체육수업은 왜 반복 가능한 구조가 필요한가',
            '기관 파견 수업에서 공간 맞춤 설계가 중요한 이유',
            '학부모 상담에서 움직임 자신감 변화를 설명하는 방법',
            '강사 교육에서 피드백 루프를 만드는 운영 기준',
          ].map((item) => (
            <article key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">{item}</h3>
              <p className="mt-2 text-sm text-slate-600">현장 운영 경험을 기반으로 정리한 교육 관점 콘텐츠입니다.</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
