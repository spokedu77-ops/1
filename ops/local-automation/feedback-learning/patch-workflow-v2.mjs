import { readFileSync, writeFileSync } from 'node:fs';

const path = 'ops/local-automation/workflows/spokedu-feedback-correction.json';
const workflow = JSON.parse(readFileSync(path, 'utf8'));
const prompt = [
  '너는 SPOKEDU 아동 체육 피드백의 교정 제안자다. 원문을 대신 작성하지 않는다.',
  '고칠 필요가 있는 항목만 corrections에 넣는다. 맞춤법, 띄어쓰기, 조사, 비문만 수정한다.',
  'revised는 그 항목의 전체 문장이다. 활동명, 운동기술 명칭, SPOMOVE 이름, 횟수, 시간, 거리, 기록, 실제 수행, 개선점, 다음 지도 계획, 특이사항과 안전 기록은 삭제하거나 다른 뜻으로 바꾸지 않는다.',
  '영어 번역을 하지 않는다. 스텝레더를 스텝 리더로, 스퀘어를 스쿼어로, 발목 자세를 발목 관절로 바꾸지 않는다.',
  '교육적 의견은 notes에만 쓴다. notes는 원문 문장을 바꾸지 않으며, 원문에 없는 활동, 횟수, 수행을 만들지 않는다.',
  'JSON 객체만 반환한다. 형식은 {\\"corrections\\":[{\\"key\\":\\"improvements\\",\\"revised\\":\\"...\\",\\"reason\\":\\"...\\"}],\\"notes\\":[{\\"key\\":\\"next_goals\\",\\"text\\":\\"...\\"}]} 이다.',
  'key는 main_activity, strengths, improvements, next_goals, condition_notes만 허용한다.',
].join('\\n');

const build = workflow.nodes.find((node) => node.name === 'Build LLM request');
const oldPrompt = 'Correct Korean teacher feedback field-by-field. For EACH key in source_feedback, fix spelling/grammar only for THAT field. Do not swap or copy content between fields. Do not invent facts, scores, or behaviors. Keep SPOMOVE literals unchanged. Return JSON with EXACTLY keys: main_activity, strengths, improvements, next_goals, condition_notes (strings only). No nested objects or extra keys.';
if (!build.parameters.jsCode.includes(oldPrompt)) {
  throw new Error('baseline prompt not found');
}
build.parameters.jsCode = build.parameters.jsCode.replace(oldPrompt, prompt);

const parse = workflow.nodes.find((node) => node.name === 'Parse correction JSON');
const needle = "if ('feedback_fields' in parsed) throw new Error('nested_feedback_fields');";
const insert = `${needle}
  if (Array.isArray(parsed.corrections) || Array.isArray(parsed.notes)) {
    return [{ json: { job_id: job.job_id, parseOk: true, correctionDraft: { corrections: Array.isArray(parsed.corrections) ? parsed.corrections : [], notes: Array.isArray(parsed.notes) ? parsed.notes : [] } } }];
  }`;
if (!parse.parameters.jsCode.includes(needle)) throw new Error('parse needle missing');
parse.parameters.jsCode = parse.parameters.jsCode.replace(needle, insert);
writeFileSync(path, JSON.stringify(workflow, null, 2) + '\n');
console.log('workflow_v2_prompt_patched_not_imported');
