const sharp=require('sharp');
const fs=require('node:fs');
const before=require('./before.json');
(async()=>{
 fs.mkdirSync(__dirname+'/compare',{recursive:true});
 for(const width of [375,768,1024,1440,1920]){
  const rail=before.find(r=>r.width===width).probes.rail.box.width;
  const file=__dirname+`/before/cases-${width}.png`;
  const metadata=await sharp(file).metadata();const top=width<768?64:96;
  // Normalize to the original content rail, excluding only Section outer padding.
  await sharp(file).extract({left:Math.round((width-rail)/2),top,width:Math.round(rail),height:metadata.height-top*2}).png().toFile(__dirname+`/before/cases-content-${width}.png`);
 }
 for(const width of [375,1440]){
  for(const name of ['hero','quick','why','metrics','cases','cta']){
   const pane=width===375?375:720;
   const bf=__dirname+`/before/${name==='cases'?'cases-content':name}-${width}.png`,af=__dirname+`/after/${name}-${width}.png`;
   const make=async f=>{const obj=sharp(f).resize({width:pane});const buf=await obj.png().toBuffer();return {buf,meta:await sharp(buf).metadata()}};
   const b=await make(bf),a=await make(af),height=Math.max(b.meta.height,a.meta.height)+40;
   const label=Buffer.from(`<svg width="${pane*2}" height="40"><rect width="100%" height="100%" fill="white"/><text x="16" y="26" font-family="sans-serif" font-size="18">BEFORE</text><text x="${pane+16}" y="26" font-family="sans-serif" font-size="18">V2.1 AFTER</text></svg>`);
   await sharp({create:{width:pane*2,height,channels:3,background:'#e5e9f6'}}).composite([{input:label,left:0,top:0},{input:b.buf,left:0,top:40},{input:a.buf,left:pane,top:40}]).png().toFile(__dirname+`/compare/${name}-${width}.png`);
  }
 }
 console.log('Normalized case crops and 12 side-by-side section comparisons generated.');
})();
