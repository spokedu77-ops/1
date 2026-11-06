const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','build'],{cwd:path.resolve(__dirname,'../../../..'),windowsHide:true});
let output='';child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>output+=c);
child.on('close',exitCode=>{fs.writeFileSync(__dirname+'/build.log',output);fs.writeFileSync(__dirname+'/build-result.json',JSON.stringify({command:'node node_modules/next/dist/bin/next build',exitCode},null,2));console.log(`Production Build exit ${exitCode}`);process.exitCode=exitCode;});
