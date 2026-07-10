'use client';

import Link from 'next/link';
import { BookOpen, Check, Clipboard, FileText, GraduationCap, MessageCircle, Save, Search, UsersRound } from 'lucide-react';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RecordProgramPicker } from '../components/record/RecordProgramPicker';
import { getSafeMasterErrorMessage } from '../lib/clientErrors';
import { toClassRecord } from '../lib/operationalDataAdapter';
import { normalizeMasterSpace, normalizeMasterTarget } from '../lib/programDisplayTags';
import { useExplanationData } from '../explanations/ExplanationDataProvider';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { useMasterStore } from '../store';
import type { ExplanationAudience, MasterExplanationDto } from '../types/explanation';
import type { ClassRecord, Program } from '../types';

type Audience = ExplanationAudience;
type ReportTarget = 'class' | 'student';

const AUDIENCES: Array<{ id: Audience; label: string; description: string; Icon: typeof MessageCircle }> = [
  { id: 'parent', label: '학부모용', description: '아이들이 경험한 움직임을 쉽게 안내합니다.', Icon: UsersRound },
  { id: 'center', label: '기관용', description: '운영 목적과 활동 구성, 기대 효과를 정리합니다.', Icon: FileText },
  { id: 'school', label: '학교용', description: '수업 활동 기록과 참여 내용을 정리합니다.', Icon: GraduationCap },
];

const MOODS = ['활기찬 분위기', '차분한 분위기', '집중도가 높았음', '도전하는 분위기', '협동하는 분위기'];
const REACTIONS = [
  '적극적으로 참여함',
  '처음에는 조심스러웠지만 점차 참여함',
  '규칙을 이해하며 움직임',
  '친구와 상호작용이 좋았음',
  '반복하며 자신감이 생김',
];
const FOCUS_SKILLS = ['참여', '반응', '협동', '방향 전환', '공간 인식', '자기조절'];

function compactList(values: Array<string | undefined | null>) {
  return values.map((value) => value?.trim()).filter(Boolean).join(' / ');
}

function getReportQuery(searchParams: URLSearchParams | ReturnType<typeof useSearchParams>) {
  return {
    programId: searchParams.get('programId') ?? searchParams.get('program'),
    recordId: searchParams.get('record') ?? searchParams.get('recordId') ?? searchParams.get('from'),
    savedId: searchParams.get('saved'),
  };
}

function safeParagraph(value: string | undefined | null) {
  const text = (value ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!text || /undefined|null/i.test(text)) return '';
  return text;
}

function formatRecordDate(date: string) {
  return new Date(date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

function buildStudentObservation(record: ClassRecord, studentId: string) {
  const student = record.students.find((item) => item.studentId === studentId);
  if (!student) return '';
  const parts: string[] = [];
  if (student.attendance === 'present') parts.push('출석했습니다');
  if (student.attendance === 'absent') parts.push('결석했습니다');
  if (student.focused) parts.push('집중 관찰이 필요하거나 의미 있는 참여가 있었습니다');
  if (student.skills.length) parts.push(`${student.skills.join(', ')} 부분을 관찰했습니다`);
  if (student.memo?.trim()) parts.push(student.memo.trim());
  return parts.join('. ');
}

function buildRecordDraft(record: ClassRecord, target: ReportTarget, studentId: string | null) {
  const lines = [
    '안녕하세요.',
    '',
    `오늘은 ${record.programTitle} 활동을 진행했습니다.`,
    `${formatRecordDate(record.date)} · ${record.classId}`,
  ];
  const commonMemo = safeParagraph(record.memo);
  if (commonMemo) lines.push('', commonMemo);
  if (target === 'student' && studentId) {
    const student = record.students.find((item) => item.studentId === studentId);
    const observation = buildStudentObservation(record, studentId);
    if (student && observation) lines.push('', `${student.studentName} 학생은 ${observation}`);
  }
  lines.push('', '다음 수업에서도 즐겁고 안전하게 참여할 수 있도록 지도하겠습니다.', '감사합니다.');
  return lines.filter((line, index, array) => line || array[index - 1]).join('\n');
}

function clean(value: string | undefined | null, fallback = '') {
  const text = (value ?? '').trim();
  if (!text || /확인 필요|정보 없음|미정|undefined|null/i.test(text)) return fallback;
  return text;
}

function toggle(items: string[], item: string) {
  return items.includes(item) ? items.filter((value) => value !== item) : [...items, item];
}

function getActivityFlow(program: Program) {
  const detail = program.lessonDetail;
  const source = detail?.rules?.length ? detail.rules : program.steps;
  return source.map((item) => clean(item)).filter(Boolean);
}

function getAudienceOutputTitle(audience: Audience) {
  if (audience === 'center') return '기관 제출용 설명';
  if (audience === 'school') return '학교 수업 활동 기록';
  return '안내문';
}

function buildRecordNote(record: ClassRecord): string {
  const parts: string[] = [];
  if (record.memo?.trim()) parts.push(record.memo.trim());
  if (record.recordType !== 'quick') {
    if (record.present > 0) parts.push(`출석 ${record.present}명`);
    if (record.absent > 0) parts.push(`결석 ${record.absent}명`);
    if (record.focusCount > 0) parts.push(`집중 관찰 ${record.focusCount}명`);
    const studentMemos = record.students
      .filter((s) => s.memo)
      .map((s) => `${s.studentName}: ${s.memo}`)
      .join(', ');
    if (studentMemos) parts.push(studentMemos);
  }
  return parts.join('. ');
}

function addJosa(word: string, consonantForm: string, vowelForm: string): string {
  if (!word) return '';
  let lastKorean = 0;
  for (let i = word.length - 1; i >= 0; i--) {
    const c = word.charCodeAt(i);
    if (c >= 0xAC00 && c <= 0xD7A3) { lastKorean = c; break; }
  }
  return word + (lastKorean > 0 && (lastKorean - 0xAC00) % 28 !== 0 ? consonantForm : vowelForm);
}

function buildFocusText(focus: string): string {
  if (!focus.trim()) return '해당 움직임';
  const parts = focus.split(/[,，]/).map((f) => f.trim()).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? '해당 움직임';
  if (parts.length === 2) return `${addJosa(parts[0], '과', '와')} ${parts[1]}`;
  return `${parts.slice(0, 2).join(', ')} 등`;
}

function buildContextPhrase(target: string, space: string): string {
  const parts: string[] = [];
  if (target) parts.push(`${addJosa(target, '을', '를')} 대상으로`);
  if (space) parts.push(`${space}에서`);
  return parts.join(' ');
}

function stripStepPrefix(step: string): string {
  return step.replace(/^\s*\d+단계\s*[:：]\s*/, '').replace(/^\s*step\s*\d+\s*[:：]\s*/i, '').trim();
}

function buildEquipmentNames(items: string[]): string {
  if (!items.length) return '';
  const cleaned = items.map((raw) => {
    const match = raw.match(/^([^(（]+?)\s*[（(]([^)）]*)[)）]/);
    if (match) {
      const qtyMatch = match[2].match(/(\d+개)/);
      return qtyMatch ? `${match[1].trim()} ${qtyMatch[1]}` : match[1].trim();
    }
    return raw.trim();
  });
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${addJosa(cleaned[0], '과', '와')} ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(', ')}${addJosa(cleaned[cleaned.length - 2], '과', '와')} ${cleaned[cleaned.length - 1]}`;
}

function moodPhrase(mood: string): string {
  if (mood === '집중도가 높았음') return '집중도 높은 분위기 속에서';
  return `${mood} 속에서`;
}

const REACTION_SENTENCES: Record<string, string> = {
  '적극적으로 참여함': '적극적으로 수업에 참여하는 모습을 보였습니다',
  '처음에는 조심스러웠지만 점차 참여함': '처음에는 조심스러워했지만 점차 활동 흐름에 참여하는 모습을 보였습니다',
  '규칙을 이해하며 움직임': '규칙을 이해하며 활동에 참여하는 모습이 관찰되었습니다',
  '친구와 상호작용이 좋았음': '친구와 적극적으로 상호작용하는 모습이 관찰되었습니다',
  '반복하며 자신감이 생김': '반복 시도를 통해 점차 자신감 있게 참여하는 모습이 관찰되었습니다',
};

function buildReactionSentence(reaction: string): string {
  return REACTION_SENTENCES[reaction] ?? `${reaction} 모습을 보였습니다`;
}

function buildExplanation(input: {
  audience: Audience;
  program: Program;
  mood: string;
  reaction: string;
  focusSkills: string[];
  note: string;
}) {
  const { audience, program, mood, reaction, focusSkills, note } = input;
  const detail = program.lessonDetail;
  const title = clean(program.title, '오늘 수업');
  const focus = focusSkills.length
    ? focusSkills.join(', ')
    : clean(detail?.developmentFocus, program.tags.slice(0, 3).join(', '));
  const target = clean(normalizeMasterTarget(program.grade), '');
  const space = clean(normalizeMasterSpace(program.space), '');
  const allSteps = getActivityFlow(program);
  const noteLine = note.trim() ? ` 특이사항: ${note.trim()}` : '';
  const focusText = buildFocusText(focus);
  const contextPhrase = buildContextPhrase(target, space);
  const reactionText = buildReactionSentence(reaction);
  const mood_ = moodPhrase(mood);

  if (audience === 'parent') {
    return `오늘은 "${title}" 활동을 진행했습니다. ${mood_} ${reactionText}. 학생들은 ${focusText} 요소를 중심으로 정해진 규칙 안에서 움직임을 경험했습니다.${noteLine}`;
  }

  const equipText = buildEquipmentNames(program.equipment);
  const cleanedSteps = allSteps.map(stripStepPrefix).filter(Boolean);

  if (audience === 'center') {
    const context = contextPhrase ? `${contextPhrase} ` : '';
    const equipPart = equipText ? `${addJosa(equipText, '을', '를')} 준비해 진행하며, ` : '';
    const flowPart = cleanedSteps.length
      ? `활동은 ${cleanedSteps.slice(0, 3).join(', ')} 순서로 진행됩니다. `
      : '';
    return `${addJosa(`"${title}"`, '은', '는')} ${context}운영할 수 있는 신체활동 수업입니다. ${equipPart}${flowPart}수업에서는 ${focusText} 요소를 중심으로 학생들이 정해진 규칙 안에서 움직임을 시도하고 활동 흐름에 참여하는 경험을 제공합니다. 오늘 수업은 ${mood} 속에서 진행되었고, ${reactionText}.${noteLine}`;
  }

  // school
  const context = contextPhrase ? `${contextPhrase} ` : '';
  const equipPart = equipText ? `${addJosa(equipText, '을', '를')} 활용해 ` : '';
  const flowPart = cleanedSteps.length
    ? `학생들은 ${cleanedSteps.slice(0, 2).join(', ')} 순서로 활동에 참여했습니다. `
    : '학생들은 정해진 규칙 안에서 움직임을 시도하고 활동 흐름에 참여했습니다. ';
  return `오늘은 "${title}" 수업을 진행했습니다. ${context}${equipPart}수업을 운영했습니다. ${flowPart}${reactionText}.${noteLine}`;
}

function ChipGroup({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (next: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(toggle(selected, option))}
            className="min-h-9 rounded-full border px-3 text-[12px] font-black"
            style={{
              background: active ? 'var(--spm-acc)' : 'var(--spm-s2)',
              borderColor: active ? 'transparent' : 'var(--spm-br2)',
              color: active ? '#fff' : 'var(--spm-t2)',
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function SingleChoice({ options, value, onChange }: { options: string[]; value: string; onChange: (next: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className="min-h-9 rounded-full border px-3 text-[12px] font-black"
            style={{
              background: active ? 'var(--spm-acc)' : 'var(--spm-s2)',
              borderColor: active ? 'transparent' : 'var(--spm-br2)',
              color: active ? '#fff' : 'var(--spm-t2)',
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function ReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const programs = useMasterStore((state) => state.programs);
  const programsError = useMasterStore((state) => state.programsError);
  const operationalData = useOperationalData();
  const explanationData = useExplanationData();
  const classRecords = useMemo(() => operationalData.classRecords.map(toClassRecord), [operationalData.classRecords]);
  const programPool = useMemo(() => programs, [programs]);
  const { programId: queryProgramId, recordId: queryRecordId, savedId: savedExplanationId } = getReportQuery(searchParams);
  const initialProgramId = queryProgramId ?? programPool[0]?.id ?? '';
  const hasProgramQuery = Boolean(queryProgramId);
  const [selectedRecordId, setSelectedRecordId] = useState(queryRecordId ?? '');
  const selectedRecord = useMemo(
    () => (selectedRecordId ? classRecords.find((r) => r.id === selectedRecordId) ?? null : null),
    [classRecords, selectedRecordId],
  );
  const [programId, setProgramId] = useState(initialProgramId);
  const [audience, setAudience] = useState<Audience>('parent');
  const [target, setTarget] = useState<ReportTarget>('class');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [mood, setMood] = useState(MOODS[0]);
  const [reaction, setReaction] = useState(REACTIONS[0]);
  const [focusSkills, setFocusSkills] = useState<string[]>(['참여', '반응']);
  const [note, setNote] = useState('');
  const [recordNoteApplied, setRecordNoteApplied] = useState(false);
  const [search, setSearch] = useState('');
  const [generated, setGenerated] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'error' | 'idle' | 'success'>('idle');
  const [saveStatus, setSaveStatus] = useState<'error' | 'idle' | 'saving' | 'success'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOutputId, setSavedOutputId] = useState<string | null>(savedExplanationId);
  const savedQueryAppliedRef = useRef<string | null>(null);
  const recordQueryAppliedRef = useRef<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!queryRecordId || recordQueryAppliedRef.current === queryRecordId) return;
    const record = classRecords.find((item) => item.id === queryRecordId);
    if (!record) return;
    recordQueryAppliedRef.current = queryRecordId;
    const initialStudentId = record.students[0]?.studentId ?? null;
    const initialTarget: ReportTarget = initialStudentId ? 'student' : 'class';
    setSelectedRecordId(record.id);
    setProgramId(record.programId);
    setTarget(initialTarget);
    setSelectedStudentId(initialStudentId);
    setGenerated(buildRecordDraft(record, initialTarget, initialStudentId));
    setSaveStatus('idle');
    setSaveError(null);
  }, [classRecords, queryRecordId]);

  useEffect(() => {
    if (!selectedRecord || recordNoteApplied) return;
    const n = buildRecordNote(selectedRecord);
    if (n) setNote(n);
    setRecordNoteApplied(true);
  }, [selectedRecord, recordNoteApplied]);

  useEffect(() => {
    if (!programId && programPool[0]?.id) setProgramId(programPool[0].id);
  }, [programId, programPool]);

  useEffect(() => {
    if (!savedExplanationId || savedQueryAppliedRef.current === savedExplanationId) return;
    const savedExplanation = explanationData.explanations.find((item) => item.id === savedExplanationId);
    if (savedExplanation) {
      savedQueryAppliedRef.current = savedExplanationId;
      setProgramId(savedExplanation.programId);
      setAudience(savedExplanation.audience);
      setGenerated(savedExplanation.text);
      setSavedOutputId(savedExplanation.id);
      return;
    }

    if (explanationData.status !== 'ready') return;

    let cancelled = false;
    void explanationData.getExplanation(savedExplanationId).then((item) => {
      if (cancelled || !item || savedQueryAppliedRef.current === savedExplanationId) return;
      savedQueryAppliedRef.current = savedExplanationId;
      setProgramId(item.programId);
      setAudience(item.audience);
      setGenerated(item.text);
      setSavedOutputId(item.id);
    });

    return () => {
      cancelled = true;
    };
  }, [explanationData, savedExplanationId]);

  const program = programPool.find((item) => item.id === programId) ?? programPool[0];
  const filteredPrograms = search.trim()
    ? programPool.filter((item) => `${item.title} ${item.category} ${item.tags.join(' ')}`.toLowerCase().includes(search.trim().toLowerCase()))
    : programPool;
  const audienceMeta = AUDIENCES.find((item) => item.id === audience) ?? AUDIENCES[0];
  const draft = selectedRecord
    ? buildRecordDraft(selectedRecord, target, target === 'student' ? selectedStudentId : null)
    : program ? buildExplanation({ audience, program, mood, reaction, focusSkills, note }) : '';
  const output = generated || draft;
  const activityPreview = program ? getActivityFlow(program).slice(0, 2) : [];

  const clearSavedContext = (currentProgramId: string) => {
    if (!savedExplanationId) return;
    router.replace(`/spokedu-master/report?program=${currentProgramId}`);
  };

  const markDraftDirty = (currentProgramId = programId) => {
    setGenerated('');
    setSaveStatus('idle');
    setSaveError(null);
    clearSavedContext(currentProgramId);
  };

  const handleProgramSelect = (nextProgramId: string) => {
    setProgramId(nextProgramId);
    markDraftDirty(nextProgramId);

    if (selectedRecord && selectedRecord.programId !== nextProgramId) {
      setNote('');
      setRecordNoteApplied(false);
      router.replace(`/spokedu-master/report?program=${nextProgramId}`);
    }
  };

  const replaceDraft = (nextDraft: string) => {
    if (output.trim() && generated.trim() && !window.confirm('현재 수정한 안내문이 새 초안으로 교체됩니다.')) return;
    setGenerated(nextDraft);
    setSaveStatus('idle');
    setSaveError(null);
    setSavedOutputId(null);
  };

  const handleRecordSelect = (nextRecordId: string) => {
    const record = classRecords.find((item) => item.id === nextRecordId) ?? null;
    setSelectedRecordId(nextRecordId);
    setSelectedStudentId(record?.students[0]?.studentId ?? null);
    setTarget('class');
    if (record) {
      setProgramId(record.programId);
      replaceDraft(buildRecordDraft(record, 'class', null));
      router.replace(`/spokedu-master/report?record=${record.id}`);
    }
  };

  const handleTargetChange = (nextTarget: ReportTarget) => {
    setTarget(nextTarget);
    if (!selectedRecord) return;
    const nextStudentId = nextTarget === 'student' ? selectedStudentId ?? selectedRecord.students[0]?.studentId ?? null : null;
    setSelectedStudentId(nextStudentId);
    replaceDraft(buildRecordDraft(selectedRecord, nextTarget, nextStudentId));
  };

  const handleStudentChange = (nextStudentId: string) => {
    setSelectedStudentId(nextStudentId);
    if (!selectedRecord || target !== 'student') return;
    replaceDraft(buildRecordDraft(selectedRecord, 'student', nextStudentId));
  };

  const handleSavedExplanationSelect = (item: MasterExplanationDto) => {
    setProgramId(item.programId);
    setAudience(item.audience);
    setGenerated(item.text);
    savedQueryAppliedRef.current = item.id;
    setSavedOutputId(item.id);

    if (selectedRecord) {
      setNote('');
      setRecordNoteApplied(false);
    }

    router.replace(`/spokedu-master/report?program=${item.programId}&saved=${item.id}`);
  };

  const copyOutput = async () => {
    if (!output.trim()) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setCopyStatus('success');
    } catch {
      setCopied(false);
      setCopyStatus('error');
    }
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => {
      setCopied(false);
      setCopyStatus('idle');
    }, 1600);
  };

  const saveOutput = async () => {
    if (!program || !output.trim() || saveStatus === 'saving') return;
    setSaveStatus('saving');
    setSaveError(null);
    try {
      const saved = await explanationData.saveExplanation({
        programId: program.id,
        programTitle: program.title,
        audience,
        text: output,
      });
      setProgramId(saved.programId);
      setAudience(saved.audience);
      setGenerated(saved.text);
      savedQueryAppliedRef.current = saved.id;
      setSavedOutputId(saved.id);
      if (selectedRecord) {
        setNote('');
        setRecordNoteApplied(false);
      }
      router.replace(`/spokedu-master/report?program=${saved.programId}&saved=${saved.id}`);
      setSaveStatus('success');
    } catch {
      setSaveStatus('error');
      setSaveError(getSafeMasterErrorMessage('server'));
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-28 lg:pb-8" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>lesson explanation</p>
        <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>수업 안내문 만들기</h1>
        <p className="mt-2 max-w-[720px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
          수업이 끝나면 오늘의 활동이 설명 가능한 문장으로 정리됩니다. 체육수업의 의미를 학부모, 기관, 학교에 맞는 언어로 남깁니다.
        </p>
      </header>

      {selectedRecord ? (
        <section className="mx-[22px] mb-5 rounded-[18px] p-4 sm:mx-8 lg:mx-10" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.24)' }}>
          <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-acc)' }}>
            {selectedRecord.recordType === 'quick' ? '사용 기록 기반 안내문' : '학생 기록 기반 안내문'}
          </p>
          <h2 className="mt-1 text-[22px] font-black leading-tight" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>{selectedRecord.programTitle} 안내문 만들기</h2>
          <p className="mt-2 text-[12px] font-bold" style={{ color: 'var(--spm-t2)' }}>
            {new Date(selectedRecord.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} · {selectedRecord.classId}
            {selectedRecord.present > 0 ? ` · 출석 ${selectedRecord.present}명` : ''}
            {selectedRecord.focusCount > 0 ? ` · 관찰 ${selectedRecord.focusCount}명` : ''}
          </p>
          {selectedRecord.parentNoteSnapshot ? (
            <p className="mt-3 rounded-[10px] p-2.5 text-[12px] font-semibold leading-5" style={{ background: 'rgba(99,102,241,0.08)', color: 'var(--spm-t2)' }}>
              저장된 안내문: {selectedRecord.parentNoteSnapshot}
            </p>
          ) : null}
        </section>
      ) : hasProgramQuery && program ? (
        <section className="mx-[22px] mb-5 rounded-[18px] p-4 sm:mx-8 lg:mx-10" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.24)' }}>
          <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-acc)' }}>수업 자료 기반 문구</p>
          <h2 className="mt-1 text-[22px] font-black leading-tight" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>{program.title} 설명 만들기</h2>
          <p className="mt-2 text-[12px] font-bold" style={{ color: 'var(--spm-t2)' }}>
            {compactList([normalizeMasterTarget(program.grade), normalizeMasterSpace(program.space)])}
          </p>
          {activityPreview.length ? (
            <p className="mt-3 line-clamp-2 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
              활동 흐름: {activityPreview.join(' ')}
            </p>
          ) : null}
        </section>
      ) : null}

      <div className={`grid gap-5 px-[22px] sm:px-8 lg:px-10 ${hasProgramQuery ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : 'lg:grid-cols-[360px_minmax(0,1fr)]'}`}>
        <aside className={`space-y-4 ${hasProgramQuery ? 'order-2' : 'order-1'}`}>
          <section className="rounded-[18px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <div className="mb-3 flex items-center gap-2">
              <FileText size={16} color="var(--spm-acc)" />
              <h2 className="text-[15px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>1. 수업 기록 선택</h2>
            </div>
            {classRecords.length ? (
              <select value={selectedRecordId} onChange={(event) => handleRecordSelect(event.target.value)} className="h-11 w-full rounded-[12px] border px-3 text-[13px] font-bold outline-none" style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}>
                <option value="">수업 기록을 선택하세요</option>
                {classRecords.map((record) => (
                  <option key={record.id} value={record.id}>{record.programTitle} · {formatRecordDate(record.date)}</option>
                ))}
              </select>
            ) : (
              <div className="rounded-[12px] p-3 text-[12px] font-semibold leading-5" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t3)' }}>
                <p>안내문을 작성하려면 먼저 수업 기록이 필요합니다.</p>
                <p className="mt-1">수업 내용을 기록한 뒤 전달용 안내문을 작성할 수 있습니다.</p>
                <div className="mt-3">
                  <RecordProgramPicker label="수업 골라 기록" />
                </div>
              </div>
            )}
          </section>

          <section className="rounded-[18px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <div className="mb-3 flex items-center gap-2">
              <BookOpen size={16} color="var(--spm-acc)" />
              <h2 className="text-[15px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>{hasProgramQuery ? '다른 수업 선택' : '수업 선택'}</h2>
            </div>
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" color="var(--spm-t3)" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="수업명이나 주제로 검색"
                className="h-10 w-full rounded-[11px] border pl-9 pr-3 text-[13px] font-bold outline-none"
                style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
              />
            </div>
            <div className={`scrollbar-hide space-y-1 overflow-y-auto ${hasProgramQuery ? 'max-h-[220px] lg:max-h-[420px]' : 'max-h-[330px]'}`}>
              {filteredPrograms.length ? (
                filteredPrograms.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleProgramSelect(item.id)}
                    className="w-full rounded-[12px] px-3 py-2.5 text-left"
                    style={{ background: item.id === program?.id ? 'rgba(99,102,241,0.15)' : 'var(--spm-s3)', border: item.id === program?.id ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent' }}
                  >
                    <strong className="block line-clamp-1 text-[13px]" style={{ color: 'var(--spm-t)' }}>{item.title}</strong>
                    <span className="mt-1 block line-clamp-1 text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{compactList([normalizeMasterTarget(item.grade), normalizeMasterSpace(item.space)]) || item.category}</span>
                  </button>
                ))
              ) : (
                <p className="rounded-[12px] p-3 text-[12px] font-semibold leading-5" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t3)' }}>
                  {programsError === 'forbidden'
                    ? '이용권 만료로 수업 자료를 불러올 수 없습니다. 이용권을 구독해 주세요.'
                    : '수업 자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'}
                </p>
              )}
            </div>
          </section>

          <section className="rounded-[18px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <h2 className="text-[15px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>최근 만든 설명</h2>
            <div className="mt-3 space-y-2">
              {explanationData.status === 'loading' ? (
                <p className="rounded-[12px] p-3 text-[12px] font-semibold leading-5" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t3)' }}>
                  저장한 안내문을 불러오는 중입니다.
                </p>
              ) : explanationData.status === 'error' ? (
                <p className="rounded-[12px] p-3 text-[12px] font-semibold leading-5" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t3)' }}>
                  저장한 안내문을 불러오지 못했습니다.
                </p>
              ) : explanationData.explanations.length ? explanationData.explanations.slice(0, 5).map((item) => (
                <div key={item.id}>
                <button type="button" onClick={() => handleSavedExplanationSelect(item)} className="block w-full rounded-[12px] p-3 text-left" style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)' }}>
                  <strong className="block line-clamp-1 text-[12px]" style={{ color: 'var(--spm-t)' }}>{item.programTitle}</strong>
                  <span className="mt-1 block text-[11px] font-bold" style={{ color: 'var(--spm-t3)' }}>{new Date(item.createdAt).toLocaleDateString('ko-KR')} · {item.text.includes(' 학생은 ') ? '학생별 안내문' : '전체 수업 안내문'}</span>
                </button>
                <button type="button" onClick={() => { void navigator.clipboard.writeText(item.text).then(() => setCopyStatus('success')).catch(() => setCopyStatus('error')); }} className="mt-1 min-h-10 w-full rounded-[10px] px-3 text-[11px] font-black" style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--spm-acc)' }}>복사</button>
                </div>
              )) : (
                <div className="rounded-[12px] p-3 text-[12px] font-semibold leading-5" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t3)' }}>
                  아직 저장한 안내문이 없습니다. 수업 기록을 바탕으로 전달용 안내문을 작성할 수 있습니다.
                </div>
              )}
            </div>
          </section>
        </aside>

        <section className={`space-y-3 sm:space-y-4 ${hasProgramQuery ? 'order-1' : 'order-2'}`}>
          <section className="rounded-[18px] p-4 sm:p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>오늘 수업 정리</p>
                <h2 className="mt-1 text-[24px] font-black leading-tight" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>{program?.title ? `${program.title} 설명 만들기` : '수업을 선택하세요'}</h2>
              </div>
              {program ? (
                <Link href={`/spokedu-master/library/${program.id}`} className="inline-flex h-10 items-center gap-2 rounded-[12px] px-3 text-[12px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
                  <BookOpen size={14} />
                  수업 자료 보기
                </Link>
              ) : null}
            </div>

            <div className="mt-4 grid gap-4 sm:mt-5 sm:gap-5">
              <div>
                <p className="mb-2 text-[12px] font-black" style={{ color: 'var(--spm-t2)' }}>2. 안내 대상 선택</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => handleTargetChange('class')} className="min-h-11 rounded-[14px] p-3 text-left" style={{ background: target === 'class' ? 'rgba(99,102,241,0.15)' : 'var(--spm-s3)', border: target === 'class' ? '1px solid rgba(99,102,241,0.45)' : '1px solid var(--spm-br2)' }}>
                    <strong className="block text-[13px]" style={{ color: 'var(--spm-t)' }}>전체 수업 안내문</strong>
                    <span className="mt-1 block text-[11px] font-semibold leading-4" style={{ color: 'var(--spm-t3)' }}>학생별 관찰 내용은 포함하지 않습니다.</span>
                  </button>
                  <button type="button" onClick={() => handleTargetChange('student')} disabled={!selectedRecord?.students.length} className="min-h-11 rounded-[14px] p-3 text-left disabled:opacity-50" style={{ background: target === 'student' ? 'rgba(99,102,241,0.15)' : 'var(--spm-s3)', border: target === 'student' ? '1px solid rgba(99,102,241,0.45)' : '1px solid var(--spm-br2)' }}>
                    <strong className="block text-[13px]" style={{ color: 'var(--spm-t)' }}>학생별 안내문</strong>
                    <span className="mt-1 block text-[11px] font-semibold leading-4" style={{ color: 'var(--spm-t3)' }}>선택한 학생 1명의 기록만 사용합니다.</span>
                  </button>
                </div>
                {target === 'student' && selectedRecord?.students.length ? (
                  <select value={selectedStudentId ?? ''} onChange={(event) => handleStudentChange(event.target.value)} className="mt-3 h-11 w-full rounded-[12px] border px-3 text-[13px] font-bold outline-none" style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}>
                    {selectedRecord.students.map((student) => (
                      <option key={student.studentId} value={student.studentId}>{student.studentName}</option>
                    ))}
                  </select>
                ) : null}
              </div>

              <div>
                <p className="mb-2 text-[12px] font-black" style={{ color: 'var(--spm-t2)' }}>부가 설정</p>
                <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-3">
                  {AUDIENCES.map(({ id, label, description, Icon }) => {
                    const active = audience === id;
                    return (
                      <button key={id} type="button" onClick={() => { setAudience(id); markDraftDirty(); }} className="rounded-[14px] p-2.5 text-left sm:p-3" style={{ background: active ? 'rgba(99,102,241,0.15)' : 'var(--spm-s3)', border: active ? '1px solid rgba(99,102,241,0.45)' : '1px solid var(--spm-br2)' }}>
                        <Icon size={16} color={active ? 'var(--spm-acc)' : 'var(--spm-t3)'} />
                        <strong className="mt-2 block text-[13px]" style={{ color: 'var(--spm-t)' }}>{label}</strong>
                        <span className="mt-1 hidden text-[11px] font-semibold leading-4 sm:block" style={{ color: 'var(--spm-t3)' }}>{description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
                <div>
                  <p className="mb-2 text-[12px] font-black" style={{ color: 'var(--spm-t2)' }}>오늘 수업 분위기</p>
                  <SingleChoice options={MOODS} value={mood} onChange={(next) => { setMood(next); markDraftDirty(); }} />
                </div>
                <div>
                  <p className="mb-2 text-[12px] font-black" style={{ color: 'var(--spm-t2)' }}>아이들 반응</p>
                  <SingleChoice options={REACTIONS} value={reaction} onChange={(next) => { setReaction(next); markDraftDirty(); }} />
                </div>
              </div>

              <div>
                <p className="mb-2 text-[12px] font-black" style={{ color: 'var(--spm-t2)' }}>강조한 움직임</p>
                <ChipGroup options={FOCUS_SKILLS} selected={focusSkills} onChange={(next) => { setFocusSkills(next); markDraftDirty(); }} />
              </div>

              <label className="block">
                <span className="mb-2 block text-[12px] font-black" style={{ color: 'var(--spm-t2)' }}>특이사항</span>
                <textarea
                  value={note}
                  onChange={(event) => { setNote(event.target.value); markDraftDirty(); }}
                  rows={3}
                  placeholder="예: 처음에는 조심스러웠지만 두 번째 라운드부터 규칙을 이해하고 적극적으로 참여했습니다."
                  className="w-full resize-y rounded-[13px] border px-3 py-3 text-[13px] font-semibold leading-6 outline-none"
                  style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
                />
              </label>
            </div>
          </section>

          <section className="rounded-[18px] p-4 sm:p-5" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.14), var(--spm-s1))', border: '1px solid rgba(99,102,241,0.22)' }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-black uppercase tracking-[0.12em]" style={{ color: '#818cf8' }}>{audienceMeta.label}</p>
                <h2 className="mt-1 text-[22px] font-black leading-tight" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>{getAudienceOutputTitle(audience)}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => replaceDraft(draft)} className="inline-flex min-h-11 items-center gap-2 rounded-[12px] px-3 text-[12px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
                  <FileText size={14} />
                  안내문 다시 생성
                </button>
                <button type="button" onClick={copyOutput} disabled={!output.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-[12px] px-3 text-[12px] font-black disabled:opacity-50" style={{ background: copied ? 'rgba(16,185,129,0.16)' : 'var(--spm-s2)', color: copied ? 'var(--spm-grn)' : 'var(--spm-t)', border: '1px solid var(--spm-br2)' }}>
                  {copied ? <Check size={14} /> : <Clipboard size={14} />}
                  {copied ? '복사 완료' : '현재 문구 복사'}
                </button>
                <button type="button" data-report-action="save" onClick={() => void saveOutput()} disabled={saveStatus === 'saving' || !output.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-[12px] px-3 text-[12px] font-black disabled:opacity-60" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t)', border: '1px solid var(--spm-br2)' }}>
                  <Save size={14} />
                  {saveStatus === 'saving' ? '저장 중...' : '안내문 저장'}
                </button>
              </div>
            </div>
            {copyStatus === 'success' ? <p className="mt-2 text-[12px] font-bold" style={{ color: 'var(--spm-grn)' }}>안내문을 복사했습니다.</p> : null}
            {copyStatus === 'error' ? <p className="mt-2 text-[12px] font-bold text-red-600">자동으로 복사하지 못했습니다. 내용을 직접 선택해 복사해 주세요.</p> : null}
            {saveStatus === 'success' ? (
              <div className="mt-3 flex flex-wrap gap-2 rounded-[12px] p-3" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--spm-grn)' }}>
                <p className="w-full text-[12px] font-bold">안내문이 저장되었습니다.</p>
                <button type="button" onClick={copyOutput} className="inline-flex min-h-11 items-center rounded-[10px] px-3 text-[11px] font-black" style={{ background: 'rgba(16,185,129,0.08)', color: 'var(--spm-grn)' }}>안내문 복사</button>
                {savedOutputId ? <Link href={`/spokedu-master/report?saved=${savedOutputId}`} className="inline-flex min-h-11 items-center rounded-[10px] px-3 text-[11px] font-black" style={{ background: 'rgba(16,185,129,0.08)', color: 'var(--spm-grn)' }}>저장한 안내문 보기</Link> : null}
                <Link href="/spokedu-master/activity" className="inline-flex min-h-11 items-center rounded-[10px] px-3 text-[11px] font-black" style={{ background: 'rgba(16,185,129,0.08)', color: 'var(--spm-grn)' }}>수업 기록으로</Link>
              </div>
            ) : null}
            {saveStatus === 'error' && saveError ? (
              <p className="mt-2 text-[12px] font-bold text-red-600">{saveError}</p>
            ) : null}
            <textarea value={program ? output : '수업을 선택하면 안내문을 만들 수 있습니다.'} onChange={(event) => { setGenerated(event.target.value); setSaveStatus('idle'); setSaveError(null); setSavedOutputId(null); if (program) clearSavedContext(program.id); }} disabled={!program} className="mt-3 min-h-[260px] w-full resize-y rounded-[14px] border p-3.5 text-[14px] font-semibold leading-7 outline-none sm:mt-4 sm:min-h-[340px] sm:p-4 sm:text-[15px] sm:leading-8" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t)', borderColor: 'var(--spm-br2)' }} />
          </section>
        </section>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="h-full" style={{ background: 'var(--spm-bg)' }} />}>
      <ReportContent />
    </Suspense>
  );
}
