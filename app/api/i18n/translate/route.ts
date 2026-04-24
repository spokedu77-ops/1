import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { devLogger } from '@/app/lib/logging/devLogger';
import { allowI18nTranslateRequest } from '@/app/lib/server/i18nTranslateRateLimit';
import type { UiLocale } from '@/app/lib/i18n/constants';

export const maxDuration = 25;

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY ?? '';

const bodySchema = z.object({
  sourceText: z.string().min(1).max(500),
  targetLocale: z.enum(['en', 'ja', 'es', 'zh']),
});

const LOCALE_INSTRUCTION: Record<Exclude<UiLocale, 'ko'>, string> = {
  en: 'English',
  ja: 'Japanese',
  es: 'Spanish',
  zh: 'Simplified Chinese',
};

function buildPrompt(sourceText: string, target: Exclude<UiLocale, 'ko'>): string {
  const lang = LOCALE_INSTRUCTION[target];
  return `You translate UI strings for the children's sports education product SPOKEDU.

Rules:
- Translate the UI string below into ${lang}. The input may be Korean, English, or mixed.
- Output ONLY the translated string. No quotes, no markdown, no JSON, no explanations.
- Preserve any line breaks from the input.
- Keep the brand name "SPOKEDU" unchanged.
- Do not output HTML tags.

UI string:
${sourceText}`;
}

function sanitizeModelOutput(raw: string): string {
  return raw
    .replace(/^```(?:[\w]*)?\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim();
}

export async function POST(req: NextRequest) {
  if (!allowI18nTranslateRequest(req)) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  if (!GEMINI_API_KEY) {
    // 로컬/개발 환경에서는 번역 키가 없을 수 있음.
    // 503을 내면 클라이언트가 같은 문장을 반복 호출하며 로그가 폭주할 수 있어, 원문을 그대로 반환한다.
    if (process.env.NODE_ENV !== 'production') {
      const body = await req.json().catch(() => null);
      const sourceText = typeof body?.sourceText === 'string' ? body.sourceText : '';
      return NextResponse.json({ ok: true, text: sourceText });
    }
    return NextResponse.json({ ok: false, error: 'translate_unconfigured' }, { status: 503 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'validation_error' }, { status: 400 });
  }

  const { sourceText, targetLocale } = parsed.data;

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = buildPrompt(sourceText, targetLocale);
    const result = await model.generateContent(prompt);
    const text = sanitizeModelOutput(result.response.text());
    if (!text) {
      return NextResponse.json({ ok: false, error: 'empty_translation' }, { status: 502 });
    }
    if (text.length > 800) {
      return NextResponse.json({ ok: false, error: 'translation_too_long' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, text });
  } catch (e) {
    devLogger.error('[i18n/translate]', e);
    const message = e instanceof Error ? e.message : 'translate_failed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
