type ProofMarqueeStripProps = {
  items: readonly string[];
};

/** Compact proof wall — each label is exposed once for screen readers and visually. */
export function ProofMarqueeStrip({ items }: ProofMarqueeStripProps) {
  return (
    <ul
      role="list"
      className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:gap-2.5 sm:p-4"
    >
      {items.map((item) => (
        <li
          key={item}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 sm:rounded-xl sm:px-3.5 sm:py-2 sm:text-sm"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
