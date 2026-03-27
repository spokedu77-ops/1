import Link from 'next/link';

export default function ScreenPlayAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">스크린 플레이</h1>
            <p className="text-sm text-neutral-400">
              띵크 → 챌린지 → 플로우 + SPOMOVE · 카메라 앱 + 에셋
            </p>
          </div>

          <nav className="flex flex-wrap gap-2 text-sm">
            <Link
              className="rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700"
              href="/admin/iiwarmup"
            >
              Overview
            </Link>
            <Link
              className="rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700"
              href="/admin/iiwarmup/think"
            >
              Think
            </Link>
            <Link
              className="rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700"
              href="/admin/iiwarmup/challenge"
            >
              Challenge
            </Link>
            <Link
              className="rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700"
              href="/admin/iiwarmup/flow"
            >
              Flow
            </Link>
            <Link
              className="rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700"
              href="/admin/iiwarmup/assets"
            >
              AssetHub
            </Link>
            <Link
              className="rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700"
              href="/admin/memory-game"
            >
              SPOMOVE
            </Link>
            <Link
              className="rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700"
              href="/admin/camera"
            >
              카메라 앱
            </Link>
          </nav>
        </header>

        <main className="mt-6">{children}</main>
      </div>
    </div>
  );
}
