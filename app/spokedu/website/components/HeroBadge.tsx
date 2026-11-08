export function HeroBadge({ children }: { children: React.ReactNode }) {
  return <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm mb-8">
    <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
    <span>{children}</span>
  </div>;
}
