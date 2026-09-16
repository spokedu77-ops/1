import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function PolicyHeader({ title, fromProfile }: { title: string; fromProfile: boolean }) {
  const href = fromProfile ? '/spokedu-master/profile' : '/spokedu-master/landing';
  const returnLabel = fromProfile ? '???? ????' : '??? ??? ????';

  return (
    <header className="mx-auto flex w-full max-w-[760px] items-center gap-3 px-5 pb-8 pt-5 sm:px-8 sm:pt-8">
      <Link href={href} className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] border border-slate-200 text-slate-600 outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)]" aria-label={returnLabel}>
        <ArrowLeft size={18} />
      </Link>
      <div>
        <p className="text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>SPOKEDU MASTER</p>
        <h1 className="mt-0.5 text-[28px] font-semibold leading-tight" style={{ color: 'var(--spm-t)' }}>{title}</h1>
      </div>
    </header>
  );
}
