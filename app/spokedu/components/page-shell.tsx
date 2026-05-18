import { SectionHeader } from './blocks';

type PageShellProps = {
  title: string;
  description: string;
};

export function PageShell({ title, description }: PageShellProps) {
  return (
    <section className="space-y-6">
      <SectionHeader title={title} description={description} />
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-600">
        본문은 다음 단계에서 각 페이지 목적(Private/Dispatch/Curriculum/Programs/Records/Contact)에 맞게 확장합니다.
      </div>
    </section>
  );
}
