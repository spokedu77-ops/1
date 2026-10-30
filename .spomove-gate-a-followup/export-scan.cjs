const fs = require('node:fs');
const ts = require('typescript');
const files = fs.readFileSync('.spomove-gate-a-followup/app-files.txt','utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/).filter(p=>/(?:^|[\\/])(?:page|route)\.tsx?$/.test(p));
const common = ['config','generateStaticParams','unstable_instant','unstable_dynamicStaleTime','revalidate','dynamic','dynamicParams','fetchCache','preferredRegion','runtime','maxDuration'];
const findings = []; let exportsChecked = 0;
for(const file of files){
 const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
 const route=/(?:^|[\\/])route\.tsx?$/.test(file);
 const allowed=new Set([...common,...(route?['GET','HEAD','OPTIONS','POST','PUT','DELETE','PATCH']:['default','metadata','generateMetadata','viewport','generateViewport'])]);
 function check(name,node,review=false){ exportsChecked++; if(!allowed.has(name))findings.push({file,line:source.getLineAndCharacterOfPosition(node.getStart(source)).line+1,name,review}); }
 function binding(n,node){if(ts.isIdentifier(n))check(n.text,node);else for(const e of n.elements)if(ts.isBindingElement(e))binding(e.name,node);}
 for(const node of source.statements){
  if(ts.isExportDeclaration(node)){
   if(node.isTypeOnly)continue;
   if(node.exportClause && ts.isNamedExports(node.exportClause))for(const e of node.exportClause.elements){if(!e.isTypeOnly)check(e.name.text,e,true);}
   else check('*',node,true);
   continue;
  }
  const mods=ts.canHaveModifiers(node)?ts.getModifiers(node):undefined;
  if(!mods?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword))continue;
  if(ts.isInterfaceDeclaration(node)||ts.isTypeAliasDeclaration(node))continue;
  if(mods.some(m=>m.kind===ts.SyntaxKind.DefaultKeyword)){check('default',node);continue;}
  if(ts.isVariableStatement(node))for(const d of node.declarationList.declarations)binding(d.name,node);
  else if(node.name)check(node.name.text,node);
 }
}
const result={scope:'app/**/{page,route}.{ts,tsx}',files:files.length,exportsChecked,findings,note:'Named reexports flagged for manual value/type resolution. Installed Next type plugin supplies allowed names. Static scan is not a build PASS.'};
fs.writeFileSync('.spomove-gate-a-followup/export-scan.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
