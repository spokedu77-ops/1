'use client';

type LeadRawContentProps = {
  content: string;
  loading?: boolean;
};

export function LeadRawContent({ content, loading }: LeadRawContentProps) {
  if (loading) {
    return <p className="text-xs text-slate-500">원문을 불러오는 중…</p>;
  }
  if (!content.trim()) {
    return <p className="text-xs text-slate-500">원문이 없습니다.</p>;
  }
  return (
    <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-300">
      {content}
    </pre>
  );
}
