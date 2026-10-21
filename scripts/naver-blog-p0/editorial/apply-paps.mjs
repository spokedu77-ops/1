#!/usr/bin/env node
/** Guarded FINAL PAPS correction. Backs up original FINAL+JSON+one source constant; never touches HWP, Naver or Drive. */
import { readFile, writeFile, mkdir, rename, copyFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARTICLE_ID, ORIGINAL_SHA, digest, lf, hasWrongTerm, correctPaps, reconcileFinalPackage, assertFinal } from './paps-core.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..','..','..');
const articleId = process.argv.find(x=>x.startsWith('--article-id='))?.split('=')[1] || ARTICLE_ID;
const apply = process.argv.includes('--apply');
const articleRoot=process.env.SPOKEDU_ARTICLES_ROOT || 'C:\\Users\\joker\\SPOKEDU-LLM\\04_학습결과\\SPOKEDU_AUTOPILOT\\articles';
const article=join(articleRoot,articleId);
const sourceFile=join(article,'ARTICLE_FOR_NAVER_FINAL.md');
const jsonFile=join(article,'FINAL_NAVER_INPUT.json');
const pipelineFile=join(repo,'scripts','naver-blog-p0','naver-article-pipeline.mjs');
const reportDir=join(repo,'reports','naver-new','editorial',articleId);
const files=[sourceFile,jsonFile,pipelineFile];
const result={result:'NOT_RUN',articleId,apply,sourceFile,jsonFile,pipelineFile,remoteSave:false,remotePublish:false};
try {
 if(articleId!==ARTICLE_ID) throw new Error('ARTICLE_ID_NOT_APPROVED_FOR_PATCH');
 const [rawMd,rawJson,pipeline]=await Promise.all(files.map(p=>readFile(p,'utf8')));
 const parsedPkg=JSON.parse(rawJson);
 const {parseArticleForNaver}=await import('../naver-article-pipeline.mjs');
 const mdLF=lf(rawMd);const actual=digest(mdLF);
 const match=pipeline.match(/export const FINAL_EXPECTED_SHA256\s*=\s*'([a-f0-9]{64})'/);
 if(!match) throw new Error('PIPELINE_HASH_CONSTANT_NOT_FOUND');
 const moduleSha=match[1];
 if(!hasWrongTerm(mdLF)){
  const parsed=parseArticleForNaver(mdLF);
  result.validation=assertFinal(parsedPkg,parsed,actual);
  if(moduleSha!==actual) throw new Error('ALREADY_PAPS_BUT_PIPELINE_HASH_NOT_MATCH');
  result.result='ALREADY_PAPS_VALIDATED';result.newSha256=actual;
 }else{
  if(actual!==ORIGINAL_SHA||parsedPkg.source_sha256!==ORIGINAL_SHA||moduleSha!==ORIGINAL_SHA){
   throw new Error('LOCAL_SOURCE_CHANGED_NO_OVERWRITE:expected='+ORIGINAL_SHA+' actual='+actual+' package='+parsedPkg.source_sha256+' constant='+moduleSha);
  }
  const correctedMdLF=correctPaps(mdLF);
  const parsed=parseArticleForNaver(correctedMdLF);
  const newSha=digest(correctedMdLF);
  const newPkg=reconcileFinalPackage(parsedPkg,parsed,newSha);
  result.validation=assertFinal(newPkg,parsed,newSha);
  result.oldSha256=actual;result.newSha256=newSha;
  result.termReplacements=(mdLF.match(/POPS|팝스/gi)||[]).length;
  if(!apply){result.result='PAPS_DRY_RUN_READY';}
  else{
    // Strict source match, backups retained on local PC for audit/recovery.
    const backups=files.map(f=>f+'.pre-paps.backup');
    for(let i=0;i<files.length;i++){
      try{await copyFile(files[i],backups[i],0x1);} // COPYFILE_EXCL
      catch(e){if(e.code==='EEXIST') throw new Error('BACKUP_ALREADY_EXISTS_REVIEW_BEFORE_RETRY:'+backups[i]);throw e;}
    }
    const mdNew=rawMd.includes('\r\n') ? correctedMdLF.replace(/\n/g,'\r\n') : correctedMdLF;
    const updatedPipeline=pipeline.replace(`'${ORIGINAL_SHA}'`,`'${newSha}'`);
    const writes=[mdNew,JSON.stringify(newPkg,null,2)+'\n',updatedPipeline];
    let changed=[];
    try{
      for(let i=0;i<files.length;i++){
       const temp=files[i]+'.paps-tmp';await writeFile(temp,writes[i],'utf8');await rename(temp,files[i]);changed.push(i);
      }
      // On-disk crosscheck post write.
      const check=lf(await readFile(sourceFile,'utf8'));
      if(digest(check)!==newSha) throw new Error('POST_WRITE_HASH_MISMATCH');
      const cp=JSON.parse(await readFile(jsonFile,'utf8'));
      assertFinal(cp,parseArticleForNaver(check),newSha);
      if(!(await readFile(pipelineFile,'utf8')).includes(`'${newSha}'`)) throw new Error('POST_WRITE_CONSTANT_MISMATCH');
      result.result='PAPS_APPLIED_VERIFIED';result.backupFiles=backups;
    }catch(e){for(const i of changed) await copyFile(backups[i],files[i]).catch(()=>{});throw e;}
  }
 }
}catch(e){result.result='PAPS_PATCH_ERROR';result.error=String(e.message||e);process.exitCode=2;}
finally{
 await mkdir(reportDir,{recursive:true});const reportPath=join(reportDir,'paps-correction-report.json');await writeFile(reportPath,JSON.stringify(result,null,2)+'\n','utf8');
 console.log(JSON.stringify({result:result.result,termReplacements:result.termReplacements,oldSha:result.oldSha256,newSha:result.newSha256,validation:result.validation,error:result.error,reportPath,remoteSave:false,remotePublish:false},null,2));
}
