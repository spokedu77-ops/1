#!/usr/bin/env node
/**
 * Offline SPOKEDU editorial proof. No browser, network, Naver save or publish.
 * Validates the ORIGINAL FINAL SHA, 19 text blocks, 3 headings. Copies only approved photos.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, copyFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FINAL_EXPECTED_SHA256, finalMarkdownPath, finalNaverInputJsonPath, parseArticleForNaver, sha256Text,
} from '../naver-article-pipeline.mjs';
import { loadStyleBlockPlan } from '../naver-new-style-runner.mjs';
import { compileLayout, renderEditorialHtml, validatePhotoMeta, compact } from './layout.mjs';

const ARTICLE_ID = process.argv.find(x => x.startsWith('--article-id='))?.slice(13) || '9fad3d9e6f847f36';
const PHOTO_MANIFEST = process.argv.find(x => x.startsWith('--photos='))?.slice(9) || '';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const DEST = join(ROOT, 'reports', 'naver-new', 'editorial', ARTICLE_ID);
const EXAMPLE_MANIFEST = join(dirname(fileURLToPath(import.meta.url)), 'photos.example.json');
const report = { articleId: ARTICLE_ID, result: 'NOT_RUN', buildTime: new Date().toISOString(),
  saveDraftExecuted:false, publishExecuted:false, uploadExecuted:false, imageOptimizationRequests:0 };
const output = (...parts) => join(DEST, ...parts);

async function validateImageFile(path) {
  const data = await readFile(path);
  const type = extname(path).toLowerCase();
  const jpg = data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  const png = data.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a','hex'));
  const webp = data.toString('ascii',0,4) === 'RIFF' && data.toString('ascii',8,12) === 'WEBP';
  if (!((['.jpg','.jpeg'].includes(type) && jpg) || (type === '.png' && png) || (type === '.webp' && webp))) {
    throw new Error(`BAD_IMAGE_SIGNATURE:${basename(path)}`);
  }
  if (data.length < 1_000 || data.length > 12 * 1024 * 1024) throw new Error(`IMAGE_SIZE_INVALID:${basename(path)}`);
  return { hash: createHash('sha256').update(data).digest('hex'), size: data.length };
}

try {
  if (!/^[a-f0-9]{16}$/i.test(ARTICLE_ID)) throw new Error('INVALID_ARTICLE_ID');
  // Use the proven ORIGINAL validation, not a new weaker word-count check.
  const verified = await loadStyleBlockPlan(ARTICLE_ID);
  const pkg = JSON.parse(await readFile(finalNaverInputJsonPath(ARTICLE_ID),'utf8'));
  const md = (await readFile(pkg.source || finalMarkdownPath(ARTICLE_ID),'utf8')).replace(/\r\n/g,'\n');
  if (sha256Text(md) !== FINAL_EXPECTED_SHA256 || pkg.source_sha256 !== FINAL_EXPECTED_SHA256) throw new Error('SOURCE_HASH_MISMATCH');
  const parsed = parseArticleForNaver(md);
  const headingIndexes = parsed.blocks.flatMap((b,i) => b.type === 'heading' ? [i] : []);
  const source = {title:verified.title, blocks:parsed.blocks, paragraphs:verified.paragraphs, headingIndexes};
  if (!parsed.blocks.every((b,i) => compact(b.text) === compact(verified.paragraphs[i]))) throw new Error('SOURCE_TEXT_MISMATCH');
  const inputPhotos = PHOTO_MANIFEST ? JSON.parse(await readFile(resolve(PHOTO_MANIFEST),'utf8')) : {photos:[]};
  if (inputPhotos.articleId && inputPhotos.articleId !== ARTICLE_ID) throw new Error('PHOTO_MANIFEST_ARTICLE_ID_MISMATCH');
  const layout = compileLayout(source, inputPhotos.photos || [], {highlightIndices:inputPhotos.highlightIndices, relatedLinks:inputPhotos.relatedLinks});
  await mkdir(output('assets'), {recursive:true});
  const photoReport = [];
  let rejectedPhotos = 0;
  for(const slot of layout.slots) {
    for(const [i, photo] of slot.entries.entries()) {
      const metadataIssues = validatePhotoMeta(photo,slot);
      if (metadataIssues.length) { rejectedPhotos++; photo.verified=false; photoReport.push({slot:slot.id,sourceName:photo.sourceName,approved:false,issues:metadataIssues});continue; }
      try {
        const src = resolve(photo.sourceFile);
        const info = await stat(src);
        if (!info.isFile()) throw new Error('NOT_FILE');
        const image = await validateImageFile(src);
        const safeName = `${slot.id}-${i}-${image.hash.slice(0,12)}${extname(src).toLowerCase()}`;
        await copyFile(src, output('assets',safeName));
        photo.verified = true;
        photo.outputUrl = `assets/${safeName}`;
        photoReport.push({slot:slot.id,sourceName:photo.sourceName,approved:true,sha256:image.hash,sizeBytes:image.size});
      }catch(e){rejectedPhotos++;photo.verified=false;photoReport.push({slot:slot.id,sourceName:photo.sourceName,approved:false,issues:[String(e.message||e)]});}
    }
    slot.ready = slot.ready && slot.entries.filter(p=>p.verified).length >= slot.min && slot.entries.filter(p=>p.verified).length <= slot.max;
  }
  const html = renderEditorialHtml(layout);
  await writeFile(output('editorial-preview.html'),html,'utf8');
  report.result = 'EDITORIAL_PREVIEW_BUILT';
  report.sourceValidation = {hash:FINAL_EXPECTED_SHA256, titleMatch:compact(verified.title)===compact(parsed.title), blocks:parsed.blocks.length, headingIndexes, sourceTextUnchanged:true};
  report.photoSlots = layout.slots.map(s=>({id:s.id,label:s.label,layout:s.layout,ready:s.ready,approvedCount:s.entries.filter(p=>p.verified).length,min:s.min,max:s.max}));
  report.photos = photoReport;
  report.photoCount = photoReport.filter(p=>p.approved).length;
  report.designReadyForNaver = layout.slots.every(s=>s.ready) && rejectedPhotos === 0;
  report.note = '구조 및 디자인 HTML 오프라인 검토. 네이버에 이 HTML을 그대로 붙여넣지 말 것. 사진 업로드·발행 미구현.';
  report.samplePhotoManifest = EXAMPLE_MANIFEST;
}catch(e){report.result='EDITORIAL_PREVIEW_ERROR';report.error=String(e.message||e);report.code=e.code||'UNEXPECTED';}
finally {
  await mkdir(DEST,{recursive:true});
  await writeFile(output('editorial-report.json'),JSON.stringify(report,null,2)+'\n','utf8');
  console.log(JSON.stringify({result:report.result,outputFolder:DEST,html:report.result==='EDITORIAL_PREVIEW_BUILT'?output('editorial-preview.html'):null,sourceValidation:report.sourceValidation,photoSlots:report.photoSlots,designReadyForNaver:report.designReadyForNaver,error:report.error,saveDraftExecuted:false,publishExecuted:false},null,2));
  process.exitCode=report.result==='EDITORIAL_PREVIEW_BUILT'?0:2;
}
