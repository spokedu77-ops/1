'use client';

import { ClipboardCopy, FileText, Save } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { SPM_PRIMARY_BTN, SPM_SECONDARY_BTN } from '../lib/masterActionGrammar';
import { formatSeoulSessionDay, formatSeoulSessionTime, getSeoulSessionDay } from '../lib/sessionDateTime';
import { resolveReportSession } from '../lib/sessionContext';
import { resolveParentNotice } from './parentNoticeModel';

export default function ReportPage() {
  const data = useOperationalData();
  const searchParams = useSearchParams();
  const sessions = useMemo(() => [...data.sessions]
    .filter((session) => session.status === 'completed')
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()), [data.sessions]);
  const requestedSessionId = searchParams.get('session');
  const [selectedId, setSelectedId] = useState('');
  const selected = resolveReportSession(sessions, requestedSessionId, selectedId);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const invalidRequestedSession = Boolean(requestedSessionId) && data.status === 'ready' && !selected;
  const persistedNotice = selected ? resolveParentNotice(selected) : '';
  useEffect(() => {
    setNotice(persistedNotice);
    setFeedback(null);
  }, [persistedNotice, selected?.id]);
  const noticeDirty = Boolean(selected) && notice.trim() !== persistedNotice.trim();
  const saveNotice = async () => {
    if (!selected || !noticeDirty || saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      await data.saveParentNotice(selected.id, notice);
      setFeedback('안내문을 저장했습니다.');
    } catch {
      setFeedback('안내문을 저장하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };
  const backToSessionHref = selected
    ? `/spokedu-master/activity?session=${encodeURIComponent(selected.id)}`
    : '/spokedu-master/activity';

  return (
    <main className="h-full overflow-y-auto bg-[var(--spm-bg)] p-5 pb-28 lg:p-8">
      <div className="mx-auto max-w-3xl">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <FileText size={22} />
            수업 안내문
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            완료된 수업의 출석, 진행 프로그램, 수업 메모를 바탕으로 간단한 안내문을 확인합니다.
          </p>
        </header>
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {!requestedSessionId ? (
            <label className="text-xs font-black text-slate-600">
              완료된 수업
              <select
                value={selected?.id ?? ''}
                onChange={(event) => setSelectedId(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"
              >
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {formatSeoulSessionDay(getSeoulSessionDay(session.startAt), { month: 'long', day: 'numeric' })}{' '}
                    {formatSeoulSessionTime(session.startAt)} · {session.className}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {selected ? (
            <>
              <label className="mt-5 block text-xs font-black text-slate-600">
                안내문 내용
                <textarea value={notice} onChange={(event) => { setNotice(event.target.value); setFeedback(null); }} maxLength={4000} className="mt-2 min-h-72 w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-700 outline-none focus:border-blue-500" />
              </label>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500"><span>{feedback ?? (noticeDirty ? '저장하지 않은 변경사항이 있습니다.' : '저장됨')}</span><span>{notice.length.toLocaleString()} / 4,000자</span></div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button type="button" disabled={!noticeDirty || saving} onClick={() => void saveNotice()} className={SPM_PRIMARY_BTN}><Save size={15} />{saving ? '저장 중' : '안내문 저장'}</button>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(notice)}
                  className={SPM_SECONDARY_BTN}
                >
                  <ClipboardCopy size={15} />
                  안내문 복사
                </button>
                <Link href={backToSessionHref} className={`${SPM_SECONDARY_BTN} sm:col-span-2`}>
                  수업으로 돌아가기
                </Link>
              </div>
            </>
          ) : invalidRequestedSession ? (
            <p className="mt-5 rounded-xl bg-rose-50 p-5 text-center text-sm font-bold text-rose-700">
              완료된 수업을 찾을 수 없습니다.
            </p>
          ) : (
            <p className="mt-5 rounded-xl bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">
              완료된 수업이 없습니다.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
