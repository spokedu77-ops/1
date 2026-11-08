'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FIELD_RECORD_CATEGORIES, FIELD_RECORD_SECTIONS, recordContentSchema, recordMediaSrc, slugSchema, validatePublication, type RecordBlock, type RecordContent, type RecordMedia, type RecordRow } from '@/app/lib/field-records/contract';
import { emptyRecordContent } from '@/app/lib/field-records/empty';

const BlockEditor = dynamic(() => import('./RecordBlockEditor'), { ssr: false, loading: () => <p className="p-4 text-sm text-slate-500">편집기 준비 중…</p> });
const control = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900';
const button = 'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50';
const statusLabel = { draft: '초안', review: '검토 중', published: '게시' };

function MediaFields({ media, onChange }: { media: RecordMedia; onChange: (value: RecordMedia) => void }) {
  return <><label className="block text-sm">대체 텍스트<input className={control} value={media.alt} onChange={event => onChange({ ...media, alt: event.target.value })} /></label><label className="block text-sm">사진 설명<input className={control} value={media.caption} onChange={event => onChange({ ...media, caption: event.target.value })} /></label><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={media.publicConfirmed} onChange={event => onChange({ ...media, publicConfirmed: event.target.checked })} />해당 기관의 사진이며 외부 게시 동의를 확인했습니다.</label></>;
}

export default function FieldRecordEditor({ id }: { id: string }) {
  const router = useRouter(); const [row, setRow] = useState<RecordRow | null>(null);
  const [content, setContent] = useState<RecordContent>(emptyRecordContent); const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(id !== 'new'); const [busy, setBusy] = useState(false); const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [sectionId, setSectionId] = useState('introduction');
  const [slot, setSlot] = useState<number | null>(null); const [publishedAt, setPublishedAt] = useState('');
  const [uploads, setUploads] = useState<{ id: string }[]>([]);
  const recordId = row?.id;
  useEffect(() => {
    if (!recordId) return;
    let cancelled = false;
    void fetch(`/api/admin/field-records/media?recordId=${recordId}`, { cache: 'no-store' }).then(async response => {
      const body = await response.json(); if (!response.ok) throw new Error(body.error || '사진 목록 조회 실패');
      if (!cancelled) setUploads(body.media);
    }).catch(error => { if (!cancelled) setError(error instanceof Error ? error.message : '사진 목록 조회 실패'); });
    return () => { cancelled = true; };
  }, [recordId]);
  const load = useCallback(async () => {
    if (id === 'new') return;
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/admin/field-records/${id}`, { cache: 'no-store' }); const body = await response.json();
      if (!response.ok) throw new Error(body.error || '불러오기에 실패했습니다.');
      const parsed = recordContentSchema.parse(body.record.draft_content);
      setRow(body.record); setContent(parsed); setSlug(body.record.slug); setSlot(parsed.requestedFeaturedSlot); setPublishedAt(parsed.publicationDate ?? body.record.published_at ?? ''); setDirty(false);
    } catch (error) { setError(error instanceof Error ? error.message : '불러오기에 실패했습니다.'); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function patch(value: Partial<RecordContent>) { setContent(previous => ({ ...previous, ...value })); setDirty(true); setMessage(''); }
  function patchSection(section: string, value: Partial<RecordContent['sections'][number]>) { patch({ sections: content.sections.map(item => item.id === section ? { ...item, ...value } : item) }); }
  async function requestMutation(action: 'save' | 'review' | 'publish' | 'unpublish' | 'feature', base: RecordRow) {
    const response = await fetch(`/api/admin/field-records/${base.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, revision: base.revision, slug, content: action === 'save' || action === 'review' ? content : undefined, featuredSlot: slot, publishedAt: publishedAt || null }) });
    const body = await response.json(); if (!response.ok) throw new Error([body.error, ...(body.issues ?? [])].filter(Boolean).join('\n'));
    setRow(body.record); return body.record as RecordRow;
  }
  async function saveDraft(action: 'save' | 'review' = 'save'): Promise<RecordRow> {
    slugSchema.parse(slug); recordContentSchema.parse(content);
    if (row) {
      const saved = await requestMutation(action, row); setDirty(false); return saved;
    }
    const response = await fetch('/api/admin/field-records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, content }) });
    const body = await response.json(); if (!response.ok) throw new Error(body.error || '초안 저장에 실패했습니다.');
    setRow(body.record); setDirty(false); router.replace(`/admin/field-records/${body.record.id}`); return body.record;
  }
  async function act(action: 'save' | 'review' | 'preview' | 'publish' | 'unpublish' | 'feature') {
    if (busy) return;
    if (action === 'publish') {
      const errors = validatePublication(content); if (errors.length) { setError(errors.join('\n')); return; }
      if (!window.confirm('사진 공개 동의와 원고를 확인했으며, 현재 초안을 공개 사이트에 게시할까요?')) return;
    }
    if (action === 'unpublish' && !window.confirm('공개 사이트와 사이트맵에서 이 기록을 내릴까요? 새 업로드 사진의 공개 접근도 차단됩니다.')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (action === 'unpublish' || action === 'feature') {
        if (!row) throw new Error('먼저 저장해 주세요.'); await requestMutation(action, row);
      } else {
        const saved = await saveDraft(action === 'review' ? 'review' : 'save');
        if (action === 'publish') await requestMutation('publish', saved);
        if (action === 'preview') { router.push(`/admin/field-records/${saved.id}/preview`); return; }
      }
      setMessage(action === 'publish' ? '게시했습니다.' : action === 'unpublish' ? '게시를 취소했습니다.' : action === 'feature' ? '대표 사례 순서를 저장했습니다.' : '초안을 저장했습니다.');
    } catch (error) { setError(error instanceof Error ? error.message : '저장에 실패했습니다.'); }
    finally { setBusy(false); }
  }
  async function upload(files: FileList | null) {
    if (!files?.length || busy) return;
    if (!row) { setError('먼저 URL 슬러그를 입력하고 초안을 저장한 뒤 사진을 추가해 주세요.'); return; }
    setBusy(true); setError('');
    try {
      const media: RecordMedia[] = [];
      for (const file of Array.from(files)) {
        const form = new FormData(); form.set('recordId', row.id); form.set('file', file);
        const response = await fetch('/api/admin/field-records/media', { method: 'POST', body: form }); const body = await response.json();
        if (!response.ok) throw new Error(body.error || '업로드 실패');
        media.push(body.media);
        setUploads(previous => [...previous, { id: body.media.id }]);
        // Keep already uploaded files in the form even if a later upload fails.
        setContent(previous => ({ ...previous, gallery: [...previous.gallery, body.media] })); setDirty(true);
      }
      setMessage(`${media.length}장 업로드했습니다. 대체 텍스트와 공개 동의를 확인한 뒤 저장해 주세요.`);
    } catch (error) { setError(error instanceof Error ? error.message : '업로드에 실패했습니다.'); }
    finally { setBusy(false); }
  }
  async function removeFile(media: RecordMedia) {
    if (!media.id || busy || !window.confirm('사용하지 않는 이 사진 파일을 영구 삭제할까요? 먼저 카드·본문 연결을 해제하고 저장해야 합니다.')) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/field-records/media/${media.id}`, { method: 'DELETE' }); const body = await response.json();
      if (!response.ok) throw new Error(body.error || '사진 삭제 실패'); setUploads(previous => previous.filter(item => item.id !== media.id)); setMessage('사진 파일을 삭제했습니다.');
    } catch (error) { setError(error instanceof Error ? error.message : '사진 삭제 실패'); }
    finally { setBusy(false); }
  }
  function moveGallery(index: number, direction: number) {
    const gallery = [...content.gallery]; const target = index + direction;
    if (target < 0 || target >= gallery.length) return;
    [gallery[index], gallery[target]] = [gallery[target], gallery[index]]; patch({ gallery });
  }

  if (loading) return <p role="status" className="p-8">현장 기록 불러오는 중…</p>;
  if (id !== 'new' && !row) return <div className="p-8"><p role="alert">{error}</p><button className={button} onClick={() => void load()}>다시 불러오기</button></div>;
  const selectedSection = content.sections.find(section => section.id === sectionId)!;
  return <div className="mx-auto max-w-6xl p-4 sm:p-8">
    <div className="sticky top-0 z-20 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white/95 p-4 shadow-sm backdrop-blur"><div><Link href="/admin/field-records" onClick={event => { if (dirty && !window.confirm('저장하지 않은 변경사항을 버리고 목록으로 갈까요?')) event.preventDefault(); }} className="text-sm text-blue-700">← 현장 기록 관리</Link><p className="mt-1 text-sm text-slate-500">{row ? statusLabel[row.status] : '새 초안'} · {dirty ? '저장하지 않은 변경사항 있음' : '저장됨'}</p></div><div className="flex flex-wrap gap-2"><button disabled={busy} className={button} onClick={() => void act('save')}>초안 저장</button><button disabled={busy} className={button} onClick={() => void act('review')}>검토 요청</button><button disabled={busy} className={button} onClick={() => void act('preview')}>미리보기</button><button disabled={busy} className={`${button} !border-blue-600 !bg-blue-600 text-white`} onClick={() => void act('publish')}>승인 후 게시</button></div></div>
    {error && <div role="alert" className="mb-4 whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    {message && <p role="status" className="mb-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">{message}</p>}
    <div inert={busy} className={busy ? 'pointer-events-none opacity-60' : ''}>
      <section className="mb-6 rounded-2xl border bg-white p-5 sm:p-7"><h1 className="mb-5 text-xl font-bold">기본 정보</h1><div className="grid gap-4 sm:grid-cols-2">
        {([['title', '콘텐츠 제목'], ['venue', '기관명 또는 프로그램명'], ['subtitle', '운영 정보 부제'], ['operationType', '배지 앞 문구'], ['programLabel', '배지 뒤 문구'], ['audience', '교육 대상'], ['operator', '운영 기관 및 형태'], ['period', '운영 기간 (선택)']] as const).map(([key, label]) => <label key={key} className="text-sm">{label}<input className={control} value={content[key]} onChange={event => patch({ [key]: event.target.value })} /></label>)}
        <label className="text-sm sm:col-span-2">카드 요약<textarea className={control} rows={3} value={content.summary} onChange={event => patch({ summary: event.target.value })} /></label>
        <label className="text-sm sm:col-span-2">교육 키워드 (쉼표로 구분)<input className={control} defaultValue={content.keywords.join(', ')} onBlur={event => patch({ keywords: event.target.value.split(',').map(item => item.trim()).filter(Boolean) })} /></label>
        <fieldset className="sm:col-span-2"><legend className="mb-2 text-sm font-semibold">교육 유형 (복수 선택)</legend><div className="flex flex-wrap gap-4">{FIELD_RECORD_CATEGORIES.map(category => <label key={category.id} className="flex gap-2 text-sm"><input type="checkbox" checked={content.categories.includes(category.id)} onChange={event => patch({ categories: event.target.checked ? [...content.categories, category.id] : content.categories.filter(item => item !== category.id) })} />{category.label}</label>)}</div></fieldset>
      </div></section>
      <section className="mb-6 rounded-2xl border bg-white p-5 sm:p-7"><h2 className="text-xl font-bold">상세 본문</h2><p className="mt-2 text-sm text-slate-500">/ 메뉴로 소제목과 목록을 추가하고, 텍스트를 선택해 굵게 표시할 수 있습니다. 관찰 근거가 없는 영역은 공개하지 마세요.</p><div className="my-5 flex flex-wrap gap-2" role="tablist" aria-label="본문 영역">{FIELD_RECORD_SECTIONS.map(section => <button type="button" role="tab" aria-selected={sectionId === section.id} key={section.id} onClick={() => setSectionId(section.id)} className={`${button} ${sectionId === section.id ? '!border-blue-400 !bg-blue-50 text-blue-800' : ''}`}>{section.label}</button>)}</div><div role="tabpanel"><label className="mb-4 block text-sm">영역 제목<input className={control} value={selectedSection.title} onChange={event => patchSection(sectionId, { title: event.target.value })} /></label><label className="mb-5 flex gap-2 text-sm"><input type="checkbox" checked={selectedSection.visible} onChange={event => patchSection(sectionId, { visible: event.target.checked })} />이 영역 공개</label><div className="min-h-64 rounded-xl border border-slate-200 py-4"><BlockEditor key={`${row?.id ?? 'new'}-${sectionId}`} initial={selectedSection.blocks} onChange={(blocks: RecordBlock[]) => patchSection(sectionId, { blocks })} /></div></div></section>
      <section className="mb-6 rounded-2xl border bg-white p-5 sm:p-7"><h2 className="text-xl font-bold">사진</h2><p className="my-3 text-sm text-slate-500">JPG·PNG·WebP, 장당 10MB 이하. 새 사진은 비공개 저장소에 저장됩니다. 원본 비율을 유지하고 위치정보를 제거합니다.</p><input type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="사진 여러 장 업로드" onChange={event => { void upload(event.target.files); event.target.value = ''; }} /><h3 className="mb-3 mt-6 font-bold">대표 이미지</h3>{content.hero ? <div className="grid gap-4 rounded-xl border p-4 sm:grid-cols-[180px_1fr]"><img src={recordMediaSrc(content.hero, true)} alt={content.hero.alt} className="h-auto w-full rounded-lg" /><div className="space-y-3"><MediaFields media={content.hero} onChange={hero => patch({ hero })} /><button type="button" className={button} onClick={() => patch({ hero: null })}>대표 연결 해제</button></div></div> : <p className="text-sm text-slate-500">아래 갤러리에서 대표 사진을 선택해 주세요.</p>}
        <h3 className="mb-3 mt-6 font-bold">갤러리 · 표시 순서</h3><div className="grid gap-4">{content.gallery.map((media, index) => <div key={media.id ?? media.localKey ?? index} className="grid gap-4 rounded-xl border p-4 sm:grid-cols-[180px_1fr]"><img src={recordMediaSrc(media, true)} alt={media.alt} className="h-auto w-full rounded-lg" /><div className="space-y-3"><MediaFields media={media} onChange={value => patch({ gallery: content.gallery.map((item, itemIndex) => itemIndex === index ? value : item) })} /><div className="flex flex-wrap gap-2"><button className={button} type="button" disabled={index === 0} onClick={() => moveGallery(index, -1)}>위로</button><button className={button} type="button" disabled={index === content.gallery.length - 1} onClick={() => moveGallery(index, 1)}>아래로</button><button className={button} type="button" onClick={() => patch({ hero: media })}>대표로 지정</button><button className={button} type="button" onClick={() => patch({ gallery: content.gallery.filter((_, itemIndex) => itemIndex !== index) })}>연결 해제</button>{media.id && <button className={button} type="button" onClick={() => void removeFile(media)}>파일 삭제</button>}</div></div></div>)}</div>
        <label className="mt-5 flex items-start gap-2 text-sm font-semibold"><input type="checkbox" checked={content.imagePublicConfirmed} onChange={event => patch({ imagePublicConfirmed: event.target.checked })} />게시할 모든 사진의 기관 일치·아동 외부 게시 동의·개인정보 노출 여부를 확인했습니다.</label>
        {uploads.length > 0 && <details className="mt-5 rounded-xl border p-4"><summary className="cursor-pointer text-sm font-semibold">업로드한 파일 관리 · 연결 해제한 사진 재사용 / 삭제</summary><p className="my-3 text-xs text-slate-500">파일 삭제 전 사진 연결을 해제하고 초안을 저장해 주세요. 공개본에서 사용 중이면 게시 취소도 필요합니다.</p><div className="grid gap-3 sm:grid-cols-3">{uploads.map(file => <div key={file.id} className="rounded-lg border p-3"><img src={`/api/admin/field-records/media/${file.id}`} alt="업로드한 사진 미리보기" className="mb-3 h-28 w-full rounded object-contain" /><div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={content.gallery.some(item => item.id === file.id)} onClick={() => patch({ gallery: [...content.gallery, { id: file.id, alt: '', caption: '', publicConfirmed: false }] })}>갤러리에 추가</button><button type="button" className={button} onClick={() => void removeFile({ id: file.id, alt: '', caption: '', publicConfirmed: false })}>파일 삭제</button></div></div>)}</div></details>}
      </section>
      <section className="mb-6 rounded-2xl border bg-white p-5 sm:p-7"><h2 className="mb-5 text-xl font-bold">게시 설정 · SEO · 교육 안내</h2><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">URL 슬러그 (게시 후 변경 불가)<input className={control} value={slug} onChange={event => { setSlug(event.target.value); setDirty(true); }} /></label><label className="text-sm">게시 날짜 (비워두면 게시 시각)<input type="datetime-local" className={control} value={publishedAt ? new Date(new Date(publishedAt).getTime() - new Date(publishedAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} onChange={event => { const value = event.target.value ? new Date(event.target.value).toISOString() : ''; setPublishedAt(value); patch({ publicationDate: value || null }); }} /></label>
        {([['seoTitle', 'SEO 제목'], ['seoDescription', 'SEO 설명'], ['relatedProgram', '관련 프로그램 경로'], ['ctaTitle', '하단 교육 안내 문구'], ['programCtaLabel', '프로그램 버튼 문구'], ['contactCtaLabel', '상담 버튼 문구'], ['contactHref', '상담 이동 경로']] as const).map(([key, label]) => <label className="text-sm" key={key}>{label}<input className={control} value={content[key]} onChange={event => patch({ [key]: event.target.value })} /></label>)}
        <label className="text-sm">홈 대표 사례 자리<select className={control} value={slot ?? ''} onChange={event => { const value = event.target.value ? Number(event.target.value) : null; setSlot(value); patch({ requestedFeaturedSlot: value }); }}><option value="">대표로 지정하지 않음</option><option value="1">첫 번째</option><option value="2">두 번째</option><option value="3">세 번째</option></select></label>
        <label className="text-sm sm:col-span-2">내부 검토 메모 (공개하지 않음)<textarea className={control} rows={5} value={content.editorialNotes} onChange={event => patch({ editorialNotes: event.target.value })} /></label>
      </div><div className="mt-5 flex flex-wrap gap-2"><button disabled={!row?.published_content} type="button" className={button} onClick={() => void act('feature')}>대표 자리만 저장</button><button disabled={!row?.published_content} type="button" className={`${button} text-red-700`} onClick={() => void act('unpublish')}>게시 취소</button></div></section>
    </div>
  </div>;
}
