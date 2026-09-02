import { ArrowRight, Dumbbell, MonitorPlay } from 'lucide-react';
import Link from 'next/link';

const PROGRAM_DOMAINS = [
  {
    href: '/spokedu-master/library',
    title: '놀이체육',
    description: '수업 목표와 현장 조건에 맞는 활동을 찾고 수업에 구성합니다.',
    Icon: Dumbbell,
  },
  {
    href: '/spokedu-master/spomove',
    title: 'SPOMOVE',
    description: '스포매트 기반 디지털 움직임 활동을 살펴봅니다.',
    Icon: MonitorPlay,
  },
] as const;

export default function ProgramsPage() {
  return (
    <main className="h-full overflow-y-auto bg-[var(--spm-bg)] pb-28 lg:pb-8">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
        <header className="border-b border-slate-200 pb-4">
          <p className="text-xs font-medium text-slate-500">DISCOVER · BUILD</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">프로그램</h1>
          <p className="mt-2 text-sm text-slate-600">수업에 사용할 콘텐츠 영역을 선택하세요.</p>
        </header>
        <section className="mt-5 grid gap-4 md:grid-cols-2" aria-label="프로그램 영역">
          {PROGRAM_DOMAINS.map(({ href, title, description, Icon }) => (
            <Link key={href} href={href} className="group flex min-h-40 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)]">
              <Icon className="h-6 w-6 text-slate-700" aria-hidden />
              <span className="mt-8 flex items-end justify-between gap-4">
                <span><strong className="block text-lg font-semibold text-slate-950">{title}</strong><span className="mt-1 block text-sm leading-6 text-slate-600">{description}</span></span>
                <ArrowRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
