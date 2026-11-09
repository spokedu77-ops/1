import { readFileSync, existsSync, writeFileSync } from 'node:fs';

const source = readFileSync(new URL('../../../app/lib/automation/feedbackCorrectionProposal.ts', import.meta.url), 'utf8')
  .replace(
    /import[\s\S]*?from '@\/app\/lib\/feedbackValidation';\r?\n/,
    "import type { FeedbackFields, FeedbackTextFieldKey } from '../../../../app/lib/feedbackValidation';\nconst FEEDBACK_TEXT_FIELD_KEYS = ['main_activity', 'strengths', 'improvements', 'next_goals', 'condition_notes'] as const;\n",
  );
const runtimePath = new URL('./results/proposal-check.ts', import.meta.url);
writeFileSync(runtimePath, source);
const { assessRevision, buildCorrectionProposal, FEEDBACK_CORRECTION_V2_PROMPT } = await import(runtimePath.href);

const fields = () => ({
  main_activity: '스텝레더 사이드스텝과 스퀘어 터치를 10회 했습니다.',
  strengths: '자세가 안정되었습니다.',
  improvements: '발목 자세가 흔들렸습니다. 다음에도 같은 과제를 반복합니다.',
  next_goals: '다음 수업에는 발목 자세를 유지하는 연습을 하겠습니다.',
  condition_notes: '16:00 시작, 17:00 종료',
});

let passed = 0;
let failed = 0;
function check(name, condition) {
  if (condition) {
    passed += 1;
    console.log('PASS', name);
  } else {
    failed += 1;
    console.log('FAIL', name);
  }
}

check('english', assessRevision('잔발 스텝과 하이피칭을 반복했습니다.', 'The student repeated the step and pitching practice today.')?.includes('영어'));
check('leader', assessRevision(fields().main_activity, '스텝 리더 사이드스텝과 스퀘어 터치를 10회 했습니다.')?.includes('스텝 리더'));
check('square', assessRevision(fields().main_activity, '스텝레더 사이드스텝과 스쿼어 터치를 10회 했습니다.')?.includes('스쿼어'));
check('ankle', assessRevision(fields().improvements, '발목 관절이 흔들렸습니다. 다음에도 같은 과제를 반복합니다.')?.includes('발목 관절'));
check('omission', assessRevision(fields().next_goals, '다음 수업에는 연습을 하겠습니다.')?.includes('빠졌'));
check('time-colon', assessRevision('1600 시작, 1700 종료', '16:00 시작, 17:00 종료') === null);
check('typo-ok', assessRevision('어려움을 겼었습니다.', '어려움을 겪었습니다.') === null);
check('spacing-unchanged-builder', buildCorrectionProposal(fields(), { corrections: [{ key: 'strengths', revised: '자세가  안정되었습니다.', reason: '띄어쓰기' }] }).fields.find((field) => field.key === 'strengths').status === 'unchanged');

const reviewPath = 'ops/local-automation/feedback-learning/results/ab-review-local.json';
const prior = { checked: 0, blocked: 0, missed: [] };
if (existsSync(reviewPath)) {
  const saved = JSON.parse(readFileSync(reviewPath, 'utf8'));
  const watched = new Set(['1c8ea45915906f48', '27d8dc111ebf0983', '274728d3ec8bfdf6', '2f99425d4945052a', '3c96908788d1df9c', '1ed731af90200e64', '328c5f54bceb9a70']);
  for (const item of saved.cases ?? []) {
    if (!watched.has(item.caseId)) continue;
    for (const side of ['baseline', 'candidate']) {
      const proposal = buildCorrectionProposal(item.source, item[side]);
      const blocked = proposal.fields.filter((field) => field.status === 'blocked').map((field) => field.key + ':' + field.blockReason);
      prior.checked += 1;
      if (blocked.length) prior.blocked += 1;
      else prior.missed.push(item.caseId + ':' + side);
    }
  }
}
console.log('PRIOR_BASELINE_GATED', JSON.stringify(prior));

const liveCases = [
  {
    name: 'typo',
    source: { ...fields(), improvements: '불규칙 바운드에 어려움을 겼었습니다. 다음에도 같은 과제를 반복합니다.' },
  },
  {
    name: 'clean',
    source: fields(),
  },
];
let livePass = 0;
let liveFail = 0;
for (const item of liveCases) {
  const response = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen3.5-9b',
      temperature: 0.1,
      messages: [
        { role: 'system', content: FEEDBACK_CORRECTION_V2_PROMPT },
        { role: 'user', content: JSON.stringify({ source_feedback: item.source }) },
      ],
    }),
  });
  const payload = await response.json();
  const text = String(payload.choices?.[0]?.message?.content ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { parsed = null; }
  const proposal = buildCorrectionProposal(item.source, parsed);
  const reasons = [
    ...proposal.fields.filter((field) => field.blockReason).map((field) => field.blockReason),
    ...proposal.educationalNotes.filter((note) => note.blockReason).map((note) => note.blockReason),
  ];
  const shape = parsed && typeof parsed === 'object' && (Array.isArray(parsed.corrections) || Array.isArray(parsed.notes));
  const acceptedUnsafe = proposal.fields.some((field) => field.status === 'suggestion' && assessRevision(field.source, field.revised));
  if (response.ok && shape && !acceptedUnsafe) {
    livePass += 1;
    console.log('LIVE_PASS', item.name, proposal.fields.map((field) => field.key + '=' + field.status).join(','));
  } else {
    liveFail += 1;
    console.log('LIVE_FAIL', item.name, 'http', response.status, 'shape', Boolean(shape), 'reasons', reasons.join(' | '));
  }
}
console.log(JSON.stringify({ gatePassed: passed, gateFailed: failed, livePass, liveFail, prior }));
if (failed || liveFail) process.exitCode = 1;
