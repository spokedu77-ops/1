const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const configuredRef = process.env.SUPABASE_PROJECT_REF?.trim();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const projectRef = configuredRef || (() => {
  if (!supabaseUrl) return '';
  try {
    return new URL(supabaseUrl).hostname.split('.')[0] ?? '';
  } catch {
    return '';
  }
})();

if (!accessToken) {
  throw new Error('SUPABASE_ACCESS_TOKEN is required. Create a personal access token in the Supabase dashboard.');
}
if (!projectRef) {
  throw new Error('SUPABASE_PROJECT_REF or NEXT_PUBLIC_SUPABASE_URL is required.');
}

const endpoint = `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/config/auth`;
const headers = {
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
};
const subject = 'SPOKEDU LAB 인증 코드: {{ .Token }}';
const content = [
  '<h2>SPOKEDU LAB 이메일 인증</h2>',
  '<p>아래 8자리 인증 코드를 로그인 화면에 입력해주세요.</p>',
  '<p style="font-size:32px;font-weight:700;letter-spacing:8px;">{{ .Token }}</p>',
  '<p>요청하지 않았다면 이 메일을 무시해주세요.</p>',
].join('');

const currentResponse = await fetch(endpoint, { headers });
if (!currentResponse.ok) {
  throw new Error(`Unable to read Supabase Auth config (${currentResponse.status}).`);
}
await currentResponse.text();

const updateResponse = await fetch(endpoint, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({
    mailer_subjects_confirmation: subject,
    mailer_templates_confirmation_content: content,
    mailer_subjects_magic_link: subject,
    mailer_templates_magic_link_content: content,
  }),
});
if (!updateResponse.ok) {
  throw new Error(`Unable to update Supabase Auth config (${updateResponse.status}).`);
}

await updateResponse.text();
const verifyResponse = await fetch(endpoint, { headers });
if (!verifyResponse.ok) {
  throw new Error(`Unable to verify Supabase Auth config (${verifyResponse.status}).`);
}
const updated = await verifyResponse.json();
const templateKeys = [
  'mailer_templates_confirmation_content',
  'mailer_templates_magic_link_content',
];
const verified = templateKeys.every((key) => (
  typeof updated[key] === 'string'
  && updated[key].includes('{{ .Token }}')
  && !updated[key].includes('{{ .ConfirmationURL }}')
));
if (!verified) {
  throw new Error('Supabase accepted the update, but the OTP templates could not be verified.');
}

console.log(`Verified 8-digit email OTP templates for Supabase project ${projectRef}.`);
