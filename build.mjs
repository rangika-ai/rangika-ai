import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import vm from 'node:vm';
import {zipSync} from 'fflate';
const reference=process.env.OSD_REFERENCE_BUILD_URL;
if(!reference)throw new Error('OSD_REFERENCE_BUILD_URL is required for the isolated preview build.');
const base=new URL(reference);const cookies=new Map();
async function retrieve(relative){
 let url=new URL(relative,base);url.search=base.search;
 for(let hop=0;hop<8;hop++){
  if(url.origin!==base.origin)throw new Error('Reference authentication redirected outside the deployment.');
  const r=await fetch(url,{redirect:'manual',headers:{cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')},signal:AbortSignal.timeout(45000)});
  for(const c of r.headers.getSetCookie()){const pair=c.split(';')[0],at=pair.indexOf('=');cookies.set(pair.slice(0,at),pair.slice(at+1));}
  if([301,302,303,307,308].includes(r.status)){url=new URL(r.headers.get('location'),url);continue;}
  if(!r.ok)throw new Error(`Reference file ${relative}: HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
 }
 throw new Error('Too many reference redirects');
}
await mkdir('public/data',{recursive:true});
const original=await retrieve('/');
let html=original.toString('utf8');
if(!html.includes('priceChart')||!html.includes('currentIndex')||!html.includes('OSDResearchHypothesis'))throw new Error('The complete expected Research Lab was not returned.');
const originalSHA1=createHash('sha1').update(original).digest('hex');
if(originalSHA1!=='8bc124c49f1d31062923438ed8659863d7e763f4')throw new Error('The reference source changed; review it before applying the patch.');
console.log('Original application recovered:',original.length,'bytes; SHA1',originalSHA1);
const dependencies=['data/manifest.json','data/ndaq100-h1.js','data/ndaq100-d1.js','data/ndaq100-h1.json.gz','data/ndaq100-d1.json.gz','OSD_Kelly_Edge_Lab_Data_Template.csv','DATA_UPDATE_GUIDE.md','README.md','RELEASE_NOTES.md','examples/Observation_Study_Card_Example.svg','previews/Entry_Hypothesis_Ready_Desktop.png','previews/Entry_Hypothesis_Ready_Mobile.png','previews/Entry_Hypothesis_Required_Desktop.png','previews/Entry_Hypothesis_Required_Mobile.png','previews/Observation_Study_Card_Hypothesis_Reflection_Desktop.png','previews/Observation_Study_Card_Hypothesis_Reflection_Mobile.png','previews/Post_Study_Reflection_Desktop.png'];
for(const file of dependencies){const bytes=await retrieve('/'+file);await mkdir(path.dirname(path.join('public',file)),{recursive:true});await writeFile(path.join('public',file),bytes);console.log('Retained asset:',file,bytes.length);}
await writeFile('public/baseline.html',html);
const lines=html.split('\n');
const matches=[];for(let i=0;i<lines.length;i++){if(/function\s+[^ (]*(?:[Ff]ractal|[Cc]hart)|(?:window\.)?renderChart\s*=|const state\s*=|let state\s*=/.test(lines[i]))matches.push({line:i+1,text:lines[i].slice(0,240)});}
await writeFile('public/inspection-index.json',JSON.stringify({bytes:original.length,originalSHA1,lineCount:lines.length,matches},null,2));
await mkdir('public/inspect',{recursive:true});
for(let i=0;i<lines.length;i+=100){await writeFile(`public/inspect/${i+1}.txt`,lines.slice(i,i+100).map((l,j)=>`${i+j+1}: ${l}`).join('\n'));}
const patch=await readFile('fractal-levels.js','utf8');
const context=vm.createContext({});vm.runInContext(patch,context);
const unit=context.OSDFractalEngine.selfTest();
await writeFile('public/engine-audit.json',JSON.stringify(unit,null,2));
if(!unit.pass)throw new Error('Fractal unit tests failed.');
const integrations=[],scaleNeedle='let min=Math.min(...values),max=Math.max(...values)';
const scaleAdd='values.push(...(window.OSDFractalLevels?.scaleValues(state.currentIndex)||[]));'+scaleNeedle;
for(const [startMark,endMark] of [['renderChart=function(scrollRight=false){','function bindFibControls(){'],['function drawStructuralChartOverlay(){','const baseExportBackupStructural='],['function structuralGeometry(svg,t,a){','function drawRiskZoneUnderlay(){']]){
 const from=html.indexOf(startMark),to=html.indexOf(endMark,from);
 if(from<0||to<from)throw new Error('Expected original renderer was not found.');
 const section=html.slice(from,to);
 if(!section.includes(scaleNeedle))throw new Error('Expected chart scale was not found.');
 html=html.slice(0,from)+section.replace(scaleNeedle,scaleAdd)+html.slice(to);integrations.push(startMark);
}
const mark='// Current Fib projection: latest closed bar into the single reserved next-hour zone only.';
if(!html.includes(mark))throw new Error('Expected original H1 rendering hook was not found.');
html=html.replace(mark,"out+=(window.OSDFractalLevels?.svg({start,end,step,x,y,m,plotRight,viewW,height})||'');\n  "+mark);
html=html.replace(/<\/body>/i,`<script>\n${patch}\n</script>\n</body>`);
console.log('Fractal engine tests:',unit.passed+'/'+unit.total,'; renderer integrations:',integrations.length);
await writeFile('public/index.html',html);
await writeFile('public/build-report.json',JSON.stringify({originalSHA1,originalBytes:original.length,patchedBytes:Buffer.byteLength(html),featureInstalled:true,integrations,preservedAssets:dependencies},null,2));
await import('./browser-audit.mjs');
const files={'index.html':new Uint8Array(Buffer.from(html))};
for(const file of dependencies)files[file]=new Uint8Array(await readFile(path.join('public',file)));
for(const file of ['engine-audit.json','browser-audit.json','build-report.json'])files[file]=new Uint8Array(await readFile(path.join('public',file)));
files['FRACTAL_LEVELS_README.txt']=new Uint8Array(Buffer.from('OSD Research Lab — original application plus opposite-edge fractal levels.\nOpen index.html in a browser, or host this folder as a static website.\nHigh-fractal line = LOW of fractal candle. Low-fractal line = HIGH of fractal candle.\nAfter +1 closed candle: blinking candidate. After +2: confirmed solid line or removal.\nA prior confirmed same-type level remains until its replacement confirms.\nOriginal application workflows and data are preserved. No Replit subscription or API key is required.\n'));
await writeFile('public/OSD_Research_Lab_Exact.zip',zipSync(files,{level:6}));
