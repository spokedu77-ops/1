'use client';

type ProofMarqueeStripProps = {
  items: readonly string[];
};

export function ProofMarqueeStrip({ items }: ProofMarqueeStripProps) {
  const loop = [...items, ...items];

  return (
  <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white py-3">
        <div className="proof-marquee flex min-w-max gap-2 px-3">
          {loop.map((item, idx) => (
            <span
              key={`${item}-${idx}`}
              className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
      <style jsx>{`
        @keyframes spokedu-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        .proof-marquee {
          animation: spokedu-marquee 28s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .proof-marquee {
            animation: none;
            flex-wrap: wrap;
            min-width: 0;
            justify-content: center;
          }
        }
      `}</style>
    </>
  );
}
