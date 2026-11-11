'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Node as TiptapNode, NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type JSONContent, type NodeViewProps } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Check, Copy } from 'lucide-react';
import styles from './BlogDraftEditor.module.css';

export function DraftModal({ children, label, className, onClose }: { children: ReactNode; label: string; className: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  return <dialog ref={ref} className={className} aria-label={label} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
  }}>{children}</dialog>;
}

// Node views change the editing presentation, retaining TipTap's existing node names and attributes.
export const DraftStarterKit = StarterKit.extend({
  addExtensions() {
    return (this.parent?.() ?? []).map(extension => extension instanceof TiptapNode && extension.name === 'codeBlock'
      ? extension.extend({ addNodeView() { return ReactNodeViewRenderer(DraftCodeBlock); } })
      : extension);
  },
});

export const DraftImage = Image.extend({
  addNodeView() { return ReactNodeViewRenderer(DraftImageView); },
});

function DraftImageView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const [dimensions, setDimensions] = useState('');
  return (
    <NodeViewWrapper as="figure" className={styles.inlineImage} data-selected={selected} contentEditable={false}>
      <img src={node.attrs.src} alt={node.attrs.alt ?? ''} title={node.attrs.title || undefined} width={node.attrs.width || undefined} height={node.attrs.height || undefined} onLoad={event => {
        const image = event.currentTarget;
        setDimensions(`${image.naturalWidth.toLocaleString('ko-KR')} × ${image.naturalHeight.toLocaleString('ko-KR')}px`);
      }} />
      <figcaption>
        <input aria-label="사진 설명" placeholder="사진에 담긴 수업과 활동을 설명해 주세요." value={node.attrs.title ?? ''} readOnly={!editor.isEditable} onChange={event => updateAttributes({ title: event.target.value })} />
        <span>{dimensions}</span>
      </figcaption>
    </NodeViewWrapper>
  );
}

function DraftCodeBlock({ node }: NodeViewProps) {
  const [copyState, setCopyState] = useState('복사');
  return (
    <NodeViewWrapper className={styles.codeBlock}>
      <div className={styles.codeHeader} contentEditable={false}>
        <span className={styles.codeDots} aria-hidden="true"><i /><i /><i /></span>
        <span>{node.attrs.language || '코드 / 텍스트 자료'}</span>
        <button type="button" onClick={async () => {
          try { await navigator.clipboard.writeText(node.textContent); setCopyState('복사됨'); }
          catch { setCopyState('복사 실패'); }
        }}>{copyState === '복사됨' ? <Check size={13} /> : <Copy size={13} />}<span aria-live="polite">{copyState}</span></button>
      </div>
      <pre><NodeViewContent<'code'> as="code" /></pre>
    </NodeViewWrapper>
  );
}

// Captions use the standard image title attribute, so stored documents stay compatible.
export function draftPresentationHtml(html: string) {
  const document = new DOMParser().parseFromString(html, 'text/html');
  document.querySelectorAll('img[title]').forEach(image => {
    const caption = image.getAttribute('title');
    if (!caption) return;
    const figure = document.createElement('figure');
    const text = document.createElement('figcaption');
    text.textContent = caption;
    image.replaceWith(figure);
    figure.append(image, text);
  });
  return document.body.innerHTML;
}

export function draftMarkdown(node: JSONContent): string {
  const children = () => (node.content ?? []).map(draftMarkdown).join('');
  if (node.type === 'text') {
    let text = (node.text ?? '').replace(/([\\`*_\[\]])/g, '\\$1');
    for (const mark of node.marks ?? []) {
      if (mark.type === 'bold') text = `**${text}**`;
      if (mark.type === 'italic') text = `*${text}*`;
      if (mark.type === 'strike') text = `~~${text}~~`;
      if (mark.type === 'code') text = `\`${node.text ?? ''}\``;
      if (mark.type === 'link') text = `[${text}](${mark.attrs?.href ?? ''})`;
      if (mark.type === 'underline') text = `<u>${text}</u>`;
    }
    return text;
  }
  switch (node.type) {
    case 'heading': return `${'#'.repeat(node.attrs?.level ?? 2)} ${children()}\n\n`;
    case 'paragraph': return `${children()}\n\n`;
    case 'hardBreak': return '  \n';
    case 'horizontalRule': return '---\n\n';
    case 'blockquote': return children().trimEnd().split('\n').map(line => `> ${line}`).join('\n') + '\n\n';
    case 'codeBlock': {
      const text = (node.content ?? []).map(child => child.text ?? '').join('');
      const fence = '`'.repeat(Math.max(3, ...(text.match(/`+/g) ?? []).map(run => run.length + 1)));
      return `${fence}${node.attrs?.language ?? ''}\n${text}\n${fence}\n\n`;
    }
    case 'image': return `![${node.attrs?.alt ?? ''}](${node.attrs?.src ?? ''}${node.attrs?.title ? ` ${JSON.stringify(node.attrs.title)}` : ''})\n\n`;
    case 'bulletList': case 'orderedList': case 'taskList': return (node.content ?? []).map((item, index) => {
      const prefix = node.type === 'orderedList' ? `${(node.attrs?.start ?? 1) + index}. ` : node.type === 'taskList' ? `- [${item.attrs?.checked ? 'x' : ' '}] ` : '- ';
      return prefix + draftMarkdown(item).trimEnd().replace(/\n/g, `\n${' '.repeat(prefix.length)}`) + '\n';
    }).join('') + '\n';
    default: return children();
  }
}
