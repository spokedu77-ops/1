import type { Metadata } from 'next';
import { SectionHeader } from '../components/blocks';

export const metadata: Metadata = {
  title: 'SPOKEDU Monthly | 월간 스포키듀',
  description: '월별 운영 기록과 주요 업데이트를 정리합니다.',
};

export default function SpokeduMonthlyPage() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10">
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-5xl">월간 스포키듀</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
          매월 수업 운영 기록, 프로그램 개선 포인트, 다음 달 실행 계획을 월간 단위로 공유합니다.
        </p>
      </section>
      <section className="space-y-6">
        <SectionHeader title="월간 기록" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            '2026년 05월 운영 기록',
            '2026년 04월 운영 기록',
            '2026년 03월 운영 기록',
          ].map((item) => (
            <article key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">{item}</h3>
              <p className="mt-2 text-sm text-slate-600">수업 횟수, 참여 기관, 프로그램 운영 이슈, 개선 액션을 포함합니다.</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
