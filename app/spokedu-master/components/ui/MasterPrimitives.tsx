import type { ReactNode } from 'react';
import Link from 'next/link';

type ShellVariant = 'editorial' | 'operational' | 'document' | 'wide';
const WIDTH: Record<ShellVariant, string> = {
  editorial: 'max-w-7xl',
  operational: 'max-w-5xl',
  document: 'max-w-3xl',
  wide: 'max-w-[1376px]',
};

export function MasterPageShell({ children, variant = 'operational', className = '' }: { children: ReactNode; variant?: ShellVariant; className?: string }) {
  return <div className={`mx-auto w-full ${WIDTH[variant]} px-4 py-6 sm:px-6 lg:py-8 ${className}`}>{children}</div>;
}

export function MasterPageHeader({ title, description, action, className = '' }: { title: string; description?: string; action?: ReactNode; className?: string }) {
  return <header className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`}>
    <div className="min-w-0"><h1 className="text-[28px] font-bold leading-tight text-slate-950 sm:text-[30px]">{title}</h1>{description ? <p className="mt-2 max-w-2xl text-[14px] leading-6 text-slate-600">{description}</p> : null}</div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </header>;
}

export function MasterSection({ title, action, children, className = '', titleId }: { title: string; action?: ReactNode; children: ReactNode; className?: string; titleId?: string }) {
  return <section className={className} aria-labelledby={titleId}><div className="mb-4 flex items-center justify-between gap-4"><h2 id={titleId} className="text-[21px] font-semibold leading-tight text-slate-950">{title}</h2>{action ? <div className="shrink-0">{action}</div> : null}</div>{children}</section>;
}

export function MasterCollectionRow({ children, href, className = '' }: { children: ReactNode; href?: string; className?: string }) {
  const classes = `flex min-h-16 w-full items-center gap-4 border-b border-slate-200 py-3 text-left last:border-b-0 ${className}`;
  return href ? <Link href={href} className={classes}>{children}</Link> : <div className={classes}>{children}</div>;
}

export function MasterContentCard({ children, href, className = '' }: { children: ReactNode; href?: string; className?: string }) {
  const classes = `group block overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-slate-300 ${className}`;
  return href ? <Link href={href} className={classes}>{children}</Link> : <article className={classes}>{children}</article>;
}

export function MasterAgenda({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`divide-y divide-slate-200 ${className}`} data-master-agenda>{children}</div>;
}

export function MasterDocumentSurface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <article className={`mx-auto w-full max-w-3xl ${className}`} data-master-document>{children}</article>;
}
