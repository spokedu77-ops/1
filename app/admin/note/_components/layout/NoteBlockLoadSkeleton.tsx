'use client';

/** Notion-style block placeholders while a page loads (never a blank white page). */
export function NoteBlockLoadSkeleton() {
  const widths = ['100%', '92%', '78%', '65%', '88%', '72%'];
  return (
    <div
      className="space-y-3 py-2"
      role="status"
      aria-label="페이지 불러오는 중"
    >
      {widths.map((width, index) => (
        <div
          key={index}
          className="h-4 rounded-md bg-neutral-100"
          style={{ width }}
        />
      ))}
    </div>
  );
}
