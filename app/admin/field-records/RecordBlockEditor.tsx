'use client';

import { BlockNoteSchema, defaultBlockSpecs, type PartialBlock } from '@blocknote/core';
import { ko } from '@blocknote/core/locales';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import type { RecordBlock } from '@/app/lib/field-records/contract';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/shadcn/style.css';

const schema = BlockNoteSchema.create({ blockSpecs: { paragraph: defaultBlockSpecs.paragraph, heading: defaultBlockSpecs.heading, bulletListItem: defaultBlockSpecs.bulletListItem, numberedListItem: defaultBlockSpecs.numberedListItem } });
export default function RecordBlockEditor({ initial, onChange }: { initial: RecordBlock[]; onChange: (blocks: RecordBlock[]) => void }) {
  const editor = useCreateBlockNote({ schema, dictionary: ko, initialContent: initial.length ? initial as PartialBlock<typeof schema.blockSchema>[] : undefined });
  return <><div className="mb-3 px-4"><button type="button" className="rounded-lg border px-3 py-2 text-xs" onClick={async () => {
    try {
      const text = await navigator.clipboard.readText();
      const blocks = await editor.tryParseMarkdownToBlocks(text);
      editor.insertBlocks(blocks, editor.getTextCursorPosition().block, 'after');
    } catch { window.alert('클립보드 접근을 허용하거나 본문에 직접 붙여넣어 주세요.'); }
  }}>클립보드 원고를 제목·문단·목록으로 붙여넣기</button></div><BlockNoteView editor={editor} theme="light" onChange={() => onChange(editor.document as RecordBlock[])} /></>;
}
