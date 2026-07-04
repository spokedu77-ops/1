'use client';

import { Check, Copy } from 'lucide-react';
import { useCallback, useState, type ReactNode } from 'react';
import { createInlineBlockEnterHandler } from '../../_lib/noteInlineBlockEnter';
import {
  CODE_LANGUAGE_OPTIONS,
  codeLanguageLabel,
  readCodeLanguage,
} from '../../_lib/noteCodeBlock';
import { NoteBlockFormattedField } from './NoteBlockFormattedField';
import type { NoteInlineTextBlockProps } from './noteBlockContentTypes';

export function NoteCodeBlock({
  block,
  liveContent,
  contentMarginLeft,
  enterCreatesBlockBelow,
  onContentPatch,
  onEnter,
  onAddBelow,
  onChangeType,
  onIndentChange,
  onSlashChange,
  slashHostRef,
  renderSlashMenuPortal,
  ...fieldProps
}: NoteInlineTextBlockProps & {
  renderSlashMenuPortal: () => ReactNode;
}) {
  const text = typeof liveContent.text === 'string' ? liveContent.text : '';
  const language = readCodeLanguage(liveContent);
  const [copied, setCopied] = useState(false);

  const handleCodeEnter = createInlineBlockEnterHandler({
    block,
    followType: 'code',
    text,
    onAddBelow,
    onChangeType,
    onIndentChange,
  });

  const handleCopy = useCallback(async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }, [text]);

  return (
    <div
      className="relative rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 shadow-sm"
      style={{ marginLeft: `${contentMarginLeft}px` }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <select
          value={language}
          onChange={(e) => onContentPatch({ language: e.target.value })}
          className="max-w-[160px] cursor-pointer rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-300 outline-none focus:border-slate-500"
          aria-label="코드 언어"
        >
          {CODE_LANGUAGE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => { void handleCopy(); }}
          disabled={!text.trim()}
          className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-[11px] font-medium text-slate-300 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="코드 복사"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
      <NoteBlockFormattedField
        block={block}
        text={text}
        placeholder={`${codeLanguageLabel(language)} 코드 (/ 로 블록 변환)`}
        textClassName="font-mono text-[13px] leading-6 text-slate-100"
        tabBehavior="block-indent"
        enterCreatesBlock={enterCreatesBlockBelow}
        enterSplitOnMidBlock={enterCreatesBlockBelow}
        onEditorEnter={enterCreatesBlockBelow ? handleCodeEnter : onEnter}
        onContentPatch={onContentPatch}
        onChangeType={onChangeType}
        onIndentChange={onIndentChange}
        onSlashChange={onSlashChange}
        slashHostRef={slashHostRef}
        {...fieldProps}
      />
      {renderSlashMenuPortal()}
    </div>
  );
}
