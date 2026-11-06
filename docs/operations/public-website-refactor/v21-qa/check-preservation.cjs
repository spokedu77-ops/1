const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../../..');
const initial=require('./initial-file-hashes.json');
const allowed=new Set([
  'app/spokedu/website/pages/home.tsx','app/spokedu/website/data/home.ts',
  'app/spokedu/website/pages/home.module.css','app/spokedu/website/public-v2.contract.test.ts',
  'app/spokedu/docs/PUBLIC_MARKETING_DESIGN_CONTRACT.md','docs/SPOKEDU_PUBLIC_WEBSITE_SSOT.md',
]);
const changed=[];let checked=0;
for(const [file,hash] of Object.entries(initial)){
  if(allowed.has(file))continue;
  checked++;
  if(!fs.existsSync(path.join(root,file))||crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')!==hash)changed.push(file);
}
const result={checked,changedOutsideApprovedScope:changed};
fs.writeFileSync(__dirname+'/preservation.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
if(changed.length)process.exitCode=1;
