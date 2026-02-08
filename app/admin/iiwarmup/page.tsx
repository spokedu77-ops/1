import Link from 'next/link';

export default function IIWarmupAdminOverviewPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-extrabold">IIWARMUP Admin</h2>
        <p className="mt-1 text-sm text-neutral-400">
          PLAY / THINK / FLOW 3단계 + 에셋 + 스케줄러
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <a
          href="/iiwarmup?week=1&audience=elementary"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800 transition hover:ring-neutral-600 cursor-pointer"
        >
          <h3 className="text-base font-extrabold">구독자 미리보기</h3>
          <p className="mt-2 text-sm text-neutral-400">
            실제 구독자가 보는 화면 (전체화면)
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-blue-400">
            새 창에서 열기 →
          </span>
        </a>

        <Link
          href="/admin/iiwarmup/play"
          className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800 transition hover:ring-neutral-600 cursor-pointer"
        >
          <h3 className="text-base font-extrabold">Play Studio</h3>
          <p className="mt-2 text-sm text-neutral-400">
            Play 엔진 제작·테스트, tick/phase 검증
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-blue-400">
            진입 →
          </span>
        </Link>

        <Link
          href="/admin/iiwarmup/think"
          className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800 transition hover:ring-neutral-600 cursor-pointer"
        >
          <h3 className="text-base font-extrabold">Think Studio</h3>
          <p className="mt-2 text-sm text-neutral-400">
            150초 SPOKEDU Think 프로그램 제작·미리보기
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-blue-400">
            진입 →
          </span>
        </Link>

        <Link
          href="/admin/iiwarmup/flow"
          className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800 transition hover:ring-neutral-600 cursor-pointer"
        >
          <h3 className="text-base font-extrabold">Flow Studio</h3>
          <p className="mt-2 text-sm text-neutral-400">
            3D 몰입 환경, 공간 왜곡·속도 제어
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-blue-400">
            진입 →
          </span>
        </Link>

        <Link
          href="/admin/iiwarmup/assets"
          className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800 transition hover:ring-neutral-600 cursor-pointer"
        >
          <h3 className="text-base font-extrabold">AssetHub</h3>
          <p className="mt-2 text-sm text-neutral-400">
            Play/Think 에셋 업로드·관리
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-blue-400">
            진입 →
          </span>
        </Link>

        <Link
          href="/admin/iiwarmup/scheduler"
          className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800 transition hover:ring-neutral-600 cursor-pointer"
        >
          <h3 className="text-base font-extrabold">Scheduler</h3>
          <p className="mt-2 text-sm text-neutral-400">
            주차별 워밍업 배정, program_snapshot
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-blue-400">
            진입 →
          </span>
        </Link>
      </section>
    </div>
  );
}
