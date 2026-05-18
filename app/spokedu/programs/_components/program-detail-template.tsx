import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageShell } from '../../components/page-shell';
import { getProgramBySlug, type ProgramSlug } from '../../data/programs';
import { inferTrackFromHref } from '../../lib/tracking';

type ProgramDetailTemplateProps = {
  slug: ProgramSlug;
};

export function ProgramDetailTemplate({ slug }: ProgramDetailTemplateProps) {
  const program = getProgramBySlug(slug);
  if (!program || !program.expandable) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageShell title={program.title} description={program.detailDescription ?? program.description} />
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">프로그램 문의 안내</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          대상, 운영 목적, 공간/인원 조건을 확인한 뒤 프로그램 제안을 안내합니다.
        </p>
        <Link
          href={program.inquiryHref}
          data-track={inferTrackFromHref(program.inquiryHref)}
          data-track-label={`${program.slug}-inquiry`}
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          문의하기
        </Link>
      </section>
    </div>
  );
}
