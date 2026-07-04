export const CODE_LANGUAGE_OPTIONS = [
  { id: 'plain', label: 'Plain Text' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'json', label: 'JSON' },
  { id: 'sql', label: 'SQL' },
  { id: 'bash', label: 'Bash' },
] as const;

export type CodeLanguageId = (typeof CODE_LANGUAGE_OPTIONS)[number]['id'];

const LANGUAGE_ALIASES: Record<string, CodeLanguageId> = {
  plain: 'plain',
  text: 'plain',
  txt: 'plain',
  js: 'javascript',
  javascript: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  typescript: 'typescript',
  tsx: 'typescript',
  py: 'python',
  python: 'python',
  java: 'java',
  html: 'html',
  xml: 'html',
  css: 'css',
  json: 'json',
  sql: 'sql',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
};

export function normalizeCodeLanguage(value: unknown): CodeLanguageId {
  if (typeof value !== 'string' || !value.trim()) return 'plain';
  const key = value.trim().toLowerCase();
  return LANGUAGE_ALIASES[key] ?? 'plain';
}

export function readCodeLanguage(content: Record<string, unknown> | null | undefined): CodeLanguageId {
  return normalizeCodeLanguage(content?.language);
}

export function codeLanguageLabel(language: CodeLanguageId): string {
  return CODE_LANGUAGE_OPTIONS.find((option) => option.id === language)?.label ?? 'Plain Text';
}

export function parseCodeLanguageFromClassName(className: string | null | undefined): CodeLanguageId {
  if (!className) return 'plain';
  const match = className.match(/(?:language-|lang-)([\w-]+)/i);
  if (!match?.[1]) return 'plain';
  return normalizeCodeLanguage(match[1]);
}
