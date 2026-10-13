import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import path from 'node:path';
import {zipSync} from 'fflate';
const VERSION='3.6.3';
await mkdir('public',{recursive:true});
if(process.env.OSD_REUSE_CATEGORY_BASE!=='1'){
 await import('./final-build.mjs');
 await writeFile('public/category-baseline.html',await readFile('public/index.html'));
}
let html=await readFile('public/category-baseline.html','utf8');
if(!html.includes('chartCandlesToggle')||!html.includes('OSDStructureEngine')||html.includes('osd-category-colour-style'))throw Error('Unexpected category release baseline.');
const baselineSHA256=createHash('sha256').update(html).digest('hex');
if(html.includes('osd-fractal-colour-style')){
 const old='<script>\n'+await readFile('fractal-colours.js','utf8')+'\n</script>';
 if(html.split(old).length!==2)throw Error('Expected exact prior colour module once.');
 html=html.replace(old,'');
}
// Add explicit rendering metadata, never change geometry or price calculations.
const tag=(line,category,phase)=>line.replace(/<(line|rect|path|text)(?=[\s>])/g,`<$1 data-osd-category="${category}" data-osd-phase="${phase}"`);
const counts={day:0,dayLabel:0,fibHistory:0,fibHit:0,fibCurrent:0,pivot:0,pivotTouch:0,pivotLabel:0};
let section='';
html=html.split('\n').map(line=>{
 if(line.startsWith('renderChart=function(scrollRight=false){'))section='h1';
 if(line.startsWith('function bindFibControls(){'))section='';
 if(line.startsWith('function renderDailyPivotSvg(ctx){'))section='pivot';
 if(line.startsWith('function updatePivotUI(){'))section='';
 if(section==='h1'){
  if(/if\(Number\.isFinite\(r\.(pdh|pdl)\)\)/.test(line)&&line.includes('data-role=')){counts.day++;return tag(line,'previousDay',"${q===end?'current':'history'}");}
  if(line.includes('const cr=state.records[end],labelX=')){counts.dayLabel++;return tag(line,'previousDay','current');}
  if(line.includes('data-role="fib-history-')){counts.fibHistory++;return tag(line,'fibonacci','history');}
  if(line.includes('data-role="fib-hit-')){counts.fibHit++;return tag(line,'fibonacci','history');}
  if(line.includes('data-role="fib-current-')){counts.fibCurrent++;return tag(line,'fibonacci','current');}
 }
 if(section==='pivot'){
  if(line.includes('data-role="daily-pivot-')){counts.pivot++;return tag(line,'pivot',"${isCurrent?'current':'history'}");}
  if(line.includes('data-role="pivot-touch-')){counts.pivotTouch++;return tag(line,'pivot',"${isCurrent?'current':'history'}");}
  if(line.includes('for(const z of currentLabels)')){counts.pivotLabel++;return tag(line,'pivot','current');}
 }
 return line;
}).join('\n');
const expected={day:2,dayLabel:1,fibHistory:1,fibHit:1,fibCurrent:2,pivot:1,pivotTouch:1,pivotLabel:1};
for(const key of Object.keys(expected))if(counts[key]!==expected[key])throw Error(`Rendering hook ${key}: expected ${expected[key]}, found ${counts[key]}`);
html=html.replace('Both use the same short-dash pattern; blue identifies PDH and red identifies PDL.','Both share the same slate-blue category colour; the PDH and PDL labels identify the individual levels.');
html=html.replaceAll('3.6.1',VERSION).replaceAll('3.6.2',VERSION);
html=html.replace(/\n*<\/body>/,'\n</body>');
html=html.replace('</body>','<script>\n'+await readFile('category-colours.js','utf8')+'\n</script>\n</body>');
await writeFile('public/index.html',html);
const finalSHA256=createHash('sha256').update(html).digest('hex');
const report=JSON.parse(await readFile('public/build-report.json','utf8'));
Object.assign(report,{appVersion:VERSION,categoryBaselineSHA256:baselineSHA256,patchedBytes:Buffer.byteLength(html),finalSHA256,categoryHooks:counts,categoryColours:{previousDay:'#335f83',fractal:'#79518a',pivot:'#89631d',fibonacci:'#0b7371'},historyOpacity:.42});
delete report.fractalColours;
await writeFile('public/build-report.json',JSON.stringify(report,null,2));
// Fresh deterministic checks, not inherited report counts.
const context=vm.createContext({});
for(const file of ['fractal-levels.js','structure-view.js'])vm.runInContext(await readFile(file,'utf8'),context);
for(const [name,engine] of [['engine-audit',context.OSDFractalEngine],['structure-engine-audit',context.OSDStructureEngine]]){
 const audit=engine.selfTest();if(!audit.pass)throw Error(name+' failed');await writeFile('public/'+name+'.json',JSON.stringify(audit,null,2));
}
await writeFile('.category-final-audit.mjs',(await readFile('final-audit.mjs','utf8')).replaceAll('3.6.1',VERSION));
if(process.env.OSD_CATEGORY_RENDER_ONLY==='1'){console.log('CATEGORY RENDER',JSON.stringify({version:VERSION,finalSHA256,counts}));}
else {
 for(const test of ['browser-audit.mjs','structure-audit-runner.mjs','.category-final-audit.mjs','category-colours-audit.mjs'])execFileSync(process.execPath,[test],{stdio:'inherit'});
 const audits=await Promise.all(['engine-audit','structure-engine-audit','browser-audit','structure-browser-audit','final-ui-audit','category-colours-audit'].map(async n=>JSON.parse(await readFile('public/'+n+'.json','utf8'))));
 const summary={version:VERSION,engineTests:{passed:audits[0].passed+audits[1].passed,total:audits[0].total+audits[1].total},browserTests:{passed:audits.slice(2).reduce((n,a)=>n+a.passed,0),total:audits.slice(2).reduce((n,a)=>n+a.total,0)},categoryTests:{passed:audits[5].passed,total:audits[5].total},pass:audits.every(a=>a.pass),finalSHA256};
 if(!summary.pass)throw Error('Category release audit failed');
 await writeFile('public/audit-summary.json',JSON.stringify(summary,null,2));
 await writeFile('public/release.json',JSON.stringify({version:VERSION,name:'OSD Research Lab',features:['visible-hide-candles','fractal-levels','fractal-history','one-colour-per-category'],categoryColours:report.categoryColours,sha256:finalSHA256},null,2));
 const files={};
 const names=['index.html','release.json','audit-summary.json','engine-audit.json','structure-engine-audit.json','browser-audit.json','structure-browser-audit.json','final-ui-audit.json','category-colours-audit.json','build-report.json','OSD_Kelly_Edge_Lab_Data_Template.csv',...(report.preservedAssets||[])];
 for(const name of new Set(names))files[name]=new Uint8Array(await readFile(path.join('public',name)));
 for(const name of await readdir('public/data'))files['data/'+name]=new Uint8Array(await readFile(path.join('public/data',name)));
 files['README.txt']=new TextEncoder().encode('OSD Research Lab v'+VERSION+'\nOpen index.html in a desktop browser. No installation or API key.\nHide candles remains beside Next; only H1 price bars are hidden, not indicators.\nONE COLOUR PER CATEGORY:\nPDH and PDL: slate blue.\nHF LOW and LF HIGH: muted violet.\nDaily pivot P and every support/resistance level: ochre.\nAll Fibonacci lines: teal.\nHistorical segments keep their category colour at 42% opacity.\nDeveloping fractals stay dashed and blink after +1; confirm or invalidate after +2.\nAll existing replay, data and observation workflows retained. Research only.\n');
 const zip=zipSync(files,{level:6});
 for(const name of ['OSD_Research_Lab_Final.zip','OSD_Research_Lab_Exact.zip'])await writeFile('public/'+name,zip);
 console.log('CATEGORY RELEASE',JSON.stringify(summary));
}
