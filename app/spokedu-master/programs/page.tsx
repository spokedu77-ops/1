import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { MasterPageHeader, MasterPageShell } from '../components/ui/MasterPrimitives';

const PROGRAM_DOMAINS = [
  { href: '/spokedu-master/library', title: '놀이체육', description: '현장에서 바로 활용하는 놀이·뉴스포츠 활동', image: '/spokedu/spokedu-promo-banner.png' },
  { href: '/spokedu-master/spomove', title: 'SPOMOVE', description: '화면과 움직임을 연결하는 디지털 활동', image: '/spomove/dive/color-gate/star.png' },
] as const;

export default function ProgramsPage() {
  return <main className="h-full overflow-y-auto bg-[var(--spm-bg)] pb-28 lg:pb-8">
    <MasterPageShell variant="editorial">
      <MasterPageHeader title="수업 프로그램" description="오늘 어떤 수업을 준비하시나요?" />
      <section className="mt-5 grid gap-5 lg:grid-cols-2" aria-label="프로그램 영역">
        {PROGRAM_DOMAINS.map(({ href, title, description, image }) => <Link key={href} href={href} className="group overflow-hidden rounded-2xl bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)]">
          <span className="relative block aspect-[16/10] overflow-hidden bg-slate-200"><Image src={image} alt="" fill sizes="(min-width: 1024px) 48vw, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" /></span>
          <span className="flex items-end gap-4 p-5"><span className="min-w-0 flex-1"><strong className="block text-[20px] font-semibold text-slate-950">{title}</strong><span className="mt-2 block truncate text-[14px] text-slate-600">{description}</span></span><ArrowRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1" /></span>
        </Link>)}
      </section>
    </MasterPageShell>
  </main>;
}
