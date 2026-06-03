import Link from 'next/link';
import { Library, Zap } from 'lucide-react';

export default function AdminSpokeduMasterPage() {
  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-8 text-slate-950">
      <h1 className="text-[22px] font-black">SPOKEDU MASTER Admin</h1>
      <p className="mt-2 max-w-2xl text-[13px] font-semibold leading-6 text-slate-600">
        센터 curriculum 원본을 직접 수정하지 않고, MASTER 구독 상품에 노출될 수업 자료와 SPOMOVE 연결 정보를 관리합니다.
      </p>

      <div className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
        <Link
          href="/admin/spokedu-master/programs"
          className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-indigo-100 text-indigo-700">
            <Library size={20} />
          </span>
          <span>
            <strong className="block text-[15px] font-black text-slate-950">MASTER 수업 자료 편집기</strong>
            <span className="mt-1 block text-[12px] font-semibold leading-5 text-slate-500">
              기본 정보, 준비물, 진행 순서, 노출 상태를 편집합니다.
            </span>
          </span>
        </Link>

        <Link
          href="/admin/spokedu-master/drills"
          className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
            <Zap size={20} />
          </span>
          <span>
            <strong className="block text-[15px] font-black text-slate-950">SPOMOVE 드릴 메타</strong>
            <span className="mt-1 block text-[12px] font-semibold leading-5 text-slate-500">
              드릴 표시 이름, PRO 여부, 노출 순서를 관리합니다.
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
