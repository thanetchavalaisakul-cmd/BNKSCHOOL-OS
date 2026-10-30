
const fs=require('fs');
const acorn=require('acorn');
const scope=require('eslint-scope');
const crypto=require('crypto');
const root=process.cwd()+'/';
let s=fs.readFileSync(root+'app.js','utf8');
const ast=acorn.parse(s,{ecmaVersion:'latest',sourceType:'module',ranges:true});
const manager=scope.analyze(ast,{ecmaVersion:2022,sourceType:'module',optimistic:true,ignoreEval:true});
const globals=new Set();
for(const node of ast.body){
  if(node.type==='FunctionDeclaration'||node.type==='ClassDeclaration')globals.add(node.id.name);
  if(node.type==='VariableDeclaration')for(const d of node.declarations)if(d.id.type==='Identifier')globals.add(d.id.name);
  if(node.type==='ImportDeclaration')for(const d of node.specifiers)globals.add(d.local.name);
}
const groups={
 'academic-report-pdf':{type:'async',functions:['lessonUsagePdfHtml','learnerActivityPdfHtml','clubActivityPdfHtml','postLessonPdfHtml','classroomResearchPdfHtml','learningMediaPdfHtml']},
 'academic-dialogs':{type:'async',functions:['postLessonFormModal','lessonUsageFormModal','academicPlcPlanModal','learningMediaFormModal','academicCertificateReviewModal','academicTransferReviewModal','academicDocumentServiceReviewModal','academicCertificateRoleSettingsModal','academicDocumentServiceSettingsModal','academicRegistrationRoleSettingsModal']},
 'personnel-dialogs':{type:'async',functions:['personnelPa2AssessmentModal']},
 'timetable-dialogs':{type:'async',functions:['timetableTeacherCapabilityModal']},
 'student-dialogs':{type:'async',functions:['studentFollowupFormModal','studentCardCertifierSettingsModal']},
 'dashboard-events':{type:'events',functions:['bindDashboardEvents']},
 'procurement-pdf-templates':{type:'procurement',functions:['procurementPackDocumentPagesV44Legacy','procurementPackDocumentPagesBase']},
 'procurement-dialogs':{type:'modal',functions:['procurementFormModal','procurementFormModalV44Legacy','procurementSettingsModal']},
 'academic-forms':{type:'modal',functions:['academicDocumentServiceFormModal','academicTransferFormModal','academicCertificateFormModal','learnerActivityFormModal','clubActivityFormModal','classroomResearchFormModal']},
 'school-lunch-dialogs':{type:'modal',functions:['schoolLunchRoundFormModal']},
 'learning-source-dialogs':{type:'modal',functions:['learningSourceFormModal']},
 'exam-dialogs':{type:'modal',functions:['examSetModal']}
};
const loaders=[],replacements=[],manifest=[],seen=new Set();
fs.mkdirSync(root+'modules',{recursive:true});
for(const [group,spec] of Object.entries(groups)){
 const names=spec.functions;
 const nodes=names.map(name=>{
   if(seen.has(name))throw Error('Duplicate '+name);seen.add(name);
   const node=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);
   if(!node)throw Error('Function unavailable '+name);
   if((spec.type==='async')!==Boolean(node.async)) {
     if(spec.type==='async')throw Error('Expected async '+name);
     if(node.async)throw Error('Expected sync '+name);
   }
   return node;
 });
 const deps=[...new Set(nodes.flatMap(n=>manager.acquire(n).through.map(ref=>ref.identifier.name)))].filter(name=>globals.has(name)&&!names.includes(name)).sort();
 const feature=group.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase()).replace(/^(.)/,(_,letter)=>letter.toUpperCase())+'Feature';
 const body=nodes.map(n=>s.slice(n.start,n.end)).join('\n\n');
 const exported=spec.type==='procurement'?['procurementPackDocumentPagesBase']:names;
 const moduleCode='// BNK SCHOOL OS lazy module: '+group+'. Original function bodies preserved.\nexport function create'+feature+'(ctx){\nconst {'+deps.join(',')+'}=ctx;\n'+body+'\nreturn {'+exported.join(',')+'};\n}\n';
 fs.writeFileSync(root+'modules/'+group+'.js',moduleCode);
 const cache='bnk'+feature+'Promise',method='load'+feature;
 const loader='\nlet '+cache+'=null;\nasync function '+method+'(){\n '+cache+'??=import("./modules/'+group+'.js?v=5.12.9.58").then(mod=>mod.create'+feature+'({'+deps.join(',')+'})).catch(error=>{'+cache+'=null;throw error;});\n return '+cache+';\n}\n';
 loaders.push(loader);
 for(const node of nodes){
   let wrapper='';
   const name=node.id.name;
   if(spec.type==='async'||spec.type==='events')
      wrapper='async function '+name+'(...args){return (await '+method+'()).'+name+'(...args);}';
   else if(spec.type==='modal')
      wrapper='function '+name+'(...args){return '+method+'().then(mod=>mod.'+name+'(...args)).catch(error=>toast("เปิดหน้าต่างไม่สำเร็จ",error?.message||String(error),"error"));}';
   replacements.push({start:node.start,end:node.end,text:wrapper});
   manifest.push({group,name,sha256:crypto.createHash('sha256').update(s.slice(node.start,node.end)).digest('hex')});
 }
 console.log(group,'functions',names.length,'source_bytes',moduleCode.length,'dependencies',deps.length);
}
for(const r of replacements.sort((a,b)=>b.start-a.start))s=s.slice(0,r.start)+r.text+s.slice(r.end);
const loaderAnchor='const PDFDocument={';
if(s.split(loaderAnchor).length!==2)throw Error('Unexpected loader anchor');
s=s.replace(loaderAnchor,loaders.join('\n')+'\n'+loaderAnchor);
if(s.split('  bindDashboardEvents();').length!==3)throw Error('Expected exactly two event binder calls');
s=s.replaceAll('  bindDashboardEvents();','  await bindDashboardEvents();');
const wrapperOld='function procurementPackDocumentPages(c,code,signers){\n  return procurementApplyExcelMasterText(c,code,procurementPackDocumentPagesBase(c,code,signers));\n}';
const wrapperNew='async function procurementPackDocumentPages(c,code,signers){\n  const template=await loadProcurementPdfTemplatesFeature();\n  return procurementApplyExcelMasterText(c,code,template.procurementPackDocumentPagesBase(c,code,signers));\n}';
if(s.split(wrapperOld).length!==2)throw Error('Unexpected procurement wrapper');
s=s.replace(wrapperOld,wrapperNew);
for(const [before,after,count] of [
 ['procurementPackDocumentPages(c,code,signers).join("")','(await procurementPackDocumentPages(c,code,signers)).join("")',2],
 ['procurementPackDocumentPages(c,d.code,signers).join("")','(await procurementPackDocumentPages(c,d.code,signers)).join("")',2]
]){
 if(s.split(before).length!==count+1)throw Error('Document call sites mismatch '+before);
 s=s.replaceAll(before,after);
}
const tick=String.fromCharCode(96);
for(const [before,after] of [
 ['const html=PROCUREMENT_DOCUMENTS.map((d,idx)=>{','const html=(await Promise.all(PROCUREMENT_DOCUMENTS.map(async (d,idx)=>{'],
 ['}).join("");const host=','}))).join("");const host='],
 ['const html=readyDocs.map(d=>','const html=(await Promise.all(readyDocs.map(async d=>'],
 [tick+').join("");const host=',tick+'))).join("");const host=']
]){
 if(s.split(before).length!==2)throw Error('Unexpected PDF pack mapping '+before+' found '+(s.split(before).length-1));
 s=s.replace(before,after);
}
const valid=acorn.parse(s,{ecmaVersion:'latest',sourceType:'module'});
fs.writeFileSync(root+'app.js',s);
const htmlPath=root+'index.html';let html=fs.readFileSync(htmlPath,'utf8');
if(html.split('app.min.js?v=5.12.9.57').length!==2)throw Error('Unexpected build version');
html=html.replace('app.min.js?v=5.12.9.57','app.min.js?v=5.12.9.58');
fs.writeFileSync(htmlPath,html);
fs.mkdirSync(root+'docs/modules',{recursive:true});
fs.writeFileSync(root+'docs/modules/refactor-manifest-20261030.json',JSON.stringify({version:'5.12.9.58',functions:manifest},null,2)+'\n');
console.log('Total moved',manifest.length,'Lazy modules',Object.keys(groups).length,'App size',s.length);

