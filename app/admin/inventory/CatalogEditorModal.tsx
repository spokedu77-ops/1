'use client';

import { Image as ImageIcon, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';

export type CatalogFormState = {
  name: string;
  category: string;
  image: string;
  simple_desc: string;
  key_points: string;
  usage_examples: string;
  mgmt_code?: string;
};

const emptyForm: CatalogFormState = {
  name: '',
  category: '',
  image: '',
  simple_desc: '',
  key_points: '',
  usage_examples: '',
  mgmt_code: '',
};

export function CatalogEditorModal({
  editingId,
  initial,
  onClose,
  onSaved,
  supportsManagementCode = true,
}: {
  editingId: number | null;
  initial: CatalogFormState | null;
  onClose: () => void;
  onSaved: () => void;
  supportsManagementCode?: boolean;
}) {
  const [form, setForm] = useState<CatalogFormState>(initial ?? emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      toast.error('JPG, PNG, WEBP, GIF 10MB 이하만 가능합니다.');
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.set('file', file);
      const res = await fetch('/api/admin/inventory/images', { method: 'POST', body });
      const json = (await res.json()) as { publicUrl?: string; error?: string };
      if (!res.ok || !json.publicUrl) throw new Error(json.error ?? '업로드 실패');
      setForm((f) => ({ ...f, image: json.publicUrl! }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '이미지 업로드 실패');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('교구명을 입력하세요.');
      return;
    }
    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const payload = {
        name: form.name.trim(),
        category: form.category.trim() || null,
        image: form.image || null,
        simple_desc: form.simple_desc || null,
        key_points: form.key_points || null,
        usage_examples: form.usage_examples || null,
        ...(supportsManagementCode ? { mgmt_code: form.mgmt_code?.trim() || null } : {}),
      };
      if (editingId) {
        const { error } = await supabase.from('catalog').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('교구 정보가 수정되었습니다.');
      } else {
        const { error } = await supabase.from('catalog').insert([payload]);
        if (error) throw error;
        toast.success('새 교구가 등록되었습니다.');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-xl rounded-3xl p-8 shadow-2xl max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black">{editingId ? '교구 정보 수정' : '새 교구 등록'}</h3>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">교구명</label>
              <input className="w-full p-3 bg-slate-50 rounded-xl font-bold" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">카테고리</label>
              <input className="w-full p-3 bg-slate-50 rounded-xl font-bold" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
          </div>
          {supportsManagementCode && <div>
            <label className="text-[10px] font-black text-slate-400 uppercase">관리번호 (선택)</label>
            <input className="w-full p-3 bg-slate-50 rounded-xl font-bold" value={form.mgmt_code ?? ''} onChange={(e) => setForm({ ...form, mgmt_code: e.target.value })} />
          </div>}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase">이미지</label>
            <div className="flex gap-4 items-center mt-1">
              <label className="flex-1 flex flex-col items-center p-6 bg-slate-50 border-2 border-dashed rounded-2xl cursor-pointer">
                <ImageIcon className="text-slate-300 mb-2" />
                <span className="text-xs font-bold text-slate-400">파일 선택</span>
                <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => void handleImageUpload(e)} />
              </label>
              <div className="w-24 h-24 rounded-2xl bg-slate-50 overflow-hidden border">
                {form.image ? <img src={form.image} alt="" className="w-full h-full object-cover" /> : null}
              </div>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase">한 줄 설명</label>
            <input className="w-full p-3 bg-slate-50 rounded-xl text-sm" value={form.simple_desc} onChange={(e) => setForm({ ...form, simple_desc: e.target.value })} />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase">핵심 포인트</label>
            <textarea className="w-full p-3 bg-slate-50 rounded-xl text-sm h-20" value={form.key_points} onChange={(e) => setForm({ ...form, key_points: e.target.value })} />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase">활용 방법</label>
            <textarea className="w-full p-3 bg-slate-50 rounded-xl text-sm h-28" value={form.usage_examples} onChange={(e) => setForm({ ...form, usage_examples: e.target.value })} />
          </div>
          <button type="button" disabled={uploading || saving} onClick={() => void save()} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black disabled:opacity-50">
            {uploading ? '이미지 업로드 중…' : saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
