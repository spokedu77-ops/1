import { readFileSync } from 'node:fs';
const data = JSON.parse(readFileSync('ops/local-automation/feedback-learning/results/ab-review-local.json', 'utf8'));
const FIELDS = ['main_activity', 'strengths', 'improvements', 'next_goals', 'condition_notes'];
const nums = s => (String(s).match(/SPOMOVE[\w-]*|\d+(?:[.:]\d+)?(?:%|회|초|분|세트|m)?/g) || []).join('|');
let i = 0;
for (const c of data.cases) {
  i += 1;
  console.log('\n## CASE', i, c.caseId);
  for (const k of FIELDS) {
    const s = c.source?.[k] ?? '';
    const b = c.baseline?.[k] ?? '';
    const d = c.candidate?.[k] ?? '';
    const sameB = s.trim() === String(b).trim();
    const sameC = s.trim() === String(d).trim();
    if (sameB && sameC) continue;
    console.log('FIELD', k);
    console.log('SRC', s.replace(/\s+/g, ' '));
    if (!sameB) console.log('BASE', String(b).replace(/\s+/g, ' '));
    if (!sameC) console.log('CAND', String(d).replace(/\s+/g, ' '));
    if (nums(s) !== nums(b)) console.log('NUM_BASE_DIFF', nums(s), '=>', nums(b));
    if (nums(s) !== nums(d)) console.log('NUM_CAND_DIFF', nums(s), '=>', nums(d));
  }
}
