import Link from 'next/link';
import { Library, Zap } from 'lucide-react';

export default function AdminSpokeduMasterPage() {
  return (
    <div className="h-full overflow-y-auto p-8" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
      <h1 className="mb-1 text-[20px] font-bold" style={{ color: 'var(--spm-t)' }}>spokedu-master 콘텐츠 관리</h1>
      <p className="mb-8 text-[13px]" style={{ color: 'var(--spm-t3)' }}>curriculum 원본은 건드리지 않고 태그·테마·PRO 설정을 덧붙입니다.</p>
      <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
        <Link
          href="/admin/spokedu-master/programs"
          className="flex items-center gap-4 rounded-xl p-5 transition-colors"
          style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: 'rgba(99,102,241,0.14)' }}>
            <Library size={20} color="#a5b4fc" />
          </span>
          <span>
            <strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>프로그램 메타</strong>
            <span className="mt-0.5 block text-[12px]" style={{ color: 'var(--spm-t3)' }}>태그 · 테마 · PRO · NEW · HOT</span>
          </span>
        </Link>
        <Link
          href="/admin/spokedu-master/drills"
          className="flex items-center gap-4 rounded-xl p-5 transition-colors"
          style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: 'rgba(16,185,129,0.12)' }}>
            <Zap size={20} color="#6ee7b7" />
          </span>
          <span>
            <strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>SPOMOVE 드릴 메타</strong>
            <span className="mt-0.5 block text-[12px]" style={{ color: 'var(--spm-t3)' }}>PRO · 표시 이름 · 엔진 연결</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
