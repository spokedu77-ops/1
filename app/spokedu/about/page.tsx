import type { Metadata } from 'next';
import { SectionHeader } from '../components/blocks';
import { seoMeta } from '../data/content';

export const metadata: Metadata = {
  title: seoMeta.about.title,
  description: seoMeta.about.description,
};

export default function SpokeduAboutPage() {
  return (
    <div className="space-y-12">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white sm:p-10">
        <h1 className="whitespace-pre-line text-3xl font-semibold leading-tight sm:text-5xl">
          우리는 아이를 가르치고,
          {'\n'}
          선생님을 가르치며,
          {'\n'}
          체육수업을 콘텐츠로 만듭니다
        </h1>
      </section>

      <section className="space-y-7">
        <SectionHeader
          title="SPOKEDU는 어떤 단체인가"
          description="스포키듀는 아동·청소년 체육교육을 전문으로 하는 단체입니다. 체육을 단순히 뛰고 노는 시간이 아니라, 아이들의 움직임을 교육적으로 설계하는 시간으로 봅니다."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {[
            '기본 움직임, 집중력, 반응속도, 자신감, 사회성, 자기조절을 함께 설계합니다.',
            '개인·소그룹 수업, 기관 파견 수업, 원데이 체육행사, 방학캠프를 직접 운영합니다.',
            '좋은 체육수업이 선생님의 감각에만 의존하지 않도록 강사 교육을 제공합니다.',
            '현장에서 검증한 수업을 수업안, 운영 매뉴얼, 교구 활용 콘텐츠로 정리합니다.',
          ].map((item) => (
            <article key={item} className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700 shadow-sm">
              {item}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
