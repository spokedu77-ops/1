'use client';

import { ArrowLeft, Check, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { StudentFieldSelect } from '../../components/ui/StudentFieldSelect';
import { SPM_PRIMARY_BTN_FULL } from '../../lib/masterActionGrammar';
import { studentMetaToDisplay } from '../../lib/operationalDataAdapter';
import { buildStudentAgeOptions } from '../../lib/studentAddPresets';
import { useOperationalData } from '../../operational/OperationalDataProvider';
import { parseRosterPaste, resolveClassRosterCandidates } from '../classManagementModel';

type Mode = 'search' | 'new' | 'bulk';
type BulkChoice = `existing:${string}` | 'new';

export function ClassRosterSheet({ classId, className, onClose }: { classId: string; className: string; onClose: () => void }) {
  const data = useOperationalData();
  const classItem = data.classes.find((item) => item.id === classId);
  const [mode, setMode] = useState<Mode>('search');
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [meta, setMeta] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [bulkNames, setBulkNames] = useState<string[] | null>(null);
  const [bulkChoices, setBulkChoices] = useState<Record<string, BulkChoice>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ageOptions = buildStudentAgeOptions(data.students.map((student) => studentMetaToDisplay(student.meta)));
  const results = useMemo(
    () => resolveClassRosterCandidates(data.students, classItem?.studentIds ?? [], query).slice(0, 20),
    [classItem?.studentIds, data.students, query],
  );
  const classNamesFor = (studentId: string) => data.classes
    .filter((item) => item.id !== classId && item.studentIds.includes(studentId))
    .map((item) => item.name)
    .slice(0, 1);

  const resetFeedback = () => { setError(null); setMessage(null); };
  const openNew = (prefill = '') => { resetFeedback(); setName(prefill); setMeta(''); setMode('new'); };
  const openBulk = () => { resetFeedback(); setBulkText(''); setBulkNames(null); setBulkChoices({}); setMode('bulk'); };

  const addSelected = async () => {
    if (!selectedIds.length || saving) return;
    setSaving(true); resetFeedback();
    const failed: string[] = [];
    let completed = 0;
    for (const studentId of selectedIds) {
      try { await data.addClassStudent(classId, studentId); completed += 1; }
      catch { failed.push(studentId); }
    }
    setSelectedIds(failed);
    if (failed.length) setError(`${selectedIds.length}명 중 ${completed}명 추가 완료 · ${failed.length}명 실패`);
    else setMessage(`${completed}명을 명단에 추가했습니다.`);
    setSaving(false);
  };

  const createOne = async () => {
    if (!name.trim() || saving) return;
    setSaving(true); resetFeedback();
    try {
      await data.createStudent({ legacyId: crypto.randomUUID(), name: name.trim(), meta, guidanceNote: null, classIds: [classId] });
      setMessage(`${name.trim()} 학생을 등록하고 명단에 추가했습니다.`);
      setQuery(''); setName(''); setMeta(''); setMode('search');
    } catch { setError('학생을 등록하지 못했습니다. 입력 내용을 유지했습니다.'); }
    finally { setSaving(false); }
  };

  const previewBulk = () => {
    const parsed = parseRosterPaste(bulkText);
    setError(parsed.length ? null : '등록할 학생 이름을 한 줄에 한 명씩 입력해 주세요.');
    setBulkNames(parsed.length ? parsed : null);
    setBulkChoices({});
  };

  const submitBulk = async () => {
    if (!bulkNames?.length || saving) return;
    const unresolved = bulkNames.filter((bulkName) => {
      const matches = data.students.filter((student) => student.name.trim() === bulkName);
      return matches.length > 0 && !bulkChoices[bulkName];
    });
    if (unresolved.length) { setError('기존 학생과 이름이 같은 항목의 등록 방법을 선택해 주세요.'); return; }
    setSaving(true); resetFeedback();
    const failed: string[] = [];
    let completed = 0;
    for (const bulkName of bulkNames) {
      try {
        const choice = bulkChoices[bulkName];
        if (choice?.startsWith('existing:')) await data.addClassStudent(classId, choice.slice('existing:'.length));
        else await data.createStudent({ legacyId: crypto.randomUUID(), name: bulkName, meta: '', guidanceNote: null, classIds: [classId] });
        completed += 1;
      } catch { failed.push(bulkName); }
    }
    if (failed.length) {
      setBulkNames(failed); setBulkText(failed.join('\n')); setBulkChoices({});
      setError(`${bulkNames.length}명 중 ${completed}명 등록 완료 · ${failed.length}명 실패`);
    } else {
      setBulkNames(null); setBulkText(''); setMode('search');
      setMessage(`${completed}명을 등록하고 명단에 추가했습니다.`);
    }
    setSaving(false);
  };

  return <BottomSheet open title={`학생 추가 · ${className}`} onClose={onClose}>
    <div className="space-y-4 pb-3">
      {mode === 'search' ? <>
        <label className="block text-xs font-black text-slate-600">기존 학생 검색
          <span className="relative mt-2 block"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); resetFeedback(); }} placeholder="이름 검색" className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm font-bold outline-none focus:border-emerald-500" /></span>
        </label>
        {!query.trim() ? <p className="rounded-xl bg-slate-50 p-4 text-xs font-semibold leading-5 text-slate-500">검색하면 현재 수업반에 없는 학생만 표시됩니다. 전체 학생 목록을 미리 펼치지 않습니다.</p> : null}
        {query.trim() ? <div className="max-h-72 space-y-2 overflow-y-auto">
          {results.map((student) => { const checked = selectedIds.includes(student.id); const otherClass = classNamesFor(student.id)[0]; return <label key={student.id} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-3 ${checked ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
            <input type="checkbox" checked={checked} onChange={() => setSelectedIds((current) => checked ? current.filter((id) => id !== student.id) : [...current, student.id])} className="h-5 w-5 accent-emerald-600" />
            <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-800">{student.name}</strong><small className="block truncate font-semibold text-slate-500">{[studentMetaToDisplay(student.meta), otherClass].filter(Boolean).join(' · ') || '학년·연령 미입력'}</small></span>
            {checked ? <Check size={18} className="text-emerald-600" /> : null}
          </label>; })}
          {!results.length ? <div className="rounded-xl bg-slate-50 p-4 text-center"><p className="text-xs font-bold text-slate-500">“{query.trim()}” 검색 결과가 없습니다.</p><button type="button" onClick={() => openNew(query.trim())} className="mt-2 min-h-11 px-3 text-sm font-black text-emerald-700">{query.trim()} 새 학생으로 등록</button></div> : null}
        </div> : null}
        {selectedIds.length ? <div className="sticky bottom-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg"><p className="mb-2 text-center text-xs font-black text-slate-700">{selectedIds.length}명 선택</p><button type="button" disabled={saving} onClick={() => void addSelected()} className={SPM_PRIMARY_BTN_FULL}>선택한 학생 추가</button></div> : null}
        <div className="border-t border-slate-100 pt-3"><p className="text-xs font-bold text-slate-500">여러 명을 새로 등록해야 하나요?</p><button type="button" onClick={openBulk} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 text-sm font-black text-slate-700"><Users size={16} className="mr-2 inline" />여러 명 빠르게 등록</button><button type="button" onClick={() => openNew(query.trim())} className="mt-2 min-h-11 w-full text-sm font-black text-slate-500">한 명 새로 등록</button></div>
      </> : null}

      {mode === 'new' ? <>
        <button type="button" onClick={() => setMode('search')} className="inline-flex min-h-11 items-center gap-1 text-sm font-black text-slate-500"><ArrowLeft size={16} />기존 학생 검색</button>
        <label className="block text-xs font-black text-slate-600">이름 *<input autoFocus value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-500" /></label>
        <StudentFieldSelect label="학년·연령" value={meta} onChange={setMeta} options={ageOptions} />
        <button type="button" disabled={!name.trim() || saving} onClick={() => void createOne()} className={SPM_PRIMARY_BTN_FULL}>등록하고 추가</button>
      </> : null}

      {mode === 'bulk' ? <>
        <button type="button" onClick={() => { if (bulkNames) setBulkNames(null); else setMode('search'); }} className="inline-flex min-h-11 items-center gap-1 text-sm font-black text-slate-500"><ArrowLeft size={16} />뒤로</button>
        {!bulkNames ? <><div><h3 className="text-base font-black text-slate-900">여러 명 빠르게 등록</h3><p className="mt-1 text-xs font-semibold leading-5 text-slate-500">학생 이름을 한 줄에 한 명씩 입력하거나 Excel·한글 명단에서 붙여넣으세요. 탭이 섞이면 첫 번째 값만 이름으로 사용합니다.</p></div><textarea autoFocus value={bulkText} onChange={(event) => setBulkText(event.target.value)} placeholder={'김민수\n이지우\n박준서\n최하늘'} className="min-h-48 w-full rounded-xl border border-slate-200 p-3 text-sm font-bold leading-7 outline-none focus:border-slate-400" /><button type="button" disabled={!bulkText.trim()} onClick={previewBulk} className={SPM_PRIMARY_BTN_FULL}>명단 확인</button></> : <><div><h3 className="text-base font-black text-slate-900">{bulkNames.length}명 인식</h3><p className="mt-1 text-xs font-semibold text-slate-500">빈 줄과 중복 입력은 제거했습니다.</p></div><div className="max-h-80 space-y-2 overflow-y-auto">{bulkNames.map((bulkName) => { const matches = data.students.filter((student) => student.name.trim() === bulkName); return <div key={bulkName} className="rounded-xl border border-slate-200 p-3"><p className="text-sm font-black text-slate-800">{bulkName}</p>{matches.length ? <div className="mt-2 space-y-1"><p className="text-xs font-bold text-amber-700">기존 학생이 있습니다. 자동으로 합치지 않습니다.</p>{matches.map((student) => <label key={student.id} className="flex min-h-11 items-center gap-2 text-xs font-bold text-slate-600"><input type="radio" name={`bulk-${bulkName}`} checked={bulkChoices[bulkName] === `existing:${student.id}`} onChange={() => setBulkChoices((current) => ({ ...current, [bulkName]: `existing:${student.id}` }))} />기존 {student.name} · {studentMetaToDisplay(student.meta) || '정보 없음'} 사용</label>)}<label className="flex min-h-11 items-center gap-2 text-xs font-bold text-slate-600"><input type="radio" name={`bulk-${bulkName}`} checked={bulkChoices[bulkName] === 'new'} onChange={() => setBulkChoices((current) => ({ ...current, [bulkName]: 'new' }))} />새 학생으로 등록</label></div> : <p className="mt-1 text-xs font-semibold text-slate-400">새 학생으로 등록</p>}</div>; })}</div><button type="button" disabled={saving} onClick={() => void submitBulk()} className={SPM_PRIMARY_BTN_FULL}>{bulkNames.length}명 등록</button></>}
      </> : null}

      {message ? <p className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{message}</p> : null}
      {error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p> : null}
    </div>
  </BottomSheet>;
}
