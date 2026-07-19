'use client';

import Link from 'next/link';
import { BookOpen, Check, Clipboard, FileText, Save, Search } from 'lucide-react';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RecordProgramPicker } from '../components/record/RecordProgramPicker';
import { SaveErrorBanner } from '../components/ui/SaveErrorBanner';
import {
  canAttemptOnlineSave,
  getOfflineSaveFeedback,
  resolveSaveActionFeedback,
  type SaveActionFeedback,
} from '../lib/saveActionFeedback';
import {
  REPORT_DRAFT_KEY,
  clearSaveDraft,
  readSaveDraft,
  writeSaveDraft,
} from '../lib/saveDraftStorage';
import { toClassRecord } from '../lib/operationalDataAdapter';
import { useMasterAccessSnapshot } from '../access/MasterAccessProvider';
import { normalizeMasterSpace, normalizeMasterTarget } from '../lib/programDisplayTags';
import { useExplanationData } from '../explanations/ExplanationDataProvider';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { useMasterStore } from '../store';
import type { ExplanationAudience, MasterExplanationDto } from '../types/explanation';
import type { ClassRecord, Program } from '../types';

type Audience = ExplanationAudience;
type ReportTarget = 'class' | 'student';

type ReportDraft = {
  programId: string;
  selectedRecordId: string;
  audience: Audience;
  target: ReportTarget;
  selectedStudentId: string | null;
  mood: string;
  reaction: string;
  focusSkills: string[];
  note: string;
  generated: string;
};

const AUDIENCES: Array<{ id: Audience; label: string }> = [
  { id: 'parent', label: '학부모용' },
  { id: 'center', label: '기관용' },
  { id: 'school', label: '학교용' },
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
  const parentNote = record.parentNoteSnapshot?.trim();
  // 빠른 기록에서 남긴 안내문 초안이 있으면 그 내용을 본문으로 우선 사용한다.
  if (parentNote) {
    return parentNote;
  }

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
            className="min-h-11 rounded-full border px-3 text-[12px] font-black"
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
            className="min-h-11 rounded-full border px-3 text-[12px] font-black"
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
  const [showRefine, setShowRefine] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const programs = useMasterStore((state) => state.programs);
  const programsError = useMasterStore((state) => state.programsError);
  const isOnline = useMasterStore((state) => state.operational.online);
  const accessSnapshot = useMasterAccessSnapshot();
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
  const [saveFeedback, setSaveFeedback] = useState<SaveActionFeedback | null>(null);
  const [savedOutputId, setSavedOutputId] = useState<string | null>(savedExplanationId);
  const savedQueryAppliedRef = useRef<string | null>(null);
  const recordQueryAppliedRef = useRef<string | null>(null);
  const draftHydratedRef = useRef(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (savedExplanationId || queryRecordId || draftHydratedRef.current) return;
    const draft = readSaveDraft<ReportDraft>(REPORT_DRAFT_KEY);
    draftHydratedRef.current = true;
    if (!draft?.generated?.trim() && !draft?.note?.trim()) return;
    // URL로 다른 프로그램 안내문에 들어왔으면 이전 프로그램 초안을 덮어쓰지 않는다.
    if (queryProgramId && draft.programId && draft.programId !== queryProgramId) return;
    if (draft.programId) setProgramId(draft.programId);
    if (draft.selectedRecordId) setSelectedRecordId(draft.selectedRecordId);
    if (draft.audience) setAudience(draft.audience);
    if (draft.target) setTarget(draft.target);
    if (draft.selectedStudentId !== undefined) setSelectedStudentId(draft.selectedStudentId);
    if (draft.mood) setMood(draft.mood);
    if (draft.reaction) setReaction(draft.reaction);
    if (draft.focusSkills?.length) setFocusSkills(draft.focusSkills);
    if (draft.note) setNote(draft.note);
    if (draft.generated) setGenerated(draft.generated);
  }, [queryProgramId, queryRecordId, savedExplanationId]);

  useEffect(() => {
    if (savedExplanationId || saveStatus === 'success') return;
    if (!generated.trim() && !note.trim()) return;
    writeSaveDraft(REPORT_DRAFT_KEY, {
      programId,
      selectedRecordId,
      audience,
      target,
      selectedStudentId,
      mood,
      reaction,
      focusSkills,
      note,
      generated,
    } satisfies ReportDraft);
  }, [
    audience,
    focusSkills,
    generated,
    mood,
    note,
    programId,
    reaction,
    saveStatus,
    savedExplanationId,
    selectedRecordId,
    selectedStudentId,
    target,
  ]);

  useEffect(() => {
    if (operationalData.status !== 'ready' || !queryRecordId || recordQueryAppliedRef.current === queryRecordId) return;
    const record = classRecords.find((item) => item.id === queryRecordId);
    if (!record) return;
    recordQueryAppliedRef.current = queryRecordId;
    const initialStudentId = record.students[0]?.studentId ?? null;
    setSelectedRecordId(record.id);
    setProgramId(record.programId);
    setTarget('class');
    setSelectedStudentId(initialStudentId);
    setGenerated(buildRecordDraft(record, 'class', null));
    setSaveStatus('idle');
    setSaveFeedback(null);
  }, [classRecords, operationalData.status, queryRecordId]);

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

  const clearSavedContext = (currentProgramId: string) => {
    if (!savedExplanationId) return;
    router.replace(`/spokedu-master/report?program=${currentProgramId}`);
  };

  const markDraftDirty = (currentProgramId = programId) => {
    setGenerated('');
    setSaveStatus('idle');
    setSaveFeedback(null);
    clearSavedContext(currentProgramId);
  };

  const handleProgramSelect = (nextProgramId: string) => {
    setProgramId(nextProgramId);
    markDraftDirty(nextProgramId);

    if (selectedRecord && selectedRecord.programId !== nextProgramId) {
      setNote('');
      setRecordNoteApplied(false);
      router.replace(`/spokedu-master/report?program=${nextProgramId}`);
      return;
    }

    if (queryProgramId && queryProgramId !== nextProgramId) {
      router.replace(`/spokedu-master/report?program=${nextProgramId}`);
    }
  };

  const replaceDraft = (nextDraft: string) => {
    if (output.trim() && generated.trim() && !window.confirm('현재 수정한 안내문이 새 초안으로 교체됩니다.')) return;
    setGenerated(nextDraft);
    setSaveStatus('idle');
    setSaveFeedback(null);
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
    if (!canAttemptOnlineSave(isOnline)) {
      setSaveStatus('error');
      setSaveFeedback(getOfflineSaveFeedback());
      return;
    }
    setSaveStatus('saving');
    setSaveFeedback(null);
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
      clearSaveDraft(REPORT_DRAFT_KEY);
    } catch (caught) {
      setSaveStatus('error');
      setSaveFeedback(resolveSaveActionFeedback(caught, accessSnapshot));
    }
  };

  const focused = Boolean(selectedRecord);
  const programOptions = search.trim() ? filteredPrograms : programPool;

  return (
    <div className="h-full overflow-y-auto pb-28 lg:pb-8" style={{ background: 'var(--spm-bg)' }}>
      <div className="mx-auto max-w-3xl px-[22px] pt-[22px] sm:px-8 lg:px-10">
        <header className="pb-4">
          <h1 className="text-[28px] font-black md:text-[34px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>안내문 만들고 복사</h1>
          <p className="mt-1.5 text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
            문구 확인 → 복사 → 카톡·문자·메일에 붙여넣기. 보관은 나중에 다시 복사할 때만.
          </p>
        </header>

        {selectedRecord ? (
          <section className="mb-4 rounded-[16px] p-3.5" style={{ background: 'var(--spm-acc-a12)', border: '1px solid var(--spm-acc-a24)' }}>
            <p className="text-[12px] font-black" style={{ color: 'var(--spm-acc)' }}>{selectedRecord.programTitle}</p>
            <p className="mt-1 text-[12px] font-bold" style={{ color: 'var(--spm-t2)' }}>
              {new Date(selectedRecord.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
              {selectedRecord.present > 0 ? ` · 출석 ${selectedRecord.present}명` : ''}
            </p>
          </section>
        ) : null}

        {!focused ? (
          <section className="mb-4 space-y-3 rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            {classRecords.length ? (
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-black" style={{ color: 'var(--spm-t2)' }}>수업 기록</span>
                <select value={selectedRecordId} onChange={(event) => handleRecordSelect(event.target.value)} className="h-11 w-full rounded-[12px] border px-3 text-[13px] font-bold outline-none" style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}>
                  <option value="">기록 없이 수업만으로 만들기</option>
                  {classRecords.map((record) => (
                    <option key={record.id} value={record.id}>{record.programTitle} · {formatRecordDate(record.date)}</option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="rounded-[12px] p-3 text-[12px] font-semibold leading-5" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t3)' }}>
                <p>기록이 있으면 더 자연스러운 안내문이 됩니다.</p>
                <div className="mt-3">
                  <RecordProgramPicker label="수업 골라 기록" />
                </div>
              </div>
            )}
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-black" style={{ color: 'var(--spm-t2)' }}>수업</span>
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" color="var(--spm-t3)" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="수업명 검색"
                  className="h-10 w-full rounded-[11px] border pl-9 pr-3 text-[13px] font-bold outline-none"
                  style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
                />
              </div>
              <select
                value={program?.id ?? ''}
                onChange={(event) => handleProgramSelect(event.target.value)}
                className="h-11 w-full rounded-[12px] border px-3 text-[13px] font-bold outline-none"
                style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
              >
                {!programOptions.length ? <option value="">수업 없음</option> : null}
                {programOptions.map((item) => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
              {programsError === 'forbidden' ? (
                <p className="mt-2 text-[12px] font-semibold" style={{ color: 'var(--spm-t3)' }}>이용권 만료로 수업 자료를 불러올 수 없습니다.</p>
              ) : null}
            </label>
          </section>
        ) : null}

        <section className="rounded-[18px] p-4 sm:p-5" style={{ background: 'linear-gradient(135deg, var(--spm-acc-a14), var(--spm-s1))', border: '1px solid var(--spm-acc-a22)' }}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[12px] font-black" style={{ color: 'var(--spm-acc-muted)' }}>{audienceMeta.label} · {getAudienceOutputTitle(audience)}</p>
              <h2 className="mt-1 text-[20px] font-black leading-tight" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>
                {program?.title ?? '수업을 선택하세요'}
              </h2>
            </div>
            <button type="button" onClick={copyOutput} disabled={!output.trim()} className="inline-flex min-h-12 items-center gap-2 rounded-[12px] px-5 text-[14px] font-black text-white disabled:opacity-50" style={{ background: copied ? 'var(--spm-grn)' : 'var(--spm-acc)' }}>
              {copied ? <Check size={16} /> : <Clipboard size={16} />}
              {copied ? '복사 완료' : '복사해서 전달'}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {AUDIENCES.map(({ id, label }) => {
              const active = audience === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => { setAudience(id); if (!selectedRecord) markDraftDirty(); }}
                  className="min-h-10 rounded-full px-3 text-[12px] font-black"
                  style={{
                    background: active ? 'var(--spm-acc)' : 'var(--spm-s2)',
                    color: active ? '#fff' : 'var(--spm-t2)',
                    border: active ? '1px solid transparent' : '1px solid var(--spm-br2)',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {selectedRecord ? (
            <div className="mt-3">
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => handleTargetChange('class')} className="min-h-10 rounded-full px-3 text-[12px] font-black" style={{ background: target === 'class' ? 'var(--spm-acc)' : 'var(--spm-s2)', color: target === 'class' ? '#fff' : 'var(--spm-t2)', border: target === 'class' ? '1px solid transparent' : '1px solid var(--spm-br2)' }}>
                  전체 수업 안내문
                </button>
                <button type="button" onClick={() => handleTargetChange('student')} disabled={!selectedRecord.students.length} className="min-h-10 rounded-full px-3 text-[12px] font-black disabled:opacity-50" style={{ background: target === 'student' ? 'var(--spm-acc)' : 'var(--spm-s2)', color: target === 'student' ? '#fff' : 'var(--spm-t2)', border: target === 'student' ? '1px solid transparent' : '1px solid var(--spm-br2)' }}>
                  학생별 안내문
                </button>
              </div>
              <p className="mt-1.5 text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>
                {target === 'student' ? '선택한 학생 1명의 기록만 사용합니다.' : '학생별 관찰 내용은 포함하지 않습니다.'}
              </p>
              {target === 'student' && selectedRecord.students.length ? (
                <select value={selectedStudentId ?? ''} onChange={(event) => handleStudentChange(event.target.value)} className="mt-2 h-11 w-full rounded-[12px] border px-3 text-[13px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}>
                  {selectedRecord.students.map((student) => (
                    <option key={student.studentId} value={student.studentId}>{student.studentName}</option>
                  ))}
                </select>
              ) : null}
            </div>
          ) : null}

          {!selectedRecord ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowRefine((current) => !current)}
                className="inline-flex min-h-9 items-center rounded-[10px] px-3 text-[11px] font-black"
                style={{ background: 'var(--spm-s2)', color: 'var(--spm-t3)', border: '1px solid var(--spm-br2)' }}
              >
                {showRefine ? '다듬기 접기' : '문구 더 다듬기 (선택)'}
              </button>
              {showRefine ? (
                <div className="mt-3 grid gap-3">
                  <div>
                    <p className="mb-1.5 text-[11px] font-black" style={{ color: 'var(--spm-t2)' }}>분위기</p>
                    <SingleChoice options={MOODS} value={mood} onChange={(next) => { setMood(next); markDraftDirty(); }} />
                  </div>
                  <div>
                    <p className="mb-1.5 text-[11px] font-black" style={{ color: 'var(--spm-t2)' }}>반응</p>
                    <SingleChoice options={REACTIONS} value={reaction} onChange={(next) => { setReaction(next); markDraftDirty(); }} />
                  </div>
                  <div>
                    <p className="mb-1.5 text-[11px] font-black" style={{ color: 'var(--spm-t2)' }}>강조</p>
                    <ChipGroup options={FOCUS_SKILLS} selected={focusSkills} onChange={(next) => { setFocusSkills(next); markDraftDirty(); }} />
                  </div>
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-black" style={{ color: 'var(--spm-t2)' }}>한마디</span>
                    <textarea
                      value={note}
                      onChange={(event) => { setNote(event.target.value); markDraftDirty(); }}
                      rows={2}
                      placeholder="선택 사항"
                      className="w-full resize-y rounded-[12px] border px-3 py-2.5 text-[13px] font-semibold leading-6 outline-none"
                      style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
                    />
                  </label>
                </div>
              ) : null}
            </div>
          ) : null}

          {copyStatus === 'success' ? <p className="mt-3 text-[12px] font-bold" style={{ color: 'var(--spm-grn)' }}>복사했습니다. 카톡·문자·메일에 붙여넣으세요.</p> : null}
          {copyStatus === 'error' ? <p className="mt-3 text-[12px] font-bold text-red-600">자동으로 복사하지 못했습니다. 내용을 직접 선택해 복사해 주세요.</p> : null}
          {saveStatus === 'success' ? (
            <div className="mt-3 rounded-[12px] p-3" style={{ background: 'var(--spm-grn-a10)', color: 'var(--spm-grn)' }}>
              <p className="text-[12px] font-bold">보관했습니다. 아래 보관함에서 다시 복사할 수 있습니다.</p>
            </div>
          ) : null}
          {saveStatus === 'error' && saveFeedback ? (
            <div className="mt-3">
              <SaveErrorBanner
                message={saveFeedback.message}
                onRetry={saveFeedback.retryable ? () => void saveOutput() : undefined}
                upgradeHref={saveFeedback.upgradeHref}
                upgradeLabel={saveFeedback.upgradeLabel}
              />
            </div>
          ) : null}

          <textarea
            data-report-output
            value={program ? output : '수업을 선택하면 안내문을 만들 수 있습니다.'}
            onChange={(event) => {
              setGenerated(event.target.value);
              setSaveStatus('idle');
              setSaveFeedback(null);
              setSavedOutputId(null);
              if (program) clearSavedContext(program.id);
            }}
            disabled={!program}
            className="mt-4 min-h-[280px] w-full resize-y rounded-[14px] border p-3.5 text-[14px] font-semibold leading-7 outline-none sm:min-h-[320px] sm:text-[15px] sm:leading-8"
            style={{ background: 'var(--spm-s2)', color: 'var(--spm-t)', borderColor: 'var(--spm-br2)' }}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => replaceDraft(draft)} className="inline-flex min-h-11 items-center gap-2 rounded-[12px] px-3 text-[12px] font-black" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t)', border: '1px solid var(--spm-br2)' }}>
              <FileText size={14} />
              다시 만들기
            </button>
            <button type="button" data-report-action="save" onClick={() => void saveOutput()} disabled={saveStatus === 'saving' || !output.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-[12px] px-3 text-[12px] font-black disabled:opacity-60" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t)', border: '1px solid var(--spm-br2)' }}>
              <Save size={14} />
              {saveStatus === 'saving' ? '보관 중...' : '보관'}
            </button>
            {focused ? (
              <button type="button" onClick={() => setShowExtras((current) => !current)} className="inline-flex min-h-11 items-center rounded-[12px] px-3 text-[12px] font-black" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t3)', border: '1px solid var(--spm-br2)' }}>
                {showExtras ? '접기' : '다른 기록·보관함'}
              </button>
            ) : null}
          </div>
        </section>

        {(showExtras || !focused) ? (
          <section className="mt-4 mb-6 space-y-3 rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            {focused && classRecords.length ? (
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-black" style={{ color: 'var(--spm-t2)' }}>다른 기록</span>
                <select value={selectedRecordId} onChange={(event) => handleRecordSelect(event.target.value)} className="h-11 w-full rounded-[12px] border px-3 text-[13px] font-bold outline-none" style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}>
                  {classRecords.map((record) => (
                    <option key={record.id} value={record.id}>{record.programTitle} · {formatRecordDate(record.date)}</option>
                  ))}
                </select>
              </label>
            ) : null}
            <div>
              <p className="text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>보관함</p>
              <p className="mt-0.5 text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>나중에 다시 복사할 때만 쓰면 됩니다.</p>
              <div className="mt-2 space-y-2">
                {explanationData.status === 'loading' ? (
                  <p className="text-[12px] font-semibold" style={{ color: 'var(--spm-t3)' }}>보관한 안내문을 불러오는 중입니다.</p>
                ) : explanationData.status === 'error' ? (
                  <p className="text-[12px] font-semibold" style={{ color: 'var(--spm-t3)' }}>보관한 안내문을 불러오지 못했습니다.</p>
                ) : explanationData.explanations.length ? explanationData.explanations.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex gap-2">
                    <button type="button" onClick={() => handleSavedExplanationSelect(item)} className="min-w-0 flex-1 rounded-[12px] p-3 text-left" style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)' }}>
                      <strong className="block line-clamp-1 text-[12px]" style={{ color: 'var(--spm-t)' }}>{item.programTitle}</strong>
                      <span className="mt-1 block text-[11px] font-bold" style={{ color: 'var(--spm-t3)' }}>{new Date(item.createdAt).toLocaleDateString('ko-KR')}</span>
                    </button>
                    <button type="button" onClick={() => { void navigator.clipboard.writeText(item.text).then(() => setCopyStatus('success')).catch(() => setCopyStatus('error')); }} className="shrink-0 rounded-[12px] px-3 text-[11px] font-black" style={{ background: 'var(--spm-acc-a12)', color: 'var(--spm-acc)' }}>복사</button>
                  </div>
                )) : (
                  <p className="text-[12px] font-semibold" style={{ color: 'var(--spm-t3)' }}>보관한 안내문이 없습니다.</p>
                )}
              </div>
            </div>
            {hasProgramQuery && program ? (
              <Link href={`/spokedu-master/library/${program.id}`} className="inline-flex min-h-10 items-center gap-2 text-[12px] font-black" style={{ color: 'var(--spm-acc)' }}>
                <BookOpen size={14} />
                전체 수업 자료 보기
              </Link>
            ) : null}
          </section>
        ) : (
          <div className="mb-6 mt-3" />
        )}
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
