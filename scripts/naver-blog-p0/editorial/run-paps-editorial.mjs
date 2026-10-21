#!/usr/bin/env node
/** One command: guarded PAPS corrections, then real-photo local editorial preview. */
import {spawnSync} from 'node:child_process';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url));
const articleId=process.argv.find(x=>x.startsWith('--article-id='))?.split('=')[1]||'9fad3d9e6f847f36';
if(!process.argv.includes('--apply')){console.error('Use --apply to authorize correction of three verified local FINAL files. No files changed.');process.exit(2)}
for(const [file,args] of [
 ['apply-paps.mjs',['--article-id='+articleId,'--apply']],
 ['build-candidate-preview.mjs',['--article-id='+articleId]],
]){
 const r=spawnSync(process.execPath,[join(dir,file),...args],{stdio:'inherit',env:process.env});
 if(r.error){console.error(r.error);process.exit(3)}
 if(r.status!==0){process.exit(r.status??3)}
}
