'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, ChevronRight, Loader2 } from 'lucide-react';

export function Screen({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#dfe3ea] bg-white p-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#667085]">Workspace</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#667085]">{desc}</p>
      </div>
      {children}
    </div>
  );
}

export function Panel({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#dfe3ea] bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-black">{title}</h3>
        {action && (
          <button type="button" onClick={onAction} className="text-xs font-black text-[#1f5eff]">
            {action}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-[#dfe3ea] bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-wide text-[#667085]">{label}</p>
        <Icon className="h-4 w-4 text-[#1f5eff]" />
      </div>
      <p className="mt-3 text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold text-[#667085]">{note}</p>
    </div>
  );
}

export function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#dfe3ea] bg-[#fbfcfd] p-3 text-center">
      <p className="text-[11px] font-bold text-[#667085]">{label}</p>
      <p className="mt-1 text-sm font-black text-[#172033]">{value}</p>
    </div>
  );
}

export function Quick({
  label,
  caption,
  icon: Icon,
  onClick,
  busy = false,
}: {
  label: string;
  caption: string;
  icon: React.ElementType;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex w-full items-center gap-3 rounded-lg border border-[#dfe3ea] bg-white p-3 text-left hover:bg-[#fbfcfd] disabled:opacity-60"
    >
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#edf3ff] text-[#1f5eff]">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
      </div>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black">{label}</span>
        <span className="block text-xs font-semibold text-[#667085]">{caption}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-[#98a2b3]" />
    </button>
  );
}

export function QuickLink({
  label,
  caption,
  icon: Icon,
  href,
}: {
  label: string;
  caption: string;
  icon: React.ElementType;
  href: string;
}) {
  return (
    <Link href={href} className="flex w-full items-center gap-3 rounded-lg border border-[#dfe3ea] bg-white p-3 text-left hover:bg-[#fbfcfd]">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#edf3ff] text-[#1f5eff]">
        <Icon className="h-5 w-5" />
      </div>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black">{label}</span>
        <span className="block text-xs font-semibold text-[#667085]">{caption}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-[#98a2b3]" />
    </Link>
  );
}

export function ChecklistItem({ title, desc, done = false }: { title: string; desc: string; done?: boolean }) {
  return (
    <div className="flex gap-3 rounded-lg border border-[#dfe3ea] bg-[#fbfcfd] p-3">
      <div
        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black ${
          done ? 'bg-[#e8f7ee] text-[#16884a]' : 'bg-[#edf3ff] text-[#1f5eff]'
        }`}
      >
        {done ? '✓' : '•'}
      </div>
      <div>
        <p className="text-sm font-black">{title}</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-[#667085]">{desc}</p>
      </div>
    </div>
  );
}

export function FlowStep({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-[#dfe3ea] bg-[#fbfcfd] p-3">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#edf3ff] text-xs font-black text-[#1f5eff]">{num}</span>
      <p className="mt-3 text-sm font-black">{title}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-[#667085]">{desc}</p>
    </div>
  );
}

export function MiniAction({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-lg text-xs font-black ${
        active ? 'bg-[#edf3ff] text-[#1546d0]' : 'bg-[#f3f5f8] text-[#98a2b3]'
      }`}
    >
      {label}
    </button>
  );
}

export function ProgramSkeleton() {
  return (
    <div className="rounded-xl border border-[#dfe3ea] bg-white p-4">
      <div className="h-36 animate-pulse rounded-lg bg-[#eef1f5]" />
      <div className="mt-4 h-5 w-2/3 animate-pulse rounded bg-[#eef1f5]" />
      <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-[#eef1f5]" />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-[#eef1f5]" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-[#eef1f5]" />
      </div>
    </div>
  );
}

export function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-[#667085]">{label}</span>
      <input value={value} readOnly className="h-11 w-full rounded-lg border border-[#dfe3ea] bg-[#fbfcfd] px-3 text-sm font-bold outline-none" />
    </label>
  );
}

export function ArrowText({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      {children}
      <ArrowRight className="h-4 w-4" />
    </span>
  );
}
