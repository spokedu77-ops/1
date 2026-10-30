const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const root=process.cwd(),out=path.resolve(root,'.spomove-gate-a'),dest=path.join(out,'workspace');
if(!dest.startsWith(root+path.sep))throw Error('Invalid workspace destination');fs.mkdirSync(dest,{recursive:true});
const files=cp.execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);const hashes={};let count=0;
for(const file of files){if(file.startsWith('.spomove-')||file.startsWith('.env')||file.startsWith('.git')||file.startsWith('.vscode/')||file.startsWith('.next')||file.endsWith('.log')||file.endsWith('.zip')||!fs.existsSync(file)||!fs.statSync(file).isFile())continue;const target=path.join(dest,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(file,target);if(/\.(tsx?|mts|json|mjs|css)$/.test(file))hashes[file]=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');count++;}
if(fs.existsSync('next-env.d.ts'))fs.copyFileSync('next-env.d.ts',path.join(dest,'next-env.d.ts'));
if(!fs.existsSync(path.join(dest,'node_modules')))fs.symlinkSync(path.join(root,'node_modules'),path.join(dest,'node_modules'),'junction');
fs.copyFileSync('.spomove-audit-stage2/network-guard.cjs',path.join(out,'network-guard.cjs'));
fs.writeFileSync(path.join(out,'snapshot-hashes.json'),JSON.stringify(hashes,null,2));
fs.writeFileSync(path.join(out,'snapshot-metadata.json'),JSON.stringify({head:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),copied:count,sourceFiles:Object.keys(hashes).length,includesUntrackedProductFiles:true,credentialsCopied:false,auditFixturesCopied:false,destination:dest},null,2));console.log('Copied '+count+' files; includes current untracked product dependencies.');
