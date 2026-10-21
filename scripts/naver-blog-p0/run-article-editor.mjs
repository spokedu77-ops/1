#!/usr/bin/env node
/**
 * 단일 명령: 네이버 신규 글 입력·서식·검증·(선택) 미리보기 캡처. 저장·발행 없음.
 *
 *   node scripts/naver-blog-p0/run-article-editor.mjs --article-id=9fad3d9e6f847f36 --mode=preview
 *   node scripts/naver-blog-p0/run-article-editor.mjs --mode=n1-probe
 *   NAVER_INPUT_STRATEGY=n1 NAVER_NEW_DOCUMENT=1 node ... --mode=preview
 *   node scripts/naver-blog-p0/run-article-editor.mjs --mode=auth-setup
 *   node scripts/naver-blog-p0/run-article-editor.mjs --mode=record-subtitle
 */
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { join } from 'node:path';

import {
  captureDevicePreviews,
  renderArticleBodyBlocks,
  renderArticleBodyBlocksN1,
  renderArticleTitle,
  renderN1ProbeBlocks,
  verifyArticleDom,
  writeArticleEditorRunReport,
} from './article-editor-engine.mjs';
import {
  N1_PROBE_BLOCKS,
  STYLE_SEL,
  auditRecordSubtitleReport,
  captureExecutionTargetAlignment,
  captureRecordSessionBinding,
  captureSubtitleEditorSnapshot,
  diagnoseInputVsDocumentCommit,
  installSubtitleObservationHooks,
  prepareToolbarForInsert,
  readEditorFullDocumentDom,
  summarizeProbeTextLocations,
  verifyN1ProbeDocument,
  verifyRecordSessionBinding,
} from './naver-new-style-runner.mjs';
import {
  connectNaverBrowser,
  DEFAULT_NAVER_PROFILE_DIR,
  openFreshWriteEditorPage,
  openNewWriteEditorTab,
  openReusableWriteEditorPage,
} from './naver-browser-connect.mjs';
import { WRITE_URL } from './naver-editor-entry.mjs';
import { loadStyleBlockPlan } from './naver-new-style-runner.mjs';

const articleId =
  process.argv.find((a) => a.startsWith('--article-id='))?.split('=')[1] ||
  process.env.NAVER_FINAL_ARTICLE_ID ||
  '9fad3d9e6f847f36';
const mode = process.argv.find((a) => a.startsWith('--mode='))?.split('=')[1] || 'preview';
const inputStrategy = process.env.NAVER_INPUT_STRATEGY === 'n1' ? 'n1' : 'legacy';

/** @type {Record<string, number>} */
const timingCumulative = {};
/** @type {Record<string, number>} */
const timingSegment = {};
const t0 = performance.now();
let tPrev = t0;

function mark(name) {
  const now = performance.now();
  timingCumulative[name] = Math.round(now - t0);
  timingSegment[name] = Math.round(now - tPrev);
  tPrev = now;
}

/**
 * @param {object} row
 */
function printCompletionTable(row) {
  console.log('\n| 구분 | 결과 |');
  console.log('|---|---|');
  for (const [k, v] of Object.entries(row)) {
    console.log(`| ${k} | ${v} |`);
  }
}

function isBlankBrowserUrl(url) {
  return !url || url === 'about:blank' || url.startsWith('chrome://') || url.startsWith('edge://');
}

/**
 * auth-setup 실패 처리 (진단 1회, 프로필 유지).
 * @param {object} p
 */
async function failAuthSetup(p) {
  mark('total');
  await writeArticleEditorRunReport({
    ok: false,
    mode: 'auth-setup',
    ...p.payload,
    timingMs: { cumulative: timingCumulative, segment: timingSegment },
  });
  printCompletionTable({
    '인증 프로필 재사용': 'FAIL',
    '편집기 진입': 'FAIL',
    '오류 코드': p.entryCode,
    '전체 소요 시간': `${timingCumulative.total ?? Math.round(performance.now() - t0)}ms`,
    '저장·발행': '0건',
  });
  process.env.NAVER_KEEP_BROWSER = '0';
  await p.page?.close().catch(() => {});
  await p.conn?.disconnect().catch(() => {});
  process.exit(1);
}

async function runAuthSetup() {
  mark('processStart');
  /** 로그인 완료 전까지 브라우저·프로필 유지 (CDP/영속 공통) */
  process.env.NAVER_KEEP_BROWSER = '1';

  let conn;
  try {
    conn = await connectNaverBrowser();
  } catch (e) {
    if (e.code === 'PROFILE_LOCKED') {
      printCompletionTable({
        '인증 프로필 재사용': 'FAIL',
        '편집기 진입': 'FAIL',
        '오류 코드': 'PROFILE_LOCKED',
        '전체 소요 시간': `${Math.round(performance.now() - t0)}ms`,
        '저장·발행': '0건',
      });
      process.exit(2);
    }
    throw e;
  }
  mark('profileConnect');

  const livePages = conn.context.pages().filter((p) => !p.isClosed());
  const page = livePages[0] ?? (await conn.context.newPage());
  const startUrl = page.url();

  /** 로그인 대기 중 자동 이동·새로고침 금지 — 빈 탭일 때만 초기 1회 goto */
  if (isBlankBrowserUrl(startUrl)) {
    console.log('[auth-setup] 초기 1회 이동:', WRITE_URL);
    await page.goto(WRITE_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  } else {
    console.log('[auth-setup] 기존 탭 유지 (대기 중 goto/reload 없음):', startUrl.split('?')[0]);
  }

  console.log('\n[auth-setup] 전용 프로필:', DEFAULT_NAVER_PROFILE_DIR);
  console.log('[auth-setup] 로그인·2FA 동안 이 프로세스는 페이지를 다시 열거나 새로고침하지 않습니다.');
  console.log('[auth-setup] 로그인을 마친 뒤 Enter를 누르면 그때만 상태를 확인합니다.');
  console.log('[auth-setup] 비밀번호·쿠키는 기록하지 않습니다.\n');

  const rl = createInterface({ input, output });
  await rl.question('로그인 완료 후 Enter… ');
  rl.close();
  mark('manualAuthSetup');

  const { classifyEntryState, waitForWriteEditorReady, writeEntryDiagnostics } = await import(
    './naver-editor-entry.mjs'
  );
  const { dismissRestoreDraftDialog } = await import('./naver-new-write-runner.mjs');

  /** Enter 이후: URL·DOM 읽기 전용 관찰 (로그인 도중에는 실행되지 않음) */
  let state = await classifyEntryState(page);

  if (state.code === 'AUTH_REQUIRED') {
    const diag = await writeEntryDiagnostics(page, 'auth-setup-still-login');
    await failAuthSetup({
      conn,
      page,
      entryCode: 'AUTH_REQUIRED',
      payload: { entryCode: 'AUTH_REQUIRED', diagnostics: diag, observeOnly: true },
    });
  }

  /** 사용자 로그인 확인 후, 편집기가 아직이면 글쓰기 URL로 최대 1회만 이동 */
  if (state.code !== 'EDITOR_READY') {
    console.log('[auth-setup] Enter 확인 — PostWriteForm 진입을 위해 1회 이동합니다.');
    await page.goto(WRITE_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
    state = await classifyEntryState(page);
  }

  if (state.code === 'RESTORE_DIALOG') {
    await dismissRestoreDraftDialog(page);
    state = await classifyEntryState(page);
  }

  if (state.code === 'AUTH_REQUIRED') {
    const diag = await writeEntryDiagnostics(page, 'auth-setup-after-goto-login');
    await failAuthSetup({
      conn,
      page,
      entryCode: 'AUTH_REQUIRED',
      payload: { entryCode: 'AUTH_REQUIRED', diagnostics: diag },
    });
  }

  if (state.code !== 'EDITOR_READY') {
    try {
      await waitForWriteEditorReady(page);
    } catch (e) {
      await failAuthSetup({
        conn,
        page,
        entryCode: e.code || 'SELECTOR_CHANGED',
        payload: { entryCode: e.code, diagnostics: e.diagnostics, error: e.message },
      });
    }
  }

  await page.close().catch(() => {});
  mark('editorEntryVerified');

  /** 프로필/CDP 세션 저장 후 동일 연결 경로로 1회 재접속 검증 (대기 중이 아닌 종료 단계) */
  process.env.NAVER_KEEP_BROWSER = '0';
  await conn.disconnect();
  mark('profilePersisted');

  conn = await connectNaverBrowser();
  mark('sessionReuseConnect');
  const verifyPage = await conn.context.newPage();
  await verifyPage.goto(WRITE_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const reuseState = await classifyEntryState(verifyPage);
  let sessionPass = reuseState.code === 'EDITOR_READY';
  if (!sessionPass && reuseState.code !== 'AUTH_REQUIRED') {
    try {
      await waitForWriteEditorReady(verifyPage);
      sessionPass = true;
    } catch {
      sessionPass = false;
    }
  }
  const sessionCheck = {
    pass: sessionPass,
    code: reuseState.code,
    url: verifyPage.url(),
  };
  await verifyPage.close().catch(() => {});
  mark('sessionReuseCheck');

  await conn.disconnect();
  mark('total');

  const pass = sessionCheck.pass === true;
  const out = {
    ok: pass,
    mode: 'auth-setup',
    profileDir: DEFAULT_NAVER_PROFILE_DIR,
    browserMode: conn.mode,
    entryCode: 'EDITOR_READY',
    sessionReuse: sessionCheck,
    timingMs: { cumulative: timingCumulative, segment: timingSegment },
    note: 'manualAuthSetup 구간은 1회 초기 설정 비용. 로그인 대기 중 goto/reload/폴링 없음.',
    flickerRootCauseFixed:
      '이전: auth-setup 폴링 루프가 navigateToWriteEditor→page.goto(WRITE_URL)를 2초마다 반복',
  };
  const reportPath = await writeArticleEditorRunReport(out);
  console.log(JSON.stringify({ ...out, reportPath }, null, 2));

  printCompletionTable({
    '인증 프로필 재사용': pass ? 'PASS' : 'FAIL',
    '편집기 진입': sessionCheck.pass ? 'PASS' : 'FAIL',
    '제목·본문': '—',
    '소제목 Bold': '—',
    '시각 검증': '—',
    '전체 소요 시간': `${timingCumulative.total}ms (수동 로그인 별도)`,
    '저장·발행': '0건',
  });

  process.exitCode = pass ? 0 : 1;
}

async function waitForEnterOrMs(ms) {
  const rl = createInterface({ input, output });
  try {
    await Promise.race([
      rl.question('[record-subtitle] 수동 입력 완료 후 Enter… '),
      new Promise((resolve) => {
        setTimeout(() => resolve('__timeout__'), ms);
      }),
    ]);
  } finally {
    rl.close();
  }
}

async function runRecordSubtitlePipeline() {
  mark('processStart');
  const conn = await connectNaverBrowser();
  mark('profileConnect');

  const recordMaxWaitMs = Number(process.env.NAVER_RECORD_MAX_WAIT_MS || 60_000);

  let page;
  try {
    const tabsBefore = conn.context
      .pages()
      .filter((p) => !p.isClosed())
      .map((p) => p.url().split('#')[0]);

    const opened = await openNewWriteEditorTab(conn.context);
    page = opened.page;
    mark('editorEntry');

    await page.bringToFront();
    const executionTargetAfterFocus = await captureExecutionTargetAlignment(page);

    await installSubtitleObservationHooks(page);
    const sessionBindingStart = await captureRecordSessionBinding(page);
    const snapBlank = await captureSubtitleEditorSnapshot(page, 'blank_editor');
    const fullDomBlank = await readEditorFullDocumentDom(page);

    await page.locator(STYLE_SEL.bodyParagraph).first().click({ timeout: 15000 });
    await prepareToolbarForInsert(page, 'body', 0, {});
    await page.keyboard.insertText(N1_PROBE_BLOCKS[0].text);
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    const snapBeforeManual = await captureSubtitleEditorSnapshot(page, 'after_A_enter_before_subtitle');
    const fullDomBeforeManual = await readEditorFullDocumentDom(page);
    const textLocationsBeforeManual = summarizeProbeTextLocations(fullDomBeforeManual);

    if (!executionTargetAfterFocus.aligned) {
      throw new Error(
        `EXECUTION_TARGET_MISMATCH: playwright=${executionTargetAfterFocus.playwrightPageUrl} dom=${executionTargetAfterFocus.domReadUrl}`,
      );
    }
    if (!executionTargetAfterFocus.documentHasFocus) {
      console.warn(
        '[record-subtitle] document.hasFocus()=false — 테스트 탭을 클릭해 포커스를 맞춘 뒤 수동 입력하세요.',
      );
    }

    console.log(
      [
        '',
        `[record-subtitle] 실행 대상: ${executionTargetAfterFocus.playwrightPageUrl}`,
        `[record-subtitle] canvasId=${executionTargetAfterFocus.canvasId} hasFocus=${executionTargetAfterFocus.documentHasFocus}`,
        '[record-subtitle] 블록 A까지 자동 입력 완료. Enter로 빈 줄 생성됨.',
        '동일 탭에서 **수동으로만** 다음을 수행하세요 (저장·발행 금지):',
        '  1) 글 유형 → 소제목 선택',
        `  2) 소제목 B 입력: ${N1_PROBE_BLOCKS[1].text}`,
        '  3) Enter 후 글 유형 → 본문(텍스트)',
        `  4) 본문 C 입력: ${N1_PROBE_BLOCKS[2].text}`,
        `완료 후 Enter → 즉시 검사·종료 (최대 ${Math.round(recordMaxWaitMs / 1000)}초, NAVER_RECORD_MAX_WAIT_MS).`,
        '',
      ].join('\n'),
    );

    await waitForEnterOrMs(recordMaxWaitMs);

    const snapAfter = await captureSubtitleEditorSnapshot(page, 'after_manual_window');
    const executionTargetFinal = await captureExecutionTargetAlignment(page);
    const fullDomAfter = await readEditorFullDocumentDom(page);
    const textLocationsAfter = summarizeProbeTextLocations(fullDomAfter);
    const verify = await verifyN1ProbeDocument(page);
    const sessionBindingEnd = await verifyRecordSessionBinding(page, sessionBindingStart);
    const documentCommit = diagnoseInputVsDocumentCommit(snapBeforeManual, snapAfter, {
      expectedTexts: N1_PROBE_BLOCKS.map((b) => b.text),
    });
    mark('recordVerify');
    mark('total');

    const tabsAfter = conn.context
      .pages()
      .filter((p) => !p.isClosed())
      .map((p) => p.url().split('#')[0]);

    const out = {
      ok: verify.pass,
      mode: 'record-subtitle',
      manualSubtitleSuccess: verify.headingModuleOk,
      executionTarget: {
        afterBringToFront: executionTargetAfterFocus,
        final: executionTargetFinal,
        tabsBefore,
        tabsAfter,
        testTabUrl: page.url().split('#')[0],
      },
      fullDom: {
        blank: {
          sections: fullDomBlank.sections.length,
          occurrences: fullDomBlank.allOccurrences.length,
          textLocations: summarizeProbeTextLocations(fullDomBlank),
        },
        beforeManual: {
          textLocations: textLocationsBeforeManual,
          fingerprint: fullDomBeforeManual.fingerprint,
        },
        afterManual: {
          textLocations: textLocationsAfter,
          fingerprint: fullDomAfter.fingerprint,
          sectionTitleModuleCount: fullDomAfter.sectionTitleModuleCount,
          allOccurrences: fullDomAfter.allOccurrences,
        },
      },
      verify,
      sessionBinding: {
        start: sessionBindingStart,
        end: sessionBindingEnd,
      },
      documentCommit,
      audit: auditRecordSubtitleReport({
        mode: 'record-subtitle',
        verify,
        snapshots: { after: snapAfter },
        pollDuringWindow: [],
      }),
      snapshots: {
        blank: snapBlank,
        beforeManual: snapBeforeManual,
        after: snapAfter,
      },
      timingMs: { cumulative: timingCumulative, segment: timingSegment },
      saveDraftExecuted: false,
      publishExecuted: false,
    };
    const reportPath = await writeArticleEditorRunReport(out);
    console.log(JSON.stringify({ ...out, reportPath }, null, 2));
    printCompletionTable({
      '실행 대상 일치(domReadAligned)': executionTargetFinal.domReadAligned ? 'PASS' : 'FAIL',
      'document.hasFocus(종료)': executionTargetFinal.documentHasFocus ? 'PASS' : 'WARN',
      '수동 소제목(sectionTitle)': verify.headingModuleOk ? 'PASS' : 'FAIL',
      '3블록 텍스트': verify.textOrderOk ? 'PASS' : 'FAIL',
      '본문 C 복귀': verify.bodyRestoreOk ? 'PASS' : 'FAIL',
      '전체 PASS': verify.pass ? 'PASS' : 'FAIL',
      '전체 소요 시간': `${timingCumulative.total}ms`,
      '저장·발행': '0건',
    });
    process.exitCode = verify.pass ? 0 : 1;
  } finally {
    if (page) await page.close().catch(() => {});
    await conn.disconnect();
  }
}

async function runN1ProbePipeline() {
  mark('processStart');
  const conn = await connectNaverBrowser();
  mark('profileConnect');

  let page;
  try {
    const opened = await openNewWriteEditorTab(conn.context);
    page = opened.page;
    mark('editorEntry');

    await page.locator('.se-section-text .se-text-paragraph').first().click({ force: true });
    await page.waitForTimeout(200);

    const probeTimings = await renderN1ProbeBlocks(page);
    mark('n1ProbeInput');

    const verify = await verifyN1ProbeDocument(page);
    mark('n1ProbeVerify');
    mark('total');

    const out = {
      ok: verify.pass,
      mode: 'n1-probe',
      phase: 'N1_THREE_BLOCK',
      browserMode: conn.mode,
      verify,
      probeTimings,
      timingMs: { cumulative: timingCumulative, segment: timingSegment },
      saveDraftExecuted: false,
      publishExecuted: false,
    };
    const reportPath = await writeArticleEditorRunReport(out);
    console.log(JSON.stringify({ ...out, reportPath }, null, 2));
    printCompletionTable({
      'N1 3블록': verify.pass ? 'PASS' : 'FAIL',
      '소제목 module': verify.headingModuleOk ? 'sectionTitle' : 'FAIL',
      '본문 복귀': verify.bodyRestoreOk ? 'PASS' : 'FAIL',
      '전체 소요 시간': `${timingCumulative.total}ms`,
      '저장·발행': '0건',
    });
    process.exitCode = verify.pass ? 0 : 1;
  } finally {
    if (page) await page.close().catch(() => {});
    await conn.disconnect();
  }
}

async function runPreviewPipeline() {
  mark('processStart');

  const plan = await loadStyleBlockPlan(articleId);
  mark('planLoadedInMemory');

  const conn = await connectNaverBrowser();
  mark('profileConnect');

  let page;
  let opened;
  try {
    if (inputStrategy === 'n1' && process.env.NAVER_NEW_DOCUMENT === '1') {
      opened = await openNewWriteEditorTab(conn.context);
    } else {
      const preferReuse =
        conn.mode === 'cdp' || process.env.NAVER_REUSE_WRITEFORM_TAB === '1';
      opened = preferReuse
        ? await openReusableWriteEditorPage(conn.context, plan)
        : await openFreshWriteEditorPage(conn.context);
    }
    page = opened.page;
    mark('editorEntry');
    if (opened.reusedManuscript) {
      console.log('[preview] 기존 PostWriteForm 탭 재사용 (19/19 원고 일치)');
    }
    if (opened.newTab) {
      console.log('[preview] 신규 PostWriteForm 탭 (N1 FINAL)');
    }

    await renderArticleTitle(page, plan);
    mark('titleInput');

    const bodyResult =
      inputStrategy === 'n1'
        ? await renderArticleBodyBlocksN1(page, plan)
        : await renderArticleBodyBlocks(page, plan);
    mark('bodyBlocksInput');

    const verify = await verifyArticleDom(page, plan);
    mark('domVerify');

    /** @type {Record<string, unknown>} */
    let previews = null;
    let visualVerdict = verify.pass ? 'PASS' : 'PARTIAL';
    if (mode === 'preview') {
      const shotDir = join(process.cwd(), 'reports');
      previews = await captureDevicePreviews(page, shotDir);
      mark('screenshot');
      if (!verify.pass) visualVerdict = 'PARTIAL';
    }

    mark('total');

    const paraOk =
      inputStrategy === 'n1'
        ? verify.logicalBlockCount === verify.expectedLogicalBlocks
        : verify.paragraphCount === verify.expectedParagraphCount;
    const headingLabel =
      inputStrategy === 'n1'
        ? verify.fullBoldHeadings
        : verify.fullBoldHeadings ?? '—';

    const out = {
      ok: verify.pass,
      articleId,
      mode,
      inputStrategy,
      browserMode: conn.mode,
      sourceSha256: plan.sourceSha256,
      quality: {
        paragraphs:
          inputStrategy === 'n1'
            ? `${verify.logicalBlockCount}/${verify.expectedLogicalBlocks}`
            : `${verify.paragraphCount}/${verify.expectedParagraphCount}`,
        headingN1: headingLabel,
        stylePass: verify.styleReport?.pass ?? verify.bodyFsOk,
      },
      timingMs: { cumulative: timingCumulative, segment: timingSegment },
      bodyBlockTimings: bodyResult?.blockTimings,
      bodyInputSkipped: bodyResult?.skipped === true,
      reusedManuscriptTab: opened.reusedManuscript === true,
      verify,
      previews,
      saveDraftExecuted: false,
      publishExecuted: false,
    };

    const reportPath = await writeArticleEditorRunReport(out);
    console.log(JSON.stringify({ ...out, reportPath }, null, 2));

    printCompletionTable({
      '인증 프로필 재사용': 'PASS',
      '편집기 진입': 'PASS',
      '제목·본문': paraOk ? '19/19' : `${verify.paragraphCount}/19`,
      '소제목(N1)': headingLabel,
      '시각 검증': visualVerdict,
      '전체 소요 시간': `${timingCumulative.total}ms`,
      '저장·발행': '0건',
    });

    process.exitCode = verify.pass ? 0 : 1;
  } finally {
    const keepPage = conn.mode === 'cdp' || process.env.NAVER_KEEP_PAGE === '1';
    if (page && !keepPage) await page.close().catch(() => {});
    await conn.disconnect();
  }
}

async function main() {
  if (mode === 'auth-setup') {
    await runAuthSetup();
    return;
  }
  if (mode === 'n1-probe') {
    await runN1ProbePipeline();
    return;
  }
  if (mode === 'record-subtitle') {
    await runRecordSubtitlePipeline();
    return;
  }
  await runPreviewPipeline();
}

main().catch(async (e) => {
  mark('total');
  const diag = e.diagnostics;
  const payload = {
    ok: false,
    error: e.message,
    code: e.code || 'RUNNER_CRASH',
    blockIndex: e.blockIndex,
    actual: e.actual,
    expected: e.expected,
    structure: e.structure,
    url: e.url || diag?.state?.url,
    diagnostics: diag
      ? { jsonPath: diag.jsonPath, pngPath: diag.pngPath, stateCode: diag.state?.code }
      : undefined,
    timingMs: { cumulative: timingCumulative, segment: timingSegment },
  };
  await writeArticleEditorRunReport(payload).catch(() => {});
  console.error(JSON.stringify(payload, null, 2));

  printCompletionTable({
    '인증 프로필 재사용': e.code === 'AUTH_REQUIRED' ? 'FAIL' : '?',
    '편집기 진입': 'FAIL',
    '오류 코드': e.code || 'RUNNER_CRASH',
    '전체 소요 시간': `${timingCumulative.total ?? Math.round(performance.now() - t0)}ms`,
    '저장·발행': '0건',
  });

  process.exit(1);
});
