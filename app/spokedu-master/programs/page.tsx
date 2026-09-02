import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const PROGRAM_DOMAINS = [
  { href: '/spokedu-master/library', title: '놀이체육', description: '수업 목표와 현장 조건에 맞는 활동을 찾아 수업을 구성하세요.', image: '/spokedu/spokedu-promo-banner.png' },
  { href: '/spokedu-master/spomove', title: 'SPOMOVE', description: '화면의 신호에 반응하며 움직이는 디지털 체육 활동을 만나보세요.', image: '/spomove/dive/color-gate/star.png' },
] as const;

export default function ProgramsPage() {
  return <main className="h-full overflow-y-auto bg-[var(--spm-bg)] pb-28 lg:pb-8">
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
      <header className="border-b border-slate-200 pb-5"><h1 className="text-[28px] font-bold text-slate-950">프로그램</h1><p className="mt-2 text-[15px] text-slate-600">수업에 사용할 콘텐츠 영역을 선택하세요.</p></header>
      <section className="mt-5 grid gap-5 lg:grid-cols-2" aria-label="프로그램 영역">
        {PROGRAM_DOMAINS.map(({ href, title, description, image }) => <Link key={href} href={href} className="group overflow-hidden rounded-2xl bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)]">
          <span className="relative block aspect-[16/10] overflow-hidden bg-slate-200"><Image src={image} alt="" fill sizes="(min-width: 1024px) 48vw, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" /></span>
          <span className="flex items-end gap-4 p-5"><span className="min-w-0 flex-1"><strong className="block text-[20px] font-semibold text-slate-950">{title}</strong><span className="mt-2 block truncate text-[14px] text-slate-600">{description}</span></span><ArrowRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1" /></span>
        </Link>)}
      </section>
    </div>
  </main>;
}
