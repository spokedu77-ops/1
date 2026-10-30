const fs=require('fs'),crypto=require('crypto'),path=require('path');
const out='.spomove-audit-stage2';fs.mkdirSync(out,{recursive:true});
fs.copyFileSync('SPOMOVE_FORENSIC_AUDIT.md',out+'/stage1-report-preserved.md');
const roots=['app','docs','lib','types'];const files=[];function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else files.push(p.replaceAll('\\','/'));}}for(const r of roots)if(fs.existsSync(r))walk(r);for(const p of ['AGENTS.md','package.json','package-lock.json','next.config.ts','tsconfig.json','next-env.d.ts','proxy.ts'])if(fs.existsSync(p))files.push(p);
const hashes=Object.fromEntries(files.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));fs.writeFileSync(out+'/start-source-hashes.json',JSON.stringify(hashes,null,2));console.log('Preserved report; hashed '+files.length+' source files');
