'use client';

import Link from 'next/link';
import { BookOpen, CalendarDays, ChevronRight, ClipboardList, FileText, Plus, ShieldAlert, Shuffle, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BottomSheet } from '../components/ui/BottomSheet';
import {
  canRunLegacyOperationalImport,
  checkLegacyOperationalImportComplete,
  importLegacyOperationalData,
  verifyLegacyOperationalImportComplete,
  type OperationalImportProgress,
  type OperationalImportResult,
} from '../lib/importLegacyOperationalData';
import {
  LEGACY_OPERATIONAL_ARCHIVE_KEY,
  removeLegacyOperationalArchive,
} from '../lib/legacyOperationalArchive';
import {
  buildLegacyOperationalBackupFileName,
  buildLegacyOperationalBackupJson,
  readLegacyOperationalPreview,
  type LegacyOperationalImportPreview,
} from '../lib/legacyOperationalImport';
import { toClassRecord, toStudentProfile } from '../lib/operationalDataAdapter';
import { getSafeMasterErrorMessage } from '../lib/clientErrors';
import { getStudentRecordFacts } from '../lib/studentRecordFacts';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { useMasterStore } from '../store';
import type { ClassRecord } from '../types';

type StudentRecordEntry = {
  record: ClassRecord;
  student: ClassRecord['students'][number];
};

function getStudentRecordEntries(records: ClassRecord[], studentId: string): StudentRecordEntry[] {
  return records
    .flatMap((record) => {
      const student = record.students.find((item) => item.studentId === studentId);
      return student ? [{ record, student }] : [];
    })
    .sort((a, b) => new Date(b.record.date).getTime() - new Date(a.record.date).getTime());
}

function formatStudentRecordDate(date: string): string {
  return new Date(date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

function getSafeLegacyImportReason(reason: string): string {
  return getSafeMasterErrorMessage('validation', reason);
}

function getAttendanceLabel(attendance: StudentRecordEntry['student']['attendance']): string {
  if (attendance === 'present') return '출석';
  if (attendance === 'absent') return '결석';
  return '미확인';
}

export default function StudentsPage() {
  const profile = useMasterStore((state) => state.profile);
  const operationalData = useOperationalData();
  const students = operationalData.students.map(toStudentProfile);
  const records = operationalData.classRecords.map(toClassRecord);
  const operationalLoading = operationalData.status === 'idle' || operationalData.status === 'loading';
  const operationalReady = operationalData.status === 'ready';
  const operationalError = operationalData.status === 'error';
  const [selectedId, setSelectedId] = useState<string | null>(students[0]?.id ?? null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [newMeta, setNewMeta] = useState('');
  const [studentSaving, setStudentSaving] = useState(false);
  const [studentSaveError, setStudentSaveError] = useState<string | null>(null);
  const [legacyPreviewAvailable, setLegacyPreviewAvailable] = useState(false);
  const [legacyPreview, setLegacyPreview] = useState<LegacyOperationalImportPreview | null>(null);
  const [legacyOwnerConfirmed, setLegacyOwnerConfirmed] = useState(false);
  const [legacyBackupConfirmed, setLegacyBackupConfirmed] = useState(false);
  const [legacyImporting, setLegacyImporting] = useState(false);
  const [legacyImportProgress, setLegacyImportProgress] = useState<OperationalImportProgress | null>(null);
  const [legacyImportResult, setLegacyImportResult] = useState<OperationalImportResult | null>(null);
  const [legacyImportComplete, setLegacyImportComplete] = useState(false);
  const [legacyDeleteConfirmed, setLegacyDeleteConfirmed] = useState(false);
  const [legacyDeleting, setLegacyDeleting] = useState(false);
  const [legacyDeleteMessage, setLegacyDeleteMessage] = useState<string | null>(null);
  const [legacyDeleteError, setLegacyDeleteError] = useState<string | null>(null);
  const selected = students.find((student) => student.id === selectedId) ?? students[0];

  useEffect(() => {
    if (selectedId && students.some((student) => student.id === selectedId)) return;
    setSelectedId(students[0]?.id ?? null);
  }, [selectedId, students]);

  useEffect(() => {
    try {
      const preview = readLegacyOperationalPreview(window.localStorage);
      setLegacyPreviewAvailable(preview.students.total > 0 || preview.records.total > 0);
    } catch {
      setLegacyPreviewAvailable(false);
    }
  }, []);

  const handleAdd = () => {
    if (!newName.trim() || studentSaving) return;
    const legacyId = crypto.randomUUID();
    setStudentSaving(true);
    setStudentSaveError(null);
    void operationalData
      .createStudent({
        legacyId,
        name: newName.trim(),
        group: newGroup.trim() || '미분류',
        meta: newMeta,
      })
      .then((student) => {
        setSelectedId(student.id);
        setNewName('');
        setNewGroup('');
        setNewMeta('');
        setAddOpen(false);
      })
      .catch(() => {
        setStudentSaveError('학생을 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      })
      .finally(() => {
        setStudentSaving(false);
      });
  };
  const selectedFacts = selected ? getStudentRecordFacts(records, selected.id) : null;
  const selectedRecords = selected ? getStudentRecordEntries(records, selected.id) : [];
  const selectedLatestRecord = selectedRecords[0] ?? null;
  const selectedLatestMemoRecord = selectedRecords.find(({ student }) => student.memo?.trim()) ?? null;
  const selectedPreparationRecord = selectedLatestMemoRecord ?? selectedLatestRecord;
  const recordedStudentCount = students.filter((student) => records.some((record) => record.students.some((item) => item.studentId === student.id))).length;
  const handlePreviewLegacyImport = async () => {
    const preview = readLegacyOperationalPreview(window.localStorage);
    setLegacyPreview(preview);
    setLegacyBackupConfirmed(false);
    setLegacyDeleteConfirmed(false);
    setLegacyDeleteError(null);
    setLegacyDeleteMessage(null);
    setLegacyImportResult(null);
    setLegacyImportProgress(null);
    try {
      setLegacyImportComplete(await checkLegacyOperationalImportComplete(preview));
    } catch {
      setLegacyImportComplete(false);
    }
  };
  const handleDownloadLegacyBackup = () => {
    if (!legacyPreview?.rawBackup) return;
    const blob = new Blob([buildLegacyOperationalBackupJson(legacyPreview)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = buildLegacyOperationalBackupFileName();
    link.click();
    URL.revokeObjectURL(url);
    setLegacyBackupConfirmed(true);
  };
  const canImportLegacy = legacyPreview
    ? canRunLegacyOperationalImport({
        preview: legacyPreview,
        ownerConfirmed: legacyOwnerConfirmed,
        backupConfirmed: legacyBackupConfirmed,
      }) && !legacyImporting
    : false;
  const hasLegacyDeletionWarning = legacyPreview
    ? legacyPreview.students.invalid > 0
      || legacyPreview.students.duplicate > 0
      || legacyPreview.records.invalid > 0
      || legacyPreview.records.duplicate > 0
      || legacyPreview.records.excludedChildEntries > 0
      || legacyPreview.records.orphanStudentEntries > 0
      || legacyPreview.records.recordTypeDefaulted > 0
      || legacyPreview.students.invalidMetaCoerced > 0
    : false;
  const canDeleteLegacyArchive = Boolean(
    legacyPreview?.archiveReady
      && legacyOwnerConfirmed
      && legacyBackupConfirmed
      && legacyImportComplete
      && legacyDeleteConfirmed
      && !legacyImporting
      && !legacyDeleting,
  );
  const handleImportLegacy = async () => {
    if (!legacyPreview || !canImportLegacy) return;
    const confirmed = window.confirm(
      `학생 ${legacyPreview.students.valid}명과 수업 기록 ${legacyPreview.records.valid}건을 현재 로그인 계정으로 가져옵니다.\n원본 브라우저 데이터는 삭제되지 않습니다.`,
    );
    if (!confirmed) return;

    setLegacyImporting(true);
    setLegacyImportResult(null);
    try {
      const result = await importLegacyOperationalData(
        {
          preview: legacyPreview,
          ownerConfirmed: legacyOwnerConfirmed,
          backupConfirmed: legacyBackupConfirmed,
        },
        { onProgress: setLegacyImportProgress },
      );
      setLegacyImportResult(result);
      setLegacyImportComplete(result.status === 'success');
      if (result.status === 'success' || result.status === 'partial') {
        await operationalData.reload();
      }
    } finally {
      setLegacyImporting(false);
    }
  };
  const handleDeleteLegacyArchive = async () => {
    if (!legacyPreview || !canDeleteLegacyArchive) return;
    setLegacyDeleting(true);
    setLegacyDeleteError(null);
    setLegacyDeleteMessage(null);
    try {
      const latestPreview = readLegacyOperationalPreview(window.localStorage);
      setLegacyPreview(latestPreview);
      if (!latestPreview.archiveReady) {
        throw new Error('유효한 이전 데이터 archive가 없습니다.');
      }
      if (!legacyOwnerConfirmed || !legacyBackupConfirmed || !legacyDeleteConfirmed) {
        throw new Error('삭제 확인 조건이 완료되지 않았습니다.');
      }

      const verification = await verifyLegacyOperationalImportComplete(latestPreview);
      if (!verification.ok) {
        setLegacyImportComplete(false);
        throw new Error(verification.reason ?? '서버 이전 검증에 실패했습니다.');
      }

      const confirmed = window.confirm(
        '이 기기에 별도로 보관된 이전 학생·수업 기록 원본을 삭제합니다.\n\n서버에 저장된 데이터는 삭제되지 않습니다.\n다운로드한 백업 파일은 유지됩니다.\n이 작업은 이 브라우저에서 되돌릴 수 없습니다.\n\n이전 데이터 삭제',
      );
      if (!confirmed) return;

      const result = removeLegacyOperationalArchive(window.localStorage);
      if (!result.ok) {
        throw new Error(result.reason);
      }
      if (window.localStorage.getItem(LEGACY_OPERATIONAL_ARCHIVE_KEY) !== null) {
        throw new Error('archive key가 삭제되지 않았습니다.');
      }

      setLegacyPreview(null);
      setLegacyPreviewAvailable(true);
      setLegacyImportComplete(false);
      setLegacyBackupConfirmed(false);
      setLegacyDeleteConfirmed(false);
      setLegacyDeleteMessage('이 기기의 이전 데이터 원본을 삭제했습니다. 서버에 저장된 학생·수업 기록은 유지됩니다.');
    } catch (error) {
      setLegacyDeleteError(getSafeMasterErrorMessage('validation', error instanceof Error ? error.message : null));
    } finally {
      setLegacyDeleting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-28 lg:pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>student history</p>
            <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>학생 이력</h1>
            <p className="mt-2 max-w-[720px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
              수업 기록에서 남긴 출석, 관찰, 동작 체크를 학생별 성장 근거로 정리합니다.
            </p>
          </div>
          <button type="button" onClick={() => { setStudentSaveError(null); setAddOpen(true); }} className="mt-1 flex h-11 shrink-0 items-center gap-2 rounded-[12px] px-4 text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
            <Plus size={15} />
            학생 추가
          </button>
        </div>
      </header>

      <section className="mx-[22px] mb-5 grid gap-2 sm:mx-8 sm:grid-cols-3 lg:mx-10">
        {[
          ['등록 명단', `${students.length || 0}명`],
          ['기록 연결', `${recordedStudentCount}/${students.length || 0}명`],
          ['수업 기록', `${records.length}건`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[14px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <p className="text-[10px] font-black" style={{ color: 'var(--spm-t3)' }}>{label}</p>
            <p className="mt-1 text-[18px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>{value}</p>
          </div>
        ))}
      </section>

      {operationalLoading ? (
        <section className="mx-[22px] mb-5 rounded-[14px] p-4 text-[13px] font-bold sm:mx-8 lg:mx-10" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}>
          학생 정보를 불러오는 중입니다.
        </section>
      ) : null}

      {operationalError ? (
        <section className="mx-[22px] mb-5 rounded-[14px] p-4 text-[13px] font-bold sm:mx-8 lg:mx-10" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)', color: 'var(--spm-red)' }}>
          <p>학생 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
          <button type="button" onClick={() => void operationalData.reload()} className="mt-3 h-11 rounded-[10px] px-4 text-[12px] font-black text-white" style={{ background: 'var(--spm-red)' }}>
            다시 시도
          </button>
        </section>
      ) : null}

      {profile && legacyPreviewAvailable ? (
        <section className="mx-[22px] mb-5 rounded-[18px] p-5 sm:mx-8 lg:mx-10" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <details>
            <summary className="cursor-pointer text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>
              고급 기능: 이 기기의 기존 데이터 가져오기
            </summary>
            <div className="mt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-acc)' }}>local data preview</p>
              <h2 className="mt-1 text-[20px] font-black" style={{ color: 'var(--spm-t)' }}>이 기기의 기존 데이터 가져오기</h2>
              <p className="mt-2 max-w-[680px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
                현재 브라우저에만 저장된 학생과 수업 기록을 확인합니다. 아직 서버에는 저장하지 않습니다.
              </p>
              {legacyPreview ? (
                <p className="mt-2 text-[12px] font-bold" style={{ color: legacyPreview.archiveReady ? 'var(--spm-grn)' : 'var(--spm-red)' }}>
                  {legacyPreview.archiveReady
                    ? '원본 보존 상태: 별도 안전 보관 완료'
                    : legacyPreview.archiveError
                      ? '기존 데이터를 안전하게 보관하지 못했습니다. 브라우저 데이터를 삭제하거나 초기화하지 마세요.'
                      : '원본 보존 상태: 별도 보관할 기존 데이터가 없습니다.'}
                </p>
              ) : null}
            </div>
            <button type="button" onClick={handlePreviewLegacyImport} className="h-10 shrink-0 rounded-[11px] px-4 text-[12px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
              가져오기 내용 확인
            </button>
          </div>

          {legacyPreview ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-2 sm:grid-cols-4">
                {[
                  ['학생 전체', `${legacyPreview.students.total}명`],
                  ['학생 가능', `${legacyPreview.students.valid}명`],
                  ['학생 중복', `${legacyPreview.students.duplicate}명`],
                  ['학생 오류', `${legacyPreview.students.invalid}명`],
                  ['기록 전체', `${legacyPreview.records.total}건`],
                  ['기록 가능', `${legacyPreview.records.valid}건`],
                  ['기록 중복', `${legacyPreview.records.duplicate}건`],
                  ['기록 오류', `${legacyPreview.records.invalid}건`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[12px] p-3" style={{ background: 'var(--spm-s3)' }}>
                    <p className="text-[10px] font-black" style={{ color: 'var(--spm-t3)' }}>{label}</p>
                    <p className="mt-1 text-[17px] font-black" style={{ color: 'var(--spm-t)' }}>{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
                  고아 학생 기록: <strong style={{ color: 'var(--spm-t)' }}>{legacyPreview.records.orphanStudentEntries}건</strong>
                </div>
                <div className="rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
                  제외 child: <strong style={{ color: 'var(--spm-t)' }}>{legacyPreview.records.excludedChildEntries}건</strong>
                </div>
                <div className="rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
                  제외 레거시 필드: <strong style={{ color: 'var(--spm-t)' }}>{legacyPreview.excludedLegacyFields.length ? legacyPreview.excludedLegacyFields.join(', ') : '없음'}</strong>
                </div>
                <div className="rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
                  문자열 meta 보존: <strong style={{ color: 'var(--spm-t)' }}>{legacyPreview.students.stringMetaPreserved}명</strong>
                </div>
                <div className="rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
                  object meta 보존: <strong style={{ color: 'var(--spm-t)' }}>{legacyPreview.students.objectMetaPreserved}명</strong>
                </div>
                <div className="rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
                  invalid meta 보정: <strong style={{ color: 'var(--spm-t)' }}>{legacyPreview.students.invalidMetaCoerced}명</strong>
                </div>
                <div className="rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
                  recordType 보정: <strong style={{ color: 'var(--spm-t)' }}>{legacyPreview.records.recordTypeDefaulted}건</strong>
                </div>
              </div>

              <details className="rounded-[12px] p-3" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
                <summary className="cursor-pointer text-[12px] font-black" style={{ color: 'var(--spm-t)' }}>오류·경고 세부 보기</summary>
                <div className="mt-3 space-y-2 text-[12px] font-semibold">
                  {[...legacyPreview.students.issues, ...legacyPreview.records.issues].length ? (
                    [...legacyPreview.students.issues, ...legacyPreview.records.issues].map((issue, index) => (
                      <p key={`${issue.scope}-${issue.legacyId ?? 'none'}-${index}`}>
                        [{issue.scope}] {issue.legacyId ? `${issue.legacyId}: ` : ''}{getSafeLegacyImportReason(issue.reason)}
                      </p>
                    ))
                  ) : (
                    <p>표시할 오류나 경고가 없습니다.</p>
                  )}
                </div>
              </details>

              <label className="flex items-start gap-2 rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--spm-t2)' }}>
                <input type="checkbox" checked={legacyOwnerConfirmed} onChange={(event) => setLegacyOwnerConfirmed(event.target.checked)} className="mt-1" />
                <span>이 기기에 저장된 학생·수업 기록이 현재 로그인한 계정의 데이터임을 확인합니다.</span>
              </label>

              {hasLegacyDeletionWarning ? (
                <div className="rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--spm-t2)' }}>
                  <p style={{ color: 'var(--spm-t)' }}>일부 원본 항목은 서버 이전 대상에서 제외되었거나 정규화되었습니다.</p>
                  <p className="mt-1">삭제 후에는 내려받은 백업 파일에서만 확인할 수 있습니다.</p>
                </div>
              ) : null}

              {legacyPreview.archiveReady ? (
                <label className="flex items-start gap-2 rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--spm-t2)' }}>
                  <input
                    type="checkbox"
                    checked={legacyDeleteConfirmed}
                    onChange={(event) => setLegacyDeleteConfirmed(event.target.checked)}
                    className="mt-1"
                  />
                  <span>서버에 저장된 학생·수업 기록을 확인했으며, 제외되거나 정규화된 원본은 내려받은 백업 파일에만 남는다는 점을 확인했습니다.</span>
                </label>
              ) : null}

              {legacyImportComplete ? (
                <div className="rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--spm-grn)' }}>
                  이 기기의 가져오기 가능한 데이터는 서버에 저장되어 있습니다.
                </div>
              ) : null}

              {legacyImportProgress ? (
                <div className="rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
                  진행 단계: <strong style={{ color: 'var(--spm-t)' }}>{legacyImportProgress.stage}</strong>
                  {' · '}
                  {legacyImportProgress.current}/{legacyImportProgress.total}
                  {' · 기존 '}
                  {legacyImportProgress.existing}
                  {' · 실패 '}
                  {legacyImportProgress.failed}
                </div>
              ) : null}

              {legacyImportResult ? (
                <div className="space-y-2 rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
                  <p style={{ color: 'var(--spm-t)' }}>
                    {legacyImportResult.status === 'success'
                      ? '서버 가져오기가 완료되었습니다. 브라우저 원본 데이터는 아직 유지되고 있습니다.'
                      : legacyImportResult.status === 'partial'
                        ? '일부 데이터만 서버로 가져왔습니다. 실패 항목은 다시 시도할 수 있습니다.'
                        : '서버 가져오기를 완료하지 못했습니다.'}
                  </p>
                  <p>학생 생성 {legacyImportResult.students.created}명 · 기존 {legacyImportResult.students.existing}명 · 실패 {legacyImportResult.students.failed}명</p>
                  <p>기록 생성 {legacyImportResult.records.created}건 · 기존 {legacyImportResult.records.existing}건 · 보류 {legacyImportResult.records.blocked}건 · 실패 {legacyImportResult.records.failed}건</p>
                  <p>현재 운영 화면은 서버 데이터를 사용합니다. 브라우저 원본은 가져오기·백업 안전망으로만 유지됩니다.</p>
                  {[...legacyImportResult.students.failures, ...legacyImportResult.records.failures].length ? (
                    <details>
                      <summary className="cursor-pointer" style={{ color: 'var(--spm-t)' }}>실패 항목 보기</summary>
                      <div className="mt-2 space-y-1">
                        {[...legacyImportResult.students.failures, ...legacyImportResult.records.failures].map((failure, index) => (
                          <p key={`${failure.legacyId}-${index}`}>{failure.legacyId}: {getSafeLegacyImportReason(failure.reason)}</p>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={handleDownloadLegacyBackup} className="h-10 rounded-[11px] px-4 text-[12px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
                  이 기기의 원본 데이터 백업
                </button>
                <button
                  type="button"
                  disabled={!canImportLegacy}
                  onClick={handleImportLegacy}
                  className="h-10 rounded-[11px] px-4 text-[12px] font-black text-white disabled:opacity-60"
                  style={{ background: canImportLegacy ? 'var(--spm-acc)' : 'var(--spm-s3)', color: canImportLegacy ? '#fff' : 'var(--spm-t3)' }}
                >
                  {legacyImporting ? '서버로 가져오는 중...' : legacyImportResult?.status === 'partial' ? '실패 항목 다시 시도' : '확인한 데이터를 서버로 가져오기'}
                </button>
                {legacyPreview.archiveReady ? (
                  <button
                    type="button"
                    disabled={!canDeleteLegacyArchive}
                    onClick={handleDeleteLegacyArchive}
                    className="h-10 rounded-[11px] px-4 text-[12px] font-black disabled:opacity-60"
                    style={{ background: canDeleteLegacyArchive ? 'rgba(239,68,68,0.14)' : 'var(--spm-s3)', color: canDeleteLegacyArchive ? 'var(--spm-red)' : 'var(--spm-t3)' }}
                  >
                    {legacyDeleting ? '삭제 확인 중...' : '이 기기의 이전 데이터 삭제'}
                  </button>
                ) : null}
              </div>
              {legacyDeleteMessage ? (
                <p className="rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--spm-grn)' }}>
                  {legacyDeleteMessage}
                </p>
              ) : null}
              {legacyDeleteError ? (
                <p className="rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--spm-red)' }}>
                  이전 데이터 원본을 삭제하지 못했습니다. 브라우저 데이터를 직접 초기화하지 말고 다시 시도해 주세요. ({legacyDeleteError})
                </p>
              ) : null}
              {legacyPreview.archiveError ? (
                <p className="text-[12px] font-bold" style={{ color: 'var(--spm-red)' }}>
                  archive 검증 실패로 서버 가져오기를 비활성화했습니다. 원본 백업을 먼저 보관해 주세요.
                </p>
              ) : null}
            </div>
          ) : null}
          {!legacyPreview && legacyDeleteMessage ? (
            <p className="mt-4 rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--spm-grn)' }}>
              {legacyDeleteMessage}
            </p>
          ) : null}
          {!legacyPreview && legacyDeleteError ? (
            <p className="mt-4 rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--spm-red)' }}>
              이전 데이터 원본을 삭제하지 못했습니다. 브라우저 데이터를 직접 초기화하지 말고 다시 시도해 주세요. ({legacyDeleteError})
            </p>
          ) : null}
            </div>
          </details>
        </section>
      ) : null}

      {operationalReady && students.length === 0 ? (
        <section className="mx-[22px] rounded-[18px] p-6 text-center sm:mx-8 lg:mx-10" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-[16px]" style={{ background: 'rgba(99,102,241,0.14)', color: 'var(--spm-acc)' }}>
            <Users size={24} />
          </div>
          <h2 className="mt-4 text-[20px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>아직 등록된 학생이 없습니다.</h2>
          <p className="mx-auto mt-2 max-w-[520px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t3)' }}>
            학생을 추가하면 수업 기록을 학생별로 관리할 수 있습니다.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <button type="button" onClick={() => { setStudentSaveError(null); setAddOpen(true); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] px-5 text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
              <Plus size={15} />
              학생 추가
            </button>
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 px-[22px] sm:px-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-10">
        {students.length > 0 ? <section className="space-y-2">
          {students.map((student) => {
            const studentRecords = getStudentRecordEntries(records, student.id);
            const latestRecord = studentRecords[0] ?? null;
            const latestMemoRecord = studentRecords.find((entry) => entry.student.memo?.trim()) ?? null;

            return (
              <div key={student.id} className="flex items-center gap-2 rounded-[15px]" style={{ background: selectedId === student.id ? 'rgba(99,102,241,0.14)' : 'var(--spm-s2)', border: selectedId === student.id ? '1px solid rgba(99,102,241,0.45)' : '1px solid var(--spm-br)' }}>
                <button type="button" onClick={() => setSelectedId(student.id)} className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[15px] font-black text-white" style={{ background: 'var(--spm-acc)', fontFamily: 'var(--spm-font-display)' }}>
                    {student.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>{student.name}</strong>
                    <span className="mt-1 block text-[11px]" style={{ color: 'var(--spm-t3)' }}>{[student.group, student.meta].filter(Boolean).join(' / ')}</span>
                    <span className="mt-1 block line-clamp-1 text-[11px] font-bold" style={{ color: latestRecord ? 'var(--spm-t2)' : 'var(--spm-t3)' }}>
                      {latestRecord
                        ? `최근 ${formatStudentRecordDate(latestRecord.record.date)} · ${latestRecord.record.programTitle}${latestMemoRecord ? ' · 메모 있음' : ''}`
                        : '아직 저장된 수업 기록이 없습니다.'}
                    </span>
                  </span>
                  <ChevronRight size={16} color="var(--spm-t3)" />
                </button>
                <div className="flex w-[116px] shrink-0 flex-col gap-1.5 py-2">
                  <span className="text-[11px] font-black" style={{ color: 'var(--spm-acc)' }}>누적 {studentRecords.length}건</span>
                  <Link href={`/spokedu-master/students/${student.id}`} className="inline-flex min-h-10 items-center justify-center rounded-[10px] px-2 text-[11px] font-black" style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--spm-acc)' }}>학생 기록 보기</Link>
                  <Link href={`/spokedu-master/class-record?student=${student.id}`} className="inline-flex min-h-10 items-center justify-center rounded-[10px] px-2 text-[11px] font-black" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--spm-grn)' }}>수업 기록 작성</Link>
                </div>
                <button type="button" onClick={() => { void operationalData.deleteStudent(student.id).then(() => { if (selectedId === student.id) setSelectedId(null); }); }} className="mr-2 grid h-8 w-8 shrink-0 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s3)' }} aria-label={`${student.name} 삭제`}>
                  <Trash2 size={14} color="var(--spm-red)" />
                </button>
              </div>
            );
          })}
        </section> : null}

        {selected ? (
          <section className="overflow-hidden rounded-[20px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-acc)' }}>{selected.group}</p>
                  <h2 className="mt-2 text-[30px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>{selected.name}</h2>
                  {selected.meta ? <p className="mt-1 text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>{selected.meta}</p> : null}
                  <p className="mt-2 text-[11px] font-semibold" style={{ color: 'var(--spm-grn)' }}>연결된 수업 기록 {selectedFacts?.recordCount ?? 0}건</p>
                </div>
                <span className="grid h-12 w-12 place-items-center rounded-full" style={{ background: 'rgba(16,185,129,0.14)' }}>
                  <ClipboardList size={20} color="var(--spm-grn)" />
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ['수업 기록', `${selectedFacts?.recordCount ?? 0}건`],
                  ['출석 체크', `${selectedFacts?.presentCount ?? 0}건`],
                  ['결석 체크', `${selectedFacts?.absentCount ?? 0}건`],
                  ['집중 관찰', `${selectedFacts?.focusedCount ?? 0}건`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[12px] p-3 text-center" style={{ background: 'var(--spm-s3)' }}>
                    <p className="text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{value}</p>
                    <p className="mt-1 text-[10px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5 border-t p-5" style={{ borderColor: 'var(--spm-br2)' }}>
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-[16px] font-black" style={{ color: 'var(--spm-t)' }}>
                  <CalendarDays size={17} color="var(--spm-acc)" />
                  최근 수업 요약
                </h3>
                {selectedLatestRecord ? (
                  <div className="rounded-[12px] p-3 text-[12px] font-semibold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
                    <p className="font-black" style={{ color: 'var(--spm-t)' }}>{selectedLatestRecord.record.programTitle}</p>
                    <p className="mt-1">
                      {formatStudentRecordDate(selectedLatestRecord.record.date)} · {getAttendanceLabel(selectedLatestRecord.student.attendance)}
                      {selectedLatestRecord.student.focused ? ' · 집중 관찰' : ''}
                    </p>
                    {selectedLatestRecord.student.skills.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedLatestRecord.student.skills.map((skill) => (
                          <span key={skill} className="rounded-full px-2 py-1 text-[11px] font-black" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--spm-grn)' }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {selectedLatestRecord.student.memo ? (
                      <p className="mt-2 max-h-24 overflow-y-auto break-words rounded-[10px] p-2 leading-5" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t)' }}>
                        학생 메모: {selectedLatestRecord.student.memo}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="rounded-[12px] p-3 text-[12px] font-semibold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t3)' }}>아직 저장된 수업 기록이 없습니다.</p>
                )}
              </div>
              <div>
                <h3 className="mb-3 text-[16px] font-black" style={{ color: 'var(--spm-t)' }}>최근 학생 메모</h3>
                {selectedLatestMemoRecord ? (
                  <div className="rounded-[12px] p-3 text-[12px] font-semibold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
                    <p className="font-black" style={{ color: 'var(--spm-t)' }}>{selectedLatestMemoRecord.record.programTitle}</p>
                    <p className="mt-1">
                      {formatStudentRecordDate(selectedLatestMemoRecord.record.date)} · {getAttendanceLabel(selectedLatestMemoRecord.student.attendance)}
                      {selectedLatestMemoRecord.student.focused ? ' · 집중 관찰' : ''}
                    </p>
                    <p className="mt-2 max-h-28 overflow-y-auto break-words rounded-[10px] p-2 leading-5" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t)' }}>
                      {selectedLatestMemoRecord.student.memo}
                    </p>
                  </div>
                ) : (
                  <p className="rounded-[12px] p-3 text-[12px] font-semibold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t3)' }}>아직 저장된 학생별 메모가 없습니다.</p>
                )}
              </div>
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-[16px] font-black" style={{ color: 'var(--spm-t)' }}>
                  <BookOpen size={17} color="var(--spm-acc)" />
                  다음 수업 준비
                </h3>
                {selectedPreparationRecord ? (
                  <div className="rounded-[12px] p-3 text-[12px] font-semibold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
                    <p className="font-black" style={{ color: 'var(--spm-t)' }}>{selectedPreparationRecord.record.programTitle}</p>
                    <p className="mt-1">
                      {formatStudentRecordDate(selectedPreparationRecord.record.date)}
                      {selectedPreparationRecord.student.focused ? ' · 집중 관찰' : ''}
                    </p>
                    {selectedPreparationRecord.student.memo ? (
                      <p className="mt-2 max-h-28 overflow-y-auto break-words rounded-[10px] p-2 leading-5" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t)' }}>
                        {selectedPreparationRecord.student.memo}
                      </p>
                    ) : null}
                    {selectedPreparationRecord.student.skills.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedPreparationRecord.student.skills.map((skill) => (
                          <span key={skill} className="rounded-full px-2 py-1 text-[11px] font-black" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--spm-grn)' }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Link href={`/spokedu-master/library/${selectedPreparationRecord.record.programId}`} className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
                        <BookOpen size={15} />
                        수업 자료 보기
                      </Link>
                      <Link href={`/spokedu-master/class-record?program=${selectedPreparationRecord.record.programId}`} className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t)' }}>
                        <ClipboardList size={15} />
                        같은 수업으로 기록 준비
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[12px] p-3 text-[12px] font-semibold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t3)' }}>
                    <p>아직 다음 수업 준비에 활용할 기록이 없습니다.</p>
                    <Link href="/spokedu-master/library" className="mt-3 flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
                      <BookOpen size={15} />
                      수업 자료 찾기
                    </Link>
                  </div>
                )}
              </div>
              <div>
                <h3 className="mb-3 text-[16px] font-black" style={{ color: 'var(--spm-t)' }}>기록된 기능 태그</h3>
                {selectedFacts?.skillTags.length ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedFacts.skillTags.map((skill) => (
                      <span key={skill} className="rounded-full px-3 py-2 text-[12px] font-black" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--spm-grn)' }}>{skill}</span>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-[12px] p-3 text-[12px] font-semibold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t3)' }}>아직 기록된 기능 태그가 없습니다.</p>
                )}
              </div>
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-[16px] font-black" style={{ color: 'var(--spm-t)' }}>
                  <CalendarDays size={17} color="var(--spm-acc)" />
                  최근 수업 기록
                </h3>
                {selectedRecords.length > 0 ? (
                  <div className="space-y-2">
                    {selectedRecords.slice(0, 8).map(({ record, student }) => (
                      <div key={record.id} className="rounded-[12px] p-3 text-[12px] font-semibold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
                        <p className="font-black" style={{ color: 'var(--spm-t)' }}>{record.programTitle}</p>
                        <p className="mt-1">
                          {formatStudentRecordDate(record.date)} · {getAttendanceLabel(student.attendance)}
                          {student.focused ? ' · 집중 관찰' : ''}
                        </p>
                        {student.skills.length ? (
                          <p className="mt-1 line-clamp-2">
                            기능 태그: {student.skills.join(', ')}
                          </p>
                        ) : null}
                        {student.memo ? (
                          <p className="mt-2 max-h-24 overflow-y-auto break-words rounded-[10px] p-2 leading-5" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t)' }}>
                            학생 메모: {student.memo}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-[12px] p-3 text-[12px] font-semibold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t3)' }}>아직 저장된 수업 기록이 없습니다.</p>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Link href="/spokedu-master/class-tools" className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
                  <Shuffle size={15} />
                  도구
                </Link>
                <Link href="/spokedu-master/class-record" className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
                  <ClipboardList size={15} />
                  기록
                </Link>
                <Link href="/spokedu-master/report" className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
                  <FileText size={15} />
                  문구
                </Link>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="flex min-h-10 items-center gap-2 rounded-[11px] px-3 py-2 text-[11px] font-bold" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--spm-t2)' }}>
                  <ShieldAlert size={14} className="shrink-0" color="var(--spm-acc)" />
                  <span>
                    <strong className="block" style={{ color: 'var(--spm-t)' }}>학부모 공유 기능 준비 중</strong>
                    <span className="mt-0.5 block">학생 정보 보호를 위해 안전한 공유 방식으로 개편하고 있습니다.</span>
                  </span>
                </div>
                <Link href="/spokedu-master/library" className="flex h-11 items-center justify-center gap-2 rounded-[11px] text-[12px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
                  <BookOpen size={14} />
                  다음 수업 자료
                </Link>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <BottomSheet open={addOpen} title="학생 추가" onClose={() => setAddOpen(false)}>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>이름 *</span>
            <input type="text" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="예: 김민준" className="h-11 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} />
          </label>
          <label className="block">
            <span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>반 / 그룹</span>
            <input type="text" value={newGroup} onChange={(event) => setNewGroup(event.target.value)} placeholder="예: 초등 A반, 유아반" className="h-11 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} />
          </label>
          <label className="block">
            <span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>나이 / 수강 기간</span>
            <input type="text" value={newMeta} onChange={(event) => setNewMeta(event.target.value)} placeholder="예: 8세 / 3개월차" className="h-11 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} />
          </label>
          {studentSaveError ? (
            <p className="rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--spm-red)' }}>
              {studentSaveError}
            </p>
          ) : null}
          <button type="button" onClick={handleAdd} disabled={!newName.trim() || studentSaving} className="h-12 w-full rounded-[12px] text-[14px] font-black text-white disabled:opacity-50" style={{ background: 'var(--spm-acc)' }}>
            {studentSaving ? '추가 중...' : '추가'}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
