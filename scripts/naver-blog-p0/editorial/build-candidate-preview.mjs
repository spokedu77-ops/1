#!/usr/bin/env node
/** Displays curated REAL Drive photos in LOCAL editorial preview only. Never flags publication rights approved. */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARTICLE_ID, digest, lf, assertFinal } from './paps-core.mjs';
import { finalMarkdownPath, finalNaverInputJsonPath, parseArticleForNaver, FINAL_EXPECTED_SHA256 } from '../naver-article-pipeline.mjs';
import { loadStyleBlockPlan } from '../naver-new-style-runner.mjs';
import { compileLayout, renderEditorialHtml, compact } from './layout.mjs';
const dir=dirname(fileURLToPath(import.meta.url));
const repo=resolve(dir,'..','..','..');
const articleId=process.argv.find(x=>x.startsWith('--article-id='))?.split('=')[1]||ARTICLE_ID;
const output=join(repo,'reports','naver-new','editorial',articleId);
const report={result:'NOT_RUN',articleId,publicationReady:false,remoteSave:false,remotePublish:false,uploadExecuted:false,vercelImageRequests:0};
try{
 if(articleId!==ARTICLE_ID) throw new Error('UNEXPECTED_ARTICLE_ID');
 const plan=await loadStyleBlockPlan(articleId);
 const pkg=JSON.parse(await readFile(finalNaverInputJsonPath(articleId),'utf8'));
 const raw=lf(await readFile(pkg.source||finalMarkdownPath(articleId),'utf8'));
 const mdSha=digest(raw);
 if(mdSha!==FINAL_EXPECTED_SHA256) throw new Error('FINAL_SHA_NOT_UPDATED_OR_INVALID:'+mdSha);
 const parsed=parseArticleForNaver(raw);const validated=assertFinal(pkg,parsed,mdSha);
 if(plan.paragraphs.length!==19||!plan.paragraphs.every((p,i)=>compact(p)===compact(parsed.blocks[i].text)))throw new Error('PLAN_TEXT_MISMATCH');
 const headingIndexes=parsed.blocks.flatMap((b,i)=>b.type==='heading'?[i]:[]);
 const manifest=JSON.parse(await readFile(join(dir,'photos.candidates.json'),'utf8'));
 if(manifest.articleId!==articleId||manifest.publicationRightsStatus!=='UNVERIFIED_DO_NOT_PUBLISH')throw new Error('WRONG_PHOTO_MANIFEST');
 const layout=compileLayout({title:plan.title,blocks:parsed.blocks,paragraphs:plan.paragraphs,headingIndexes},[],{highlightIndices:[18],relatedLinks:[]});
 await mkdir(join(output,'assets'),{recursive:true});
 report.photos=[];
 for(const p of manifest.photos){
  const from=join(dir,'candidate-photos',p.file);
  const image=await readFile(from);
  if(image.length<20000||image.length>12*1024*1024||image[0]!==0xff||image[1]!==0xd8||image[2]!==0xff)throw new Error('PHOTO_SIGNATURE_OR_SIZE_INVALID:'+p.file);
  const sha=createHash('sha256').update(image).digest('hex');
  const filename=sha.slice(0,16)+'-'+p.file;
  await copyFile(from,join(output,'assets',filename));
  const slot=layout.slots.find(s=>s.id===p.slot);
  if(!slot) throw new Error('UNKNOWN_SLOT:'+p.slot);
  // VERIFIED only means the local file bytes were inspected; not external-publication permission.
  slot.entries.push({...p,sourceName:p.file,verified:true,outputUrl:'assets/'+filename,sourceDriveUrl:'https://drive.google.com/file/d/'+p.driveId+'/view'});
  report.photos.push({slot:p.slot,sourceName:p.file,sourceDriveUrl:'https://drive.google.com/file/d/'+p.driveId+'/view',sha256:sha,caption:p.caption,editorialContextAccepted:true,portraitRightsCleared:false,publicationAllowed:false});
 }
 // For LOCAL demonstration allow image placeholders to be filled by real files. Do not alter publish approval gate.
 for(const s of layout.slots){s.ready=s.entries.length>=s.min&&s.entries.length<=s.max; if(!s.ready)throw new Error('VISUAL_SLOT_INCOMPLETE:'+s.id);}
 let html=renderEditorialHtml(layout);
 const banner=`<aside role="note" style="position:sticky;top:0;z-index:99;background:#b32727;color:white;padding:12px 18px;text-align:center;font:700 13px/1.5 system-ui,sans-serif">SPOKEDU 내부 디자인 검토용 · 사진 사용·아동 초상권 승인 확인 전 게시 금지 · 실제 글 내용: PAPS</aside>`;
 html=html.replace('<body>',`<body>${banner}`).replace('모든 사진은 실제 촬영본 확인 및 사용 승인 후 반영합니다.','사진은 확인된 양천거점 수업의 연관 장면으로 구성했습니다. 사용 승인 전에는 외부 게시하지 않습니다.');
 html=html.replace('LOCAL REVIEW ONLY · NOT A PUBLISHED POST','LOCAL REVIEW ONLY · PAPS · IMAGE RIGHTS PENDING');
 await writeFile(join(output,'paps-photo-editorial-preview.html'),html,'utf8');
 report.result='PAPS_EDITORIAL_PREVIEW_BUILT';report.validation={...validated,markdownSha256:mdSha,blockCount:19,headingIndexes};report.photoCount=report.photos.length;
 report.htmlPath=join(output,'paps-photo-editorial-preview.html');
 report.publicationReady=false;report.note='실제 Drive 사진 기반 레이아웃을 로컬로 확인한 것. 네이버에 아직 사진을 업로드하지 않았고 공개 게시 권한도 확인되지 않음.';
}catch(e){report.result='PAPS_EDITORIAL_PREVIEW_ERROR';report.error=String(e.message||e);process.exitCode=2;}
finally {await mkdir(output,{recursive:true});const path=join(output,'paps-photo-editorial-report.json');await writeFile(path,JSON.stringify(report,null,2)+'\n','utf8');console.log(JSON.stringify({result:report.result,photos:report.photoCount,validation:report.validation,preview:report.htmlPath,reportPath:path,error:report.error,publicationReady:false,remoteSave:false,remotePublish:false},null,2));}
