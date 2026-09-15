import { MV_META } from '../../lib/masterUiClasses';

export function ContentCardMetaLine({
  primary,
  secondary,
  className,
}: {
  primary: string;
  secondary?: string;
  className?: string;
}) {
  const first = primary.trim();
  const rest = secondary?.trim() ?? '';
  if (!first && !rest) return null;

  return (
    <p className={`${MV_META} flex min-w-0 items-center overflow-hidden ${className ?? ''}`.trim()}>
      {first ? <span className="shrink-0 text-blue-700">{first}</span> : null}
      {first && rest ? <span className="mx-1.5 shrink-0 text-slate-300" aria-hidden>·</span> : null}
      {rest ? <span className="min-w-0 truncate text-slate-500">{rest}</span> : null}
    </p>
  );
}
