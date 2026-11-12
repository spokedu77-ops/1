'use client';

import Link from 'next/link';
import styles from './BlogDraftEditor.module.css';
import SpokeduBlogArticle, { type EditorNode } from './SpokeduBlogArticle';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import TipTapLink from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { ArrowLeft, Archive, Bold, ChevronDown, Clock3, Code2, Copy, Eye, ImagePlus, ImageIcon, Italic, Keyboard, Link2, List, ListChecks, ListOrdered, Minus, Quote, Send, Sigma, Strikethrough, TextCursorInput, X } from 'lucide-react';
import { BLOG_DRAFT_CATEGORIES, blogDraftStatusLabel, type BlogDraftWrite } from '@/app/lib/blog-drafts/contract';
import { DraftImage, DraftModal, DraftStarterKit, draftMarkdown } from './BlogDraftEditorParts';

type Status = BlogDraftWrite['status'];
type DraftResponse = {
  id: string;
  title: string;
  content: BlogDraftWrite['content'];
  category: BlogDraftWrite['category'];
  tags: string[];
  status: Status;
  featured_image: string | null;
  published_url: string | null;
  published_at: string | null;
  revision: number;
  updated_at: string;
  revision_count: number;
};

const emptyDoc = { type: 'doc', content: [{ type: 'paragraph' }] } as BlogDraftWrite['content'];

export function BlogDraftEditor({ draftId }: { draftId: string }) {
  const router = useRouter();
  const creating = draftId === 'new';
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BlogDraftWrite['category']>('기타');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [status, setStatus] = useState<Status>('draft');
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState('');
  const [publishedAt, setPublishedAt] = useState('');
  const [revision, setRevision] = useState(1);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState('');
  const [revisionCount, setRevisionCount] = useState(0);
  const [ready, setReady] = useState(creating);
  const [mode, setMode] = useState<'edit' | 'markdown'>('edit');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const previewArticleRef = useRef<HTMLDivElement>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const idRef = useRef(creating ? '' : draftId);
  const revisionRef = useRef(1);
  const saving = useRef(false);
  const queued = useRef(false);
  const hydrating = useRef(false);
  const fieldsRef = useRef({ title, category, tags, status, featuredImage, publishedUrl, publishedAt });
  useLayoutEffect(() => {
    fieldsRef.current = { title, category, tags, status, featuredImage, publishedUrl, publishedAt };
  }, [title, category, tags, status, featuredImage, publishedUrl, publishedAt]);
  const saveRef = useRef<() => Promise<boolean>>(async () => false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      DraftStarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false }),
      TipTapLink.configure({ openOnClick: false, autolink: true }),
      DraftImage.configure({ inline: false, allowBase64: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: '수업의 경험과 움직임의 가치를 글로 담아보세요. 본문을 입력하거나 사진을 추가할 수 있습니다.' }),
      CharacterCount,
    ],
    content: emptyDoc,
    editorProps: { attributes: { class: `blog-draft-editor ${styles.richText}` } },
    onUpdate: () => { if (!hydrating.current) setDirty(true); },
  });
  useEditorState({ editor, selector: ({ transactionNumber }) => transactionNumber });

  const applyDraft = useCallback((draft: DraftResponse) => {
    idRef.current = draft.id;
    revisionRef.current = draft.revision;
    setRevision(draft.revision);
    setTitle(draft.title);
    setCategory(draft.category);
    setTags(draft.tags ?? []);
    setStatus(draft.status);
    setFeaturedImage(draft.featured_image);
    setPublishedUrl(draft.published_url ?? '');
    setPublishedAt(draft.published_at ? draft.published_at.slice(0, 16) : '');
    setSavedAt(draft.updated_at);
    setRevisionCount(draft.revision_count);
    hydrating.current = true;
    editor?.commands.setContent(draft.content);
    hydrating.current = false;
    setDirty(false);
  }, [editor]);

  useEffect(() => {
    if (creating) return;
    void fetch(`/api/admin/blog-drafts/${draftId}`, { cache: 'no-store' }).then(async response => {
      const body = await response.json();
      if (!response.ok) { setNotice(body.error); return; }
      applyDraft(body.draft);
      setReady(true);
    });
  }, [creating, draftId, applyDraft]);

  const save = useCallback(async (nextStatus?: Status) => {
    if (!editor) return false;
    if (saving.current) { queued.current = true; return false; }
    saving.current = true;
    const currentBody = (override?: Status): BlogDraftWrite => {
      const fields = fieldsRef.current;
      return {
        title: fields.title,
        content: editor.getJSON() as BlogDraftWrite['content'],
        category: fields.category,
        tags: fields.tags,
        status: override ?? fields.status,
        featuredImage: fields.featuredImage,
        publishedUrl: fields.publishedUrl.trim() ? fields.publishedUrl.trim() : null,
        publishedAt: fields.publishedAt ? new Date(fields.publishedAt).toISOString() : null,
        revision: idRef.current ? revisionRef.current : undefined,
      };
    };
    const body = currentBody(nextStatus);
    const sent = JSON.stringify({ ...body, revision: undefined });
    try {
      const existing = idRef.current;
      const response = await fetch(existing ? `/api/admin/blog-drafts/${existing}` : '/api/admin/blog-drafts', {
        method: existing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (response.status === 409) {
        setNotice(result.error);
        if (existing) router.refresh();
        return false;
      }
      if (!response.ok) { setNotice(result.error || '저장하지 못했습니다.'); return false; }
      revisionRef.current = result.draft.revision;
      setRevision(result.draft.revision);
      setStatus(result.draft.status ?? body.status);
      setSavedAt(result.draft.updated_at);
      const latest = currentBody();
      const unchanged = JSON.stringify({ ...latest, revision: undefined, status: body.status }) === sent;
      setDirty(!unchanged);
      if (!unchanged) queued.current = true;
      const revisionSaved = result.revisionSaved !== false;
      setNotice(revisionSaved ? '' : '본문은 저장했지만 수정 이력을 기록하지 못했습니다. 다음 저장 때 다시 기록됩니다.');
      if (revisionSaved) setRevisionCount(count => count + (existing ? 1 : 0));
      if (!existing) {
        idRef.current = result.draft.id;
        setRevisionCount(revisionSaved ? 1 : 0);
        router.replace(`/admin/blog-drafts/${result.draft.id}`);
      }
      return true;
    } finally {
      saving.current = false;
      if (queued.current) { queued.current = false; void saveRef.current(); }
    }
  }, [editor, router]);
  useLayoutEffect(() => { saveRef.current = save; }, [save]);

  useEffect(() => {
    if (!dirty || !idRef.current) return;
    const timer = window.setTimeout(() => { void save(); }, 1800);
    return () => window.clearTimeout(timer);
  }, [dirty, title, category, tags, featuredImage, publishedUrl, publishedAt, editor?.state.doc, save]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const upload = async (file: File, featured = false) => {
    if (!idRef.current) { setNotice('이미지를 넣기 전에 한 번 저장해 주세요.'); return; }
    const form = new FormData();
    form.set('draftId', idRef.current);
    form.set('file', file);
    const response = await fetch('/api/admin/blog-drafts/media', { method: 'POST', body: form });
    const body = await response.json();
    if (!response.ok) { setNotice(body.error); return; }
    if (featured) { setFeaturedImage(body.media.id); setDirty(true); return; }
    editor?.chain().focus().setImage({ src: body.media.src, alt: file.name }).run();
  };

  const counts = (() => {
    const text = editor?.getText() ?? '';
    return { all: text.length, compact: text.replace(/\s/g, '').length };
  })();

  useEffect(() => {
    const saveShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (ready) void saveRef.current();
      }
      if (event.key === 'Escape') { setShowShortcuts(false); setShowSymbols(false); setPreview(''); }
    };
    window.addEventListener('keydown', saveShortcut);
    return () => window.removeEventListener('keydown', saveShortcut);
  }, [ready]);

  useEffect(() => {
    const element = titleRef.current;
    if (!element) return;
    let lastWidth = element.clientWidth;
    const resize = () => { element.style.height = 'auto'; element.style.height = `${element.scrollHeight}px`; };
    resize();
    const observer = new ResizeObserver(() => {
      if (element.clientWidth !== lastWidth) { lastWidth = element.clientWidth; resize(); }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [title, ready, editor]);

  // Copy the exact V3 preview DOM. CSS is inlined for portability; private
  // admin media URLs are not transferred as broken external <img> links.
  const copyEditorialPreview = async () => {
    const article = previewArticleRef.current?.querySelector('article');
    if (!article) { setCopyStatus('미리보기를 불러오지 못했습니다.'); return; }
    const clone = article.cloneNode(true) as HTMLElement;
    const originals = [article, ...Array.from(article.querySelectorAll<HTMLElement>('*'))];
    const copies = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))];
    const inlineProps = ['color', 'background-color', 'font-family', 'font-size', 'font-weight',
      'line-height', 'letter-spacing', 'text-align', 'margin', 'padding', 'border',
      'border-radius', 'display', 'width', 'max-width', 'box-sizing', 'word-break'];
    originals.forEach((source, index) => {
      const computed = window.getComputedStyle(source);
      const dest = copies[index];
      if (!dest) return;
      for (const prop of inlineProps) {
        const value = computed.getPropertyValue(prop);
        if (value) dest.style.setProperty(prop, value);
      }
    });
    let externalImages = 0;
    clone.querySelectorAll('img').forEach(image => {
      // Authenticated /api images are not valid external blog image URLs.
      const source = image.getAttribute('src') || '';
      if (source.startsWith('/api/admin/blog-drafts/media/')) {
        image.remove();
        externalImages += 1;
      }
    });
    const html = clone.outerHTML;
    try {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([article.innerText], { type: 'text/plain' }),
      })]);
      setCopyStatus(externalImages ? `V3 서식을 복사했습니다. 관리자 전용 사진 ${externalImages}장은 외부 편집기에 따로 업로드해야 합니다.` : 'V3 서식을 복사했습니다.');
    } catch {
      setCopyStatus('V3 서식 복사에 실패했습니다. 브라우저 클립보드 권한을 확인해 주세요.');
    }
  };

  const previewDraft = () => {
    if (editor) { setCopyStatus(''); setPreview('editorial-v3'); }
  };

  if (!ready || !editor) return <p role="status">원고를 불러오는 중…</p>;

  return (
    <section className={styles.editorWorkspace}>
      <div className={styles.editorTopbar}>
        <Link href="/admin/blog-drafts" onClick={event => { if (dirty && !window.confirm('저장하지 않은 변경이 있습니다. 목록으로 이동할까요?')) event.preventDefault(); }} className={styles.backLink}><ArrowLeft size={18} />원고 목록으로</Link>
        <p role="status" className={styles.saveStatus} data-dirty={dirty} data-saved={Boolean(savedAt)}>{dirty ? '저장되지 않은 변경' : savedAt ? <>원고 저장됨 <time dateTime={savedAt}>({new Date(savedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })})</time></> : '새 원고 · 첫 저장 전'}</p>
        <div className={styles.topActions}>
          <button type="button" className={styles.secondary} onClick={() => void save()}><Archive size={16} />원고 저장</button>
          <button type="button" className={styles.secondary} onClick={previewDraft}><Eye size={16} />미리보기</button>
          <button type="button" className={styles.primary} onClick={() => void save('published')}><Send size={16} />발행 완료로 표시</button>
        </div>
      </div>
      {notice && <p role="alert" className={styles.notice}>{notice}</p>}
      <div className={styles.paper}>
      <div className={styles.editorMetadata}>
      <div className={styles.categoryRow}><span>분류:</span>
        <div className={styles.categoryControl}><select aria-label="카테고리" value={category} onChange={event => { setCategory(event.target.value as BlogDraftWrite['category']); setDirty(true); }} className={styles.categorySelect}>
          {BLOG_DRAFT_CATEGORIES.map(item => <option key={item}>{item}</option>)}
        </select><ChevronDown size={14} aria-hidden="true" /></div>
        <span className={styles.documentStatus}>{blogDraftStatusLabel[status]}</span>
        <label className={styles.coverAction}><ImagePlus size={17} />대표 이미지 설정 (선택)<input type="file" aria-label="대표 이미지 업로드" accept="image/jpeg,image/png,image/webp,image/gif" className={styles.fileInput} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file, true); event.target.value = ''; }} /></label>
      </div>
      <textarea ref={titleRef} rows={1} aria-label="원고 제목" value={title} onChange={event => { setTitle(event.target.value); setDirty(true); }} placeholder="수업과 교육의 이야기에 제목을 붙여주세요" className={styles.titleInput} />
      <div className={styles.tagRow}>
        {tags.map(tag => <button type="button" key={tag} aria-label={`${tag} 태그 삭제`} className={styles.tag} onClick={() => { setTags(tags.filter(item => item !== tag)); setDirty(true); }}>#{tag}<X size={12} /></button>)}
        <input value={tagInput} onChange={event => setTagInput(event.target.value)} onKeyDown={event => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          const next = tagInput.trim();
          if (!next || tags.includes(next) || tags.length >= 12) return;
          setTags([...tags, next]); setTagInput(''); setDirty(true);
        }} placeholder="# 태그 입력 후 Enter (최대 12개)" className={styles.tagInput} aria-label="태그 입력" />
      </div>
      </div>
      <div className={styles.toolbar}>
        <div className={styles.toolScroll} role="toolbar" aria-label="본문 서식" hidden={mode !== 'edit'}>
          <Tool label="큰 제목" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })}>H1</Tool>
          <Tool label="제목" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>H2</Tool>
          <Tool label="소제목" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}>H3</Tool>
          <span className={styles.toolDivider} />
          <Tool label="굵게" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}><Bold size={18} /></Tool>
          <Tool label="기울임" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><Italic size={18} /></Tool>
          <Tool label="취소선" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')}><Strikethrough size={18} /></Tool>
          <span className={styles.toolDivider} />
          <Tool label="인용문" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}><Quote size={18} /></Tool>
          <Tool label="코드 / 텍스트 자료" onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')}><Code2 size={18} /></Tool>
          <Tool label="구분선" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={18} /></Tool>
          <span className={styles.toolDivider} />
          <Tool label="글머리 목록" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}><List size={18} /></Tool>
          <Tool label="번호 목록" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}><ListOrdered size={18} /></Tool>
          <Tool label="체크리스트" onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')}><ListChecks size={18} /></Tool>
          <span className={styles.toolDivider} />
          <Tool label="링크 삽입" onClick={() => { const href = window.prompt('링크 주소', 'https://'); if (href) editor.chain().focus().extendMarkRange('link').setLink({ href }).run(); }} active={editor.isActive('link')}><Link2 size={18} /></Tool>
          <label className={styles.imageTool} title="본문 이미지 업로드"><ImageIcon size={18} /><input type="file" aria-label="본문 이미지 업로드" accept="image/jpeg,image/png,image/webp,image/gif" className={styles.fileInput} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ''; }} /></label>
          <Tool label="수업 기호 넣기" onClick={() => setShowSymbols(value => !value)} active={showSymbols}><Sigma size={18} /></Tool>
        </div>
        {mode === 'markdown' && <span className={styles.sourceLabel}>마크다운 · 읽기 전용</span>}
        <div className={styles.modeSwitch} role="group" aria-label="원고 보기 방식"><button type="button" aria-pressed={mode === 'edit'} onClick={() => setMode('edit')}>편집</button><button type="button" aria-pressed={mode === 'markdown'} onClick={() => setMode('markdown')}>마크다운</button></div>
      </div>
      {showSymbols && mode === 'edit' && <div className={styles.symbolPicker} role="group" aria-label="수업 기호"><span>수업 기호</span>{['→', '←', '↑', '↓', '↔', '×', '÷', '±', '≥', '≤', '○', '△', '□', '°', '∑'].map(symbol => <button key={symbol} type="button" aria-label={`${symbol} 삽입`} onClick={() => { editor.chain().focus().insertContent({ type: 'text', text: symbol }).run(); setShowSymbols(false); }}>{symbol}</button>)}<button type="button" aria-label="기호 닫기" onClick={() => setShowSymbols(false)}><X size={16} /></button></div>}
      <div hidden={mode !== 'edit'}><EditorContent editor={editor} /></div>
      {mode === 'markdown' && <div className={styles.markdownPanel}><p>본문을 마크다운으로 확인하고 복사할 수 있습니다. 수정은 편집 화면에서 이어가세요.</p><button type="button" className={styles.secondary} onClick={() => void navigator.clipboard.writeText(draftMarkdown(editor.getJSON())).catch(() => setNotice('마크다운을 복사하지 못했습니다.'))}><Copy size={14} />마크다운 복사</button><pre tabIndex={0} aria-label="원고 마크다운">{draftMarkdown(editor.getJSON())}</pre></div>}
      </div>
      <div className={styles.editorStats}>
        <div className={styles.countGroup}><span><TextCursorInput size={15} />글자 수: <strong>{counts.all.toLocaleString('ko-KR')}</strong>자</span><i>·</i><span>공백 제외: <strong>{counts.compact.toLocaleString('ko-KR')}</strong>자</span><i>·</i><span><Clock3 size={15} />예상 읽기: <strong>{counts.compact ? Math.max(1, Math.ceil(counts.compact / 500)) : 0}분</strong></span></div>
        <div className={styles.statsActions}><button type="button" onClick={() => setShowShortcuts(true)}><Keyboard size={16} />단축키 안내</button><span className={styles.statsRule} /><button type="button" onClick={() => void save()} aria-label="원고 저장"><kbd>Ctrl</kbd> + <kbd>S</kbd><span>저장</span></button></div>
      </div>
      <div className={styles.settings}>
      <div className={styles.settingsHeader}><h2>원고 관리</h2><span>수정 이력 {revisionCount || (!creating ? 1 : 0)}회 · 버전 {revision}</span></div>
      {featuredImage && <figure className={styles.featuredImage}><img src={`/api/admin/blog-drafts/media/${featuredImage}`} alt="대표 이미지" /><figcaption>블로그 대표 이미지</figcaption></figure>}
      <div className={styles.publishFields}>
        <label className="text-sm">게시 URL<input value={publishedUrl} onChange={event => { setPublishedUrl(event.target.value); setDirty(true); }} placeholder="https://" className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm">발행일<input type="datetime-local" value={publishedAt} onChange={event => { setPublishedAt(event.target.value); setDirty(true); }} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
      </div>
      <div className={styles.workflowActions}>

        <button type="button" className="rounded-full border px-4 py-2 text-sm" onClick={() => void save('review')}>검토 중</button>
        <button type="button" className="rounded-full border px-4 py-2 text-sm" onClick={() => void save('complete')}>작성 완료</button>

        <button type="button" className="rounded-full border px-4 py-2 text-sm" onClick={previewDraft}>V3 서식 확인·복사</button>
        <button type="button" className="rounded-full border px-4 py-2 text-sm" onClick={() => void copyDraft(editor.getHTML(), editor.getText(), false)}>텍스트 복사</button>
        {!creating && <button type="button" className={styles.deleteAction} onClick={() => void removeDraft(idRef.current, router)}>삭제</button>}
      </div>
      </div>
      <footer className={styles.editorFooter}><span>SPOKEDU · 교육 콘텐츠</span><span>수업의 경험을 다음 교육의 이야기로.</span></footer>
      {showShortcuts && <DraftModal label="원고 작성 단축키" className={styles.shortcutDialog} onClose={() => setShowShortcuts(false)}><div><h2>원고 작성 단축키</h2><button type="button" autoFocus aria-label="단축키 안내 닫기" onClick={() => setShowShortcuts(false)}><X size={20} /></button></div><p>Mac에서는 Ctrl 대신 ⌘ 키를 사용하세요.</p><dl>{[['원고 저장', 'Ctrl + S'], ['굵게', 'Ctrl + B'], ['기울임', 'Ctrl + I'], ['실행 취소', 'Ctrl + Z'], ['다시 실행', 'Ctrl + Shift + Z'], ['큰 제목 / 제목 / 소제목', 'Ctrl + Alt + 1 / 2 / 3']].map(([label, keys]) => <div key={label}><dt>{label}</dt><dd><kbd>{keys}</kbd></dd></div>)}</dl><p>입력 시작에 #, ##, &gt;, -를 쓰고 스페이스를 누르면 제목·인용문·목록으로 바뀝니다.</p></DraftModal>}
      {preview && (
        <DraftModal label="원고 미리보기" className={styles.previewDialog} onClose={() => setPreview('')}>
            <div className="mb-4 flex justify-between"><h2 className="text-lg font-bold">원고 미리보기</h2><button type="button" autoFocus onClick={() => setPreview('')}>닫기</button></div>
            <div className={styles.v3PreviewActions}>
              <p role="status" aria-live="polite">{copyStatus || '블로그 미리보기 · 외부 편집기에 따라 서식이 달라질 수 있습니다.'}</p>
              <button type="button" onClick={() => void copyEditorialPreview()}>V3 서식 복사</button>
            </div>
            <div ref={previewArticleRef}>
              <SpokeduBlogArticle
                draft={{ title: title || '제목 없는 원고', category,
                  content: editor.getJSON() as EditorNode,
                  published_at: publishedAt ? new Date(publishedAt).toISOString() : null }}
                hero={featuredImage ? { src: `/api/admin/blog-drafts/media/${featuredImage}`, alt: title || '수업 대표사진' } : null}
              />
            </div>
        </DraftModal>
      )}

    </section>
  );
}

function Tool({ children, label, onClick, active = false }: { children: ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return <button type="button" onMouseDown={event => event.preventDefault()} onClick={onClick} title={label} aria-label={label} aria-pressed={active} className={styles.tool}>{children}</button>;
}

async function copyDraft(html: string, text: string, rich: boolean) {
  if (!rich) { await navigator.clipboard.writeText(text); return; }
  await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]);
}

async function removeDraft(id: string, router: ReturnType<typeof useRouter>) {
  if (!id || !window.confirm('이 원고와 수정 이력을 삭제할까요?')) return;
  const response = await fetch(`/api/admin/blog-drafts/${id}`, { method: 'DELETE' });
  const body = await response.json();
  if (!response.ok) { window.alert(body.error || '삭제하지 못했습니다.'); return; }
  router.push('/admin/blog-drafts');
}
