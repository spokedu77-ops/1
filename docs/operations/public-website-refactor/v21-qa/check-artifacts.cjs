const fs=require('node:fs');
const path=require('node:path');
for(const file of ['REPORT.md','index.html']){
 const source=fs.readFileSync(path.join(__dirname,file),'utf8');
 const matches=file.endsWith('.md')?source.matchAll(/\]\(([^)]+)\)/g):source.matchAll(/href="([^"]+)"/g);
 const missing=[...matches].map(m=>m[1]).filter(link=>!link.includes('://')&&!fs.existsSync(path.join(__dirname,link)));
 console.log(`${file}: missing links ${JSON.stringify(missing)}`);if(missing.length)process.exitCode=1;
}
